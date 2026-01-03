"""
Twilio Voice webhook and Media Streams handler.

Endpoints:
- POST /twilio/voice - Returns TwiML to start bidirectional stream
- WS /twilio/stream - WebSocket for bidirectional audio
- POST /twilio/status - Call status callbacks
- POST /twilio/outbound/call - Initiate outbound call
"""
import json
import asyncio
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Request, WebSocket, WebSocketDisconnect, Depends
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from twilio.twiml.voice_response import VoiceResponse, Connect

from app.database import get_db, async_session_maker
from app.config import settings
from app import crud
from app.schemas import CallCreate, CallUpdate
from app.services.realtime_gateway import RealtimeGateway
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
    
    print(f"[{call_sid}] Incoming call from {from_number}")
    
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
    
    Architecture:
    - Receives μ-law audio from Twilio
    - Sends to Deepgram STT (streaming)
    - Processes with GPT-4o (streaming)
    - Synthesizes with ElevenLabs TTS (streaming)
    - Sends audio back to Twilio
    
    State Machine:
    - LISTENING: Receiving user speech, streaming to STT
    - THINKING: Processing with LLM
    - SPEAKING: Streaming TTS audio
    - Barge-in: User interrupts → cancel and return to LISTENING
    """
    print(f"[{call_sid}] WebSocket connection attempt")
    
    try:
        await websocket.accept()
        print(f"[{call_sid}] WebSocket accepted")
    except Exception as e:
        print(f"[{call_sid}] Failed to accept WebSocket: {e}")
        raise
    
    gateway: Optional[RealtimeGateway] = None
    stream_sid: Optional[str] = None
    
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
            
            person_name = person.display_name if person else "Anrufer"
        
        # Callback to send audio to Twilio
        async def send_audio_to_twilio(b64_ulaw: str):
            """Send audio chunk to Twilio."""
            if stream_sid and b64_ulaw:
                media_message = {
                    "event": "media",
                    "streamSid": stream_sid,
                    "media": {
                        "payload": b64_ulaw
                    }
                }
                try:
                    await websocket.send_text(json.dumps(media_message))
                except Exception as e:
                    print(f"[{call_sid}] Error sending audio: {e}")
        
        # Initialize gateway
        gateway = RealtimeGateway(
            call_sid=call_sid,
            person_name=person_name,
            memory_context=memory_context,
            on_audio_out=send_audio_to_twilio
        )
        
        # Start gateway (connects to Deepgram, initializes LLM and TTS)
        await gateway.start()
        
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
                    start_info = data.get("start", {})
                    print(f"[{call_sid}] Stream started: {stream_sid}")
                    print(f"[{call_sid}] Media format: {start_info.get('mediaFormat', {})}")
                    
                    # Send initial greeting
                    await gateway.send_initial_greeting()
                
                elif event_type == "media":
                    # Forward audio to gateway
                    payload = data.get("media", {}).get("payload", "")
                    if payload:
                        await gateway.receive_audio(payload)
                
                elif event_type == "stop":
                    print(f"[{call_sid}] Stream stop received")
                    break
                    
            except WebSocketDisconnect:
                print(f"[{call_sid}] WebSocket disconnected")
                break
            except Exception as e:
                print(f"[{call_sid}] Error processing message: {e}")
                break
        
    except Exception as e:
        print(f"[{call_sid}] Stream error: {e}")
    
    finally:
        # Cleanup
        full_transcript = ""
        
        if gateway:
            full_transcript = gateway.get_full_transcript()
            await gateway.stop()
        
        # Process call completion in background
        if full_transcript:
            asyncio.create_task(
                process_call_completion(call_sid, full_transcript)
            )
        
        print(f"[{call_sid}] WebSocket handler complete")


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
    
    print(f"[{call_sid}] Status callback: {call_status}")
    
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
