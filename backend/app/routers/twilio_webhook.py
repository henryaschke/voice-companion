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
    
    Access Control:
    - Only phone numbers registered in the database are allowed
    - Unknown callers get a polite rejection message in German
    
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
    
    # ACCESS CONTROL: Reject calls from unknown numbers
    if not person:
        print(f"[{call_sid}] REJECTED: Unknown caller {from_number}")
        
        response = VoiceResponse()
        response.say(
            "Entschuldigung, diese Nummer ist nicht für den Dienst registriert. "
            "Bitte wenden Sie sich an Ihren Ansprechpartner. Auf Wiederhören.",
            voice="Polly.Marlene",  # German voice
            language="de-DE"
        )
        response.hangup()
        
        return Response(
            content=str(response),
            media_type="application/xml"
        )
    
    print(f"[{call_sid}] Caller identified: {person.display_name} (ID: {person.id})")
    
    # Create call record
    call = await crud.create_call(db, CallCreate(
        account_id=person.account_id,
        person_id=person.id,
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
    actual_call_sid = call_sid  # Will be updated from Twilio "start" event
    person_id: Optional[int] = None
    
    try:
        # Callback to send audio to Twilio
        async def send_audio_to_twilio(b64_ulaw: str, audio_turn_id: int):
            """
            Send audio chunk to Twilio.
            
            CRITICAL: This is the LAST LINE OF DEFENSE for barge-in.
            Double-checks both:
            1. _cancelled flag
            2. Turn ID matches current turn
            
            Args:
                b64_ulaw: Base64 encoded μ-law audio
                audio_turn_id: The turn ID this audio belongs to
            """
            if not gateway:
                return
            
            # CRITICAL: Block audio if:
            # 1. Barge-in is active (_cancelled = True)
            # 2. This audio is from an OLD turn (turn ID mismatch)
            if gateway._cancelled:
                return  # Silently drop - barge-in active
            
            if audio_turn_id != gateway._current_turn_id:
                # This audio is from a stale turn - discard silently
                return
            
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
                    # Track that we've sent audio - needed for barge-in timing
                    gateway._audio_sent_count += 1
                    
                    # CRITICAL: Calculate when this audio will finish playing on Twilio
                    # μ-law audio: 8kHz sample rate, 1 byte per sample
                    # base64 decodes to 3/4 of the original length
                    import time
                    audio_bytes = len(b64_ulaw) * 3 // 4
                    audio_duration_sec = audio_bytes / 8000  # 8kHz sample rate
                    expected_end = time.time() + audio_duration_sec + 0.5  # Add 500ms buffer for network latency
                    
                    # Update if this audio will play longer than current estimate
                    if expected_end > gateway._audio_playing_until:
                        gateway._audio_playing_until = expected_end
                except Exception as e:
                    print(f"[{actual_call_sid}] Error sending audio: {e}")
        
        # Callback to clear Twilio's audio buffer (for barge-in)
        async def clear_twilio_audio():
            """
            Send 'clear' event to Twilio to stop playing buffered audio.
            CRITICAL for barge-in: Without this, already-sent audio keeps playing!
            """
            if stream_sid:
                clear_message = {
                    "event": "clear",
                    "streamSid": stream_sid
                }
                try:
                    await websocket.send_text(json.dumps(clear_message))
                    print(f"[{actual_call_sid}] Sent 'clear' event to Twilio")
                except Exception as e:
                    print(f"[{actual_call_sid}] Error clearing audio: {e}")
        
        # Handle incoming Twilio messages
        while True:
            try:
                message = await websocket.receive_text()
                data = json.loads(message)
                event_type = data.get("event")
                
                if event_type == "connected":
                    print(f"[{actual_call_sid}] Media stream connected")
                
                elif event_type == "start":
                    stream_sid = data.get("streamSid")
                    start_info = data.get("start", {})
                    
                    # CRITICAL: Extract actual call_sid from Twilio
                    actual_call_sid = start_info.get("callSid", call_sid)
                    
                    print(f"[{actual_call_sid}] Stream started: {stream_sid}")
                    print(f"[{actual_call_sid}] Media format: {start_info.get('mediaFormat', {})}")
                    
                    # NOW load call and person info with the correct call_sid
                    person_name = "Anrufer"
                    memory_context = {}
                    
                    async with async_session_maker() as db:
                        call = await crud.get_call_by_sid(db, actual_call_sid)
                        
                        if call and call.person_id:
                            person_id = call.person_id
                            person = await crud.get_person(db, person_id)
                            if person:
                                person_name = person.display_name
                            
                            memory = await crud.get_memory_state(db, person_id)
                            if memory and memory.memory_json:
                                memory_context = memory.memory_json
                                print(f"[{actual_call_sid}] Loaded memory for {person_name}: {list(memory_context.keys())}")
                    
                    # Initialize gateway with correct call_sid and memory
                    gateway = RealtimeGateway(
                        call_sid=actual_call_sid,
                        person_name=person_name,
                        memory_context=memory_context,
                        on_audio_out=send_audio_to_twilio,
                        on_clear_audio=clear_twilio_audio
                    )
                    
                    # Start gateway (connects to Deepgram, initializes LLM and TTS)
                    await gateway.start()
                    
                    # Send initial greeting
                    await gateway.send_initial_greeting()
                
                elif event_type == "media":
                    # Forward audio to gateway
                    if gateway:
                        payload = data.get("media", {}).get("payload", "")
                        if payload:
                            await gateway.receive_audio(payload)
                
                elif event_type == "stop":
                    print(f"[{actual_call_sid}] Stream stop received")
                    break
                    
            except WebSocketDisconnect:
                print(f"[{actual_call_sid}] WebSocket disconnected")
                break
            except Exception as e:
                print(f"[{actual_call_sid}] Error processing message: {e}")
                break
        
    except Exception as e:
        print(f"[{actual_call_sid}] Stream error: {e}")
    
    finally:
        # Cleanup
        full_transcript = ""
        
        if gateway:
            full_transcript = gateway.get_full_transcript()
            await gateway.stop()
        
        # Process call completion in background with correct call_sid
        if full_transcript and actual_call_sid != "unknown":
            print(f"[{actual_call_sid}] Starting post-call processing with {len(full_transcript)} chars")
            asyncio.create_task(
                process_call_completion(actual_call_sid, full_transcript)
            )
        
        print(f"[{actual_call_sid}] WebSocket handler complete")


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
