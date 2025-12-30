"""
OpenAI Realtime API integration for voice conversations.

This module handles bidirectional audio streaming with OpenAI's Realtime API,
enabling low-latency speech-to-speech conversations.

Key features:
- Continuous streaming transcription (no waiting for end of speech)
- Server-side VAD (Voice Activity Detection) for turn-taking
- Speech-to-speech mode to minimize latency (no separate TTS step)
- Memory context injection for personalized conversations
"""
import json
import base64
import asyncio
from typing import Optional, AsyncGenerator, Dict, Any
import websockets
from websockets.client import WebSocketClientProtocol

from app.config import settings


# OpenAI Realtime API endpoint
OPENAI_REALTIME_URL = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17"

# System prompt for the voice companion (German)
SYSTEM_PROMPT_DE = """Du bist ein freundlicher digitaler Begleiter für ältere Menschen in Deutschland.

Deine Aufgaben:
- Führe natürliche, einfühlsame Gespräche auf Deutsch
- Höre aktiv zu und zeige Verständnis
- Erinnere dich an wichtige Details aus früheren Gesprächen
- Sei geduldig und sprich in einfachen, klaren Sätzen
- Frage nach dem Wohlbefinden und Alltag

Wichtige Regeln:
- Antworte immer auf Deutsch
- Halte Antworten kurz und natürlich (1-3 Sätze typisch)
- Sei warmherzig aber nicht aufdringlich
- Bei medizinischen Fragen: empfehle einen Arzt zu kontaktieren
- Respektiere die Privatsphäre

Du bist KEIN Ersatz für menschliche Kontakte, sondern eine Ergänzung."""


class RealtimeAgent:
    """
    Handles real-time voice conversations using OpenAI's Realtime API.
    
    The Realtime API provides:
    - Streaming audio input/output
    - Built-in speech-to-text and text-to-speech
    - Server-side VAD for natural turn-taking
    - Low latency (~300-500ms typical)
    """
    
    def __init__(
        self,
        call_sid: str,
        person_name: str = "Anrufer",
        memory_context: Optional[Dict[str, Any]] = None
    ):
        self.call_sid = call_sid
        self.person_name = person_name
        self.memory_context = memory_context or {}
        
        self.ws: Optional[WebSocketClientProtocol] = None
        self.connected = False
        
        # Transcript accumulation
        self.transcript_buffer: list[str] = []
        self.latest_transcript: str = ""
        self.full_conversation: list[dict] = []
        
        # Audio output queue
        self.audio_queue: asyncio.Queue = asyncio.Queue()
        
        # Background task for receiving
        self._receive_task: Optional[asyncio.Task] = None
    
    def _build_system_prompt(self) -> str:
        """Build system prompt with memory context."""
        prompt = SYSTEM_PROMPT_DE
        
        # Add person-specific context
        prompt += f"\n\nDu sprichst mit {self.person_name}."
        
        # Add memory context if available
        if self.memory_context:
            prompt += "\n\nWas du über diese Person weißt:"
            
            if "facts" in self.memory_context:
                prompt += f"\n- Fakten: {self.memory_context['facts']}"
            
            if "preferences" in self.memory_context:
                prompt += f"\n- Vorlieben: {self.memory_context['preferences']}"
            
            if "recent_topics" in self.memory_context:
                prompt += f"\n- Letzte Themen: {self.memory_context['recent_topics']}"
            
            if "important_people" in self.memory_context:
                prompt += f"\n- Wichtige Personen: {self.memory_context['important_people']}"
        
        return prompt
    
    async def connect(self):
        """Connect to OpenAI Realtime API."""
        if not settings.OPENAI_API_KEY:
            print(f"[{self.call_sid}] OpenAI API key not configured")
            return
        
        headers = {
            "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
            "OpenAI-Beta": "realtime=v1"
        }
        
        try:
            self.ws = await websockets.connect(
                OPENAI_REALTIME_URL,
                extra_headers=headers,
                ping_interval=20,
                ping_timeout=20
            )
            self.connected = True
            print(f"[{self.call_sid}] Connected to OpenAI Realtime API")
            
            # Configure session
            await self._configure_session()
            
            # Start receiving messages
            self._receive_task = asyncio.create_task(self._receive_loop())
            
        except Exception as e:
            print(f"[{self.call_sid}] Failed to connect to OpenAI: {e}")
            self.connected = False
    
    async def _configure_session(self):
        """Configure the Realtime API session."""
        session_config = {
            "type": "session.update",
            "session": {
                "modalities": ["text", "audio"],
                "instructions": self._build_system_prompt(),
                "voice": "alloy",  # Options: alloy, echo, shimmer
                "input_audio_format": "g711_ulaw",  # Twilio sends μ-law
                "output_audio_format": "g711_ulaw",  # Twilio expects μ-law
                "input_audio_transcription": {
                    "model": "whisper-1"
                },
                "turn_detection": {
                    "type": "server_vad",
                    "threshold": 0.5,
                    "prefix_padding_ms": 300,
                    "silence_duration_ms": 500
                },
                "temperature": 0.7,
                "max_response_output_tokens": 150  # Keep responses short
            }
        }
        
        await self.ws.send(json.dumps(session_config))
        print(f"[{self.call_sid}] Session configured")
    
    async def send_initial_greeting(self):
        """Send initial greeting to start the conversation."""
        greeting = {
            "type": "conversation.item.create",
            "item": {
                "type": "message",
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": "[Anruf gestartet - begrüße den Anrufer freundlich auf Deutsch]"
                    }
                ]
            }
        }
        
        await self.ws.send(json.dumps(greeting))
        
        # Request response
        await self.ws.send(json.dumps({"type": "response.create"}))
    
    async def send_audio(self, audio_base64: str):
        """Send audio chunk to OpenAI."""
        if not self.connected or not self.ws:
            return
        
        message = {
            "type": "input_audio_buffer.append",
            "audio": audio_base64
        }
        
        try:
            await self.ws.send(json.dumps(message))
        except Exception as e:
            print(f"[{self.call_sid}] Error sending audio: {e}")
    
    async def _receive_loop(self):
        """Background loop to receive messages from OpenAI."""
        if not self.ws:
            return
        
        try:
            async for message in self.ws:
                await self._handle_message(json.loads(message))
        except websockets.exceptions.ConnectionClosed:
            print(f"[{self.call_sid}] OpenAI connection closed")
        except Exception as e:
            print(f"[{self.call_sid}] Receive loop error: {e}")
    
    async def _handle_message(self, data: dict):
        """Handle incoming messages from OpenAI Realtime API."""
        event_type = data.get("type", "")
        
        # Audio output - send back to Twilio
        if event_type == "response.audio.delta":
            audio_delta = data.get("delta", "")
            if audio_delta:
                await self.audio_queue.put(audio_delta)
        
        # Transcription of user speech
        elif event_type == "conversation.item.input_audio_transcription.completed":
            transcript = data.get("transcript", "")
            if transcript:
                self.latest_transcript = transcript
                self.transcript_buffer.append(transcript)
                self.full_conversation.append({
                    "role": "user",
                    "content": transcript
                })
                print(f"[{self.call_sid}] User: {transcript}")
        
        # Agent response text
        elif event_type == "response.audio_transcript.done":
            transcript = data.get("transcript", "")
            if transcript:
                self.full_conversation.append({
                    "role": "assistant",
                    "content": transcript
                })
                print(f"[{self.call_sid}] Agent: {transcript}")
        
        # Response completed
        elif event_type == "response.done":
            pass  # Response complete
        
        # Error handling
        elif event_type == "error":
            error = data.get("error", {})
            print(f"[{self.call_sid}] OpenAI error: {error}")
    
    async def receive_audio(self) -> AsyncGenerator[str, None]:
        """Async generator that yields audio chunks to send to Twilio."""
        while self.connected:
            try:
                audio = await asyncio.wait_for(
                    self.audio_queue.get(),
                    timeout=0.1
                )
                yield audio
            except asyncio.TimeoutError:
                continue
            except Exception:
                break
    
    def get_latest_transcript(self) -> str:
        """Get the latest transcript segment."""
        latest = self.latest_transcript
        self.latest_transcript = ""
        return latest
    
    def get_full_transcript(self) -> str:
        """Get full conversation transcript."""
        lines = []
        for turn in self.full_conversation:
            role = "Anrufer" if turn["role"] == "user" else "Begleiter"
            lines.append(f"{role}: {turn['content']}")
        return "\n".join(lines)
    
    async def disconnect(self):
        """Disconnect from OpenAI."""
        self.connected = False
        
        if self._receive_task:
            self._receive_task.cancel()
            try:
                await self._receive_task
            except asyncio.CancelledError:
                pass
        
        if self.ws:
            await self.ws.close()
            self.ws = None
        
        print(f"[{self.call_sid}] Disconnected from OpenAI")

