"""
Deepgram Streaming STT Client.

Provides real-time speech-to-text with:
- Streaming audio input
- Interim (partial) transcripts
- Final transcripts with punctuation
- Utterance end detection (built-in VAD)
- German language support

Audio Format:
- Input: PCM 16-bit signed little-endian
- Sample rate: 8000 Hz (Twilio native, no resampling needed)
- Channels: Mono
"""
import asyncio
import json
import time
from typing import Optional, Callable, Awaitable
from dataclasses import dataclass
import websockets
from websockets.client import WebSocketClientProtocol

from app.config import settings


@dataclass
class TranscriptEvent:
    """Represents a transcript event from Deepgram."""
    text: str
    is_final: bool
    confidence: float
    start_time: float
    end_time: float
    speech_final: bool  # True when utterance is complete (end of turn)


class DeepgramSTT:
    """
    Streaming Speech-to-Text client using Deepgram.
    
    Features:
    - Real-time streaming with WebSocket
    - Interim results for responsiveness
    - Utterance end detection for turn-taking
    - Automatic reconnection
    """
    
    DEEPGRAM_WS_URL = "wss://api.deepgram.com/v1/listen"
    
    def __init__(
        self,
        on_transcript: Optional[Callable[[TranscriptEvent], Awaitable[None]]] = None,
        call_sid: str = "unknown"
    ):
        """
        Initialize Deepgram STT client.
        
        Args:
            on_transcript: Async callback for transcript events
            call_sid: Call identifier for logging
        """
        self.on_transcript = on_transcript
        self.call_sid = call_sid
        
        self.ws: Optional[WebSocketClientProtocol] = None
        self.connected = False
        self._receive_task: Optional[asyncio.Task] = None
        self._keep_alive_task: Optional[asyncio.Task] = None
        
        # Metrics
        self.partial_count = 0
        self.final_count = 0
        self.last_audio_time = 0.0
    
    async def connect(self) -> bool:
        """
        Connect to Deepgram WebSocket.
        
        Returns:
            True if connected successfully
        """
        if not settings.DEEPGRAM_API_KEY:
            print(f"[{self.call_sid}] Deepgram API key not configured")
            return False
        
        # Build URL with query parameters (Deepgram Nova-2 API)
        params = {
            "model": "nova-2",
            "language": "de",
            "encoding": "linear16",
            "sample_rate": "8000",
            "channels": "1",
            "punctuate": "true",
            "interim_results": "true",
            "endpointing": str(settings.END_OF_TURN_SILENCE_MS),  # End-of-speech detection
            "smart_format": "true",
        }
        
        query_string = "&".join(f"{k}={v}" for k, v in params.items())
        url = f"{self.DEEPGRAM_WS_URL}?{query_string}"
        
        print(f"[{self.call_sid}] Connecting to Deepgram: {url}")
        
        headers = {
            "Authorization": f"Token {settings.DEEPGRAM_API_KEY}"
        }
        
        try:
            self.ws = await websockets.connect(
                url,
                extra_headers=headers,
                ping_interval=20,
                ping_timeout=10
            )
            self.connected = True
            print(f"[{self.call_sid}] Connected to Deepgram STT")
            
            # Start receive loop
            self._receive_task = asyncio.create_task(self._receive_loop())
            
            # Start keep-alive
            self._keep_alive_task = asyncio.create_task(self._keep_alive_loop())
            
            return True
            
        except Exception as e:
            print(f"[{self.call_sid}] Failed to connect to Deepgram: {e}")
            return False
    
    async def send_audio(self, pcm_bytes: bytes):
        """
        Send PCM audio to Deepgram.
        
        Args:
            pcm_bytes: PCM 16-bit audio at 8000 Hz
        """
        if not self.connected or not self.ws:
            return
        
        try:
            await self.ws.send(pcm_bytes)
            self.last_audio_time = time.time()
        except Exception as e:
            print(f"[{self.call_sid}] Error sending audio to Deepgram: {e}")
    
    async def _receive_loop(self):
        """Background loop to receive transcripts from Deepgram."""
        if not self.ws:
            return
        
        try:
            async for message in self.ws:
                try:
                    data = json.loads(message)
                    await self._handle_message(data)
                except json.JSONDecodeError:
                    continue
                    
        except websockets.exceptions.ConnectionClosed:
            print(f"[{self.call_sid}] Deepgram connection closed")
        except Exception as e:
            print(f"[{self.call_sid}] Deepgram receive error: {e}")
        finally:
            self.connected = False
    
    async def _handle_message(self, data: dict):
        """Handle incoming message from Deepgram."""
        msg_type = data.get("type", "")
        
        if msg_type == "Results":
            # Transcript result
            channel = data.get("channel", {})
            alternatives = channel.get("alternatives", [])
            
            if alternatives:
                alt = alternatives[0]
                text = alt.get("transcript", "").strip()
                confidence = alt.get("confidence", 0.0)
                
                if text:
                    is_final = data.get("is_final", False)
                    speech_final = data.get("speech_final", False)
                    
                    # Get timing info
                    start_time = data.get("start", 0.0)
                    duration = data.get("duration", 0.0)
                    
                    event = TranscriptEvent(
                        text=text,
                        is_final=is_final,
                        confidence=confidence,
                        start_time=start_time,
                        end_time=start_time + duration,
                        speech_final=speech_final
                    )
                    
                    if is_final:
                        self.final_count += 1
                        print(f"[{self.call_sid}] STT Final: {text}")
                    else:
                        self.partial_count += 1
                    
                    if self.on_transcript:
                        await self.on_transcript(event)
        
        elif msg_type == "UtteranceEnd":
            # End of utterance detected
            print(f"[{self.call_sid}] Deepgram: Utterance end detected")
            
            # Send a synthetic event to signal turn complete
            if self.on_transcript:
                event = TranscriptEvent(
                    text="",
                    is_final=True,
                    confidence=1.0,
                    start_time=0,
                    end_time=0,
                    speech_final=True
                )
                await self.on_transcript(event)
        
        elif msg_type == "SpeechStarted":
            print(f"[{self.call_sid}] Deepgram: Speech started")
        
        elif msg_type == "Metadata":
            # Connection metadata
            print(f"[{self.call_sid}] Deepgram metadata: {data.get('model_info', {}).get('name', 'unknown')}")
        
        elif msg_type == "Error":
            print(f"[{self.call_sid}] Deepgram error: {data}")
    
    async def _keep_alive_loop(self):
        """Send keep-alive messages to prevent timeout."""
        try:
            while self.connected:
                await asyncio.sleep(10)
                
                if self.ws and self.connected:
                    # Send keep-alive (empty JSON)
                    try:
                        await self.ws.send(json.dumps({"type": "KeepAlive"}))
                    except Exception:
                        pass
                        
        except asyncio.CancelledError:
            pass
    
    async def finish_stream(self):
        """Signal end of audio stream."""
        if self.ws and self.connected:
            try:
                # Send close stream message
                await self.ws.send(json.dumps({"type": "CloseStream"}))
                # Give time for final results
                await asyncio.sleep(0.5)
            except Exception:
                pass
    
    async def disconnect(self):
        """Disconnect from Deepgram."""
        self.connected = False
        
        if self._keep_alive_task:
            self._keep_alive_task.cancel()
            try:
                await self._keep_alive_task
            except asyncio.CancelledError:
                pass
        
        if self._receive_task:
            self._receive_task.cancel()
            try:
                await self._receive_task
            except asyncio.CancelledError:
                pass
        
        if self.ws:
            try:
                await self.ws.close()
            except Exception:
                pass
            self.ws = None
        
        print(f"[{self.call_sid}] Deepgram disconnected (partials: {self.partial_count}, finals: {self.final_count})")

