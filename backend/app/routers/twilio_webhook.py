"""Twilio Voice webhook and Media Streams handler."""
import json
import base64
import asyncio
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Request, WebSocket, WebSocketDisconnect, Depends, BackgroundTasks
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from twilio.twiml.voice_response import VoiceResponse, Connect

from app.database import get_db, async_session_maker
from app.config import settings
from app import crud
from app.schemas import CallCreate, CallUpdate
from app.services.realtime_agent import RealtimeAgent
from app.services.post_call_processor import process_call_completion

router = APIRouter(prefix="/twilio", tags=["twilio"])


@router.post("/voice")
async def voice_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Twilio Voice webhook - handles incoming calls.
    Returns TwiML to start bidirectional Media Stream.
    
    Twilio EU Region (IE1) Configuration:
    - Set in Twilio Console under Phone Numbers > Manage > Active Numbers
    - Select the number and set "Region" to "Ireland (IE1)"
    - This ensures media streams are routed through EU infrastructure
    """
    form_data = await request.form()
    
    call_sid = form_data.get("CallSid", "")
    from_number = form_data.get("From", "")
    to_number = form_data.get("To", "")
    
    # Look up caller by phone number
    person = await crud.get_person_by_phone(db, from_number)
    
    # Determine account (default to private if unknown caller)
    account_id = person.account_id if person else 1
    
    # Create call record immediately
    call = await crud.create_call(db, CallCreate(
        account_id=account_id,
        person_id=person.id if person else None,
        twilio_call_sid=call_sid,
        direction="inbound",
        from_e164=from_number,
        to_e164=to_number
    ))
    
    # Update call status
    await crud.update_call(db, call.id, CallUpdate(
        status="in_progress",
        started_at=datetime.utcnow()
    ))
    
    # Build TwiML response with bidirectional Media Stream
    response = VoiceResponse()
    
    # Connect to our WebSocket for bidirectional streaming
    connect = Connect()
    
    # Build WebSocket URL
    ws_url = settings.BASE_URL.replace("http://", "wss://").replace("https://", "wss://")
    stream_url = f"{ws_url}/twilio/stream?call_sid={call_sid}"
    
    print(f"[{call_sid}] TwiML WebSocket URL: {stream_url}")
    
    # Start bidirectional stream
    # Note: Twilio Media Streams support bidirectional audio in/out
    connect.stream(
        url=stream_url,
        name="voice-companion-stream"
    )
    
    response.append(connect)
    
    return Response(
        content=str(response),
        media_type="application/xml"
    )


@router.websocket("/stream")
async def media_stream_handler(websocket: WebSocket, call_sid: str = "unknown"):
    """
    WebSocket handler for Twilio Media Streams.
    
    Bidirectional streaming:
    - Receives audio from Twilio (caller's voice)
    - Sends audio back to Twilio (agent's voice)
    
    Integration with OpenAI Realtime API:
    - Forwards audio to OpenAI for transcription and response generation
    - Streams back audio responses with minimal latency
    """
    print(f"[WS] Connection attempt from Twilio, call_sid={call_sid}")
    print(f"[WS] Headers: {websocket.headers}")
    
    try:
        await websocket.accept()
        print(f"[WS] Connection accepted for call_sid={call_sid}")
    except Exception as e:
        print(f"[WS] Failed to accept connection: {e}")
        raise
    
    agent: Optional[RealtimeAgent] = None
    stream_sid: Optional[str] = None
    transcript_parts = []
    
    try:
        # Get call and person info
        async with async_session_maker() as db:
            call = await crud.get_call_by_sid(db, call_sid)
            person = None
            memory_context = {}
            
            if call and call.person_id:
                person = await crud.get_person(db, call.person_id)
                memory = await crud.get_memory_state(db, call.person_id)
                if memory:
                    memory_context = memory.memory_json
            
            # Check consent for recording
            consent_recording = person.consent_recording if person else False
            person_name = person.display_name if person else "Anrufer"
        
        # Initialize realtime agent
        agent = RealtimeAgent(
            call_sid=call_sid,
            person_name=person_name,
            memory_context=memory_context
        )
        
        # Connect to OpenAI Realtime API
        await agent.connect()
        
        # Start task to forward OpenAI audio back to Twilio
        async def forward_agent_audio():
            try:
                async for audio_chunk in agent.receive_audio():
                    if stream_sid:
                        # Send audio back to Twilio
                        media_message = {
                            "event": "media",
                            "streamSid": stream_sid,
                            "media": {
                                "payload": audio_chunk  # Base64 encoded audio
                            }
                        }
                        await websocket.send_text(json.dumps(media_message))
            except Exception as e:
                print(f"Error forwarding agent audio: {e}")
        
        # Start forwarding task
        forward_task = asyncio.create_task(forward_agent_audio())
        
        # Handle incoming Twilio messages
        while True:
            try:
                message = await websocket.receive_text()
                data = json.loads(message)
                event_type = data.get("event")
                
                if event_type == "connected":
                    print(f"[{call_sid}] Media stream connected")
                
                elif event_type == "start":
                    stream_sid = data.get("streamSid")
                    print(f"[{call_sid}] Stream started: {stream_sid}")
                    
                    # Send initial greeting via agent
                    await agent.send_initial_greeting()
                
                elif event_type == "media":
                    # Forward audio to OpenAI
                    payload = data.get("media", {}).get("payload", "")
                    if payload and agent:
                        await agent.send_audio(payload)
                        
                        # Collect transcription
                        transcript = agent.get_latest_transcript()
                        if transcript:
                            transcript_parts.append(transcript)
                
                elif event_type == "stop":
                    print(f"[{call_sid}] Stream stopped")
                    break
                    
            except WebSocketDisconnect:
                break
            except Exception as e:
                print(f"[{call_sid}] Error processing message: {e}")
                break
        
        # Cancel forwarding task
        forward_task.cancel()
        
    except Exception as e:
        print(f"[{call_sid}] Stream error: {e}")
    
    finally:
        # Cleanup
        if agent:
            full_transcript = agent.get_full_transcript()
            await agent.disconnect()
        else:
            full_transcript = " ".join(transcript_parts)
        
        # Process call completion in background
        asyncio.create_task(
            process_call_completion(call_sid, full_transcript)
        )


@router.post("/status")
async def status_callback(request: Request):
    """
    Twilio status callback for call events.
    Updates call status in database.
    """
    form_data = await request.form()
    
    call_sid = form_data.get("CallSid", "")
    call_status = form_data.get("CallStatus", "")
    duration = form_data.get("CallDuration")
    
    async with async_session_maker() as db:
        call = await crud.get_call_by_sid(db, call_sid)
        if call:
            updates = CallUpdate(status=call_status)
            
            if call_status == "completed":
                updates.ended_at = datetime.utcnow()
                if duration:
                    updates.duration_sec = int(duration)
            
            await crud.update_call(db, call.id, updates)
    
    return {"status": "ok"}


@router.post("/outbound/call")
async def initiate_outbound_call(
    person_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Initiate an outbound call to a person.
    Useful for testing without scheduling.
    """
    from twilio.rest import Client
    
    person = await crud.get_person(db, person_id)
    if not person:
        return {"error": "Person nicht gefunden"}
    
    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
        return {"error": "Twilio nicht konfiguriert"}
    
    client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
    
    # Build webhook URL
    webhook_url = f"{settings.BASE_URL}/twilio/voice"
    status_url = f"{settings.BASE_URL}/twilio/status"
    
    try:
        call = client.calls.create(
            to=person.phone_e164,
            from_=settings.TWILIO_NUMBER_E164,
            url=webhook_url,
            status_callback=status_url,
            status_callback_event=["initiated", "ringing", "answered", "completed"]
        )
        
        # Create call record
        db_call = await crud.create_call(db, CallCreate(
            account_id=person.account_id,
            person_id=person.id,
            twilio_call_sid=call.sid,
            direction="outbound",
            from_e164=settings.TWILIO_NUMBER_E164,
            to_e164=person.phone_e164
        ))
        
        return {
            "message": "Anruf gestartet",
            "call_id": db_call.id,
            "twilio_sid": call.sid
        }
        
    except Exception as e:
        return {"error": str(e)}

