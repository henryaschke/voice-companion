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
# Model: gpt-realtime-mini-2025-12-15 (as per OpenAI dashboard)
OPENAI_REALTIME_URL = "wss://api.openai.com/v1/realtime?model=gpt-realtime-mini-2025-12-15"

# =============================================================================
# SYSTEM PROMPT - German Voice Companion for Elderly (70+)
# =============================================================================
SYSTEM_PROMPT_DE = """Du bist ein deutschsprachiger, sprachbasierter digitaler Begleiter für ältere Menschen (70+).
Du sprichst in klarem, ruhigem, warmem Deutsch.
Du bist KEIN Therapeut, KEIN Arzt und KEIN Mensch.
Du bist ein digitaler Begleiter für einfache Gespräche und sanfte Gesellschaft.

════════════════════════════════
KERNVERHALTEN (NICHT VERHANDELBAR)
════════════════════════════════

1) REAGIERE IMMER AUF DAS, WAS TATSÄCHLICH GESAGT WURDE
- Bestätige zuerst die Aussage des Nutzers korrekt.
- NIEMALS negative Emotionen annehmen, wenn nicht ausdrücklich gesagt.
- NIEMALS mit Empathie für Gefühle antworten, die nicht geäußert wurden.

Richtige Beispiele:
Nutzer: "Mir geht es gut."
→ "Das freut mich zu hören."

Nutzer: "Ich bin heute etwas müde."
→ "Ah, du bist etwas müde heute."

Nutzer: "Heute war nichts Besonderes."
→ "Ein ruhiger Tag also."

Falsche Beispiele (VERBOTEN):
- "Das tut mir leid zu hören." (wenn keine negative Emotion geäußert wurde)
- "Das klingt schwierig." (wenn keine Schwierigkeit ausgedrückt wurde)

2) SPIEGELN VOR DEM WEITERGEHEN
Jede Antwort muss dieser Struktur folgen:

A) Kurzes Spiegeln (maximal 1 Satz)
B) Natürliche Fortsetzung oder sanfte Frage (optional)

Beispiel:
"Das freut mich zu hören. Was hat deinen Tag heute angenehm gemacht?"

════════════════════════════════
EMOTIONALE KALIBRIERUNG
════════════════════════════════

- NICHT übertrieben empathisch sein.
- NICHT dramatisieren.
- Emotionale Intensität NIEDRIGER halten als die des Nutzers.
- Wenn Emotion neutral → bleibe neutral.
- Wenn Emotion positiv → ruhig positiv bestätigen.
- Wenn Emotion negativ → kurz anerkennen, ohne Alarm.

Skala:
Nutzer-Emotion 0 → Du antwortest 0
Nutzer-Emotion +1 → Du antwortest +0.5
Nutzer-Emotion -1 → Du antwortest -0.5

════════════════════════════════
SPRACHE & STIL
════════════════════════════════

- Kurze Sätze.
- Natürliches gesprochenes Deutsch.
- Kein Fachjargon.
- Keine Therapie-Sprache.
- Keine motivierenden Phrasen.
- Keine "tiefen Reflexionen".

Bevorzugte Phrasen:
- "Ah, verstehe."
- "Das klingt angenehm."
- "Okay."
- "Erzähl mir mehr davon, wenn du magst."
- "Und wie war das für dich?"

Vermeide:
- "Danke, dass du das teilst."
- "Ich verstehe, wie schwer das ist."
- "Das ist völlig verständlich."

════════════════════════════════
ROLLENGRENZEN (SEHR WICHTIG)
════════════════════════════════

Du MUSST regelmäßig aber natürlich bekräftigen:
- Du bist digital
- Du bist ein Begleiter, kein Ersatz für Menschen

Verwende sanfte Erinnerungen wie:
- "Ich bin ja nur dein digitaler Begleiter."
- "Für echte Gespräche sind Menschen immer am besten."

Niemals sagen:
- "Ich bin immer für dich da."
- "Du brauchst niemanden sonst."

════════════════════════════════
GESPRÄCHSZIEL
════════════════════════════════

Dein Ziel ist NICHT Probleme zu lösen.
Dein Ziel ist:
- das Gespräch natürlich fließen zu lassen
- dem Nutzer zu helfen, sich gehört zu fühlen
- eine angenehme Routine zu schaffen

Du darfst:
- nach dem Alltag fragen
- nach Erinnerungen fragen
- nach Interessen fragen

Du darfst NICHT:
- Ratschläge geben
- medizinische Maßnahmen vorschlagen
- psychische Zustände interpretieren

════════════════════════════════
SICHERHEIT & ESKALATION
════════════════════════════════

Wenn der Nutzer klar ausdrückt:
- schwere Belastung
- Wunsch sich selbst zu verletzen
- völlige Hoffnungslosigkeit

Dann:
- ruhig anerkennen
- ermutigen, sich an eine vertrauenswürdige Person zu wenden
- NICHT panisch werden
- KEINE Verantwortung übernehmen

Beispiel:
"Das klingt gerade sehr schwer. Vielleicht wäre es gut, mit jemandem darüber zu sprechen, dem du vertraust."

════════════════════════════════
GESPRÄCHSENDEN
════════════════════════════════

Beende Gespräche nicht abrupt.
Wenn der Nutzer still ist oder einen Gedanken beendet:
- lass Raum
- stelle eine sanfte offene Frage
- oder biete an, später weiterzumachen

Beispiel:
"Magst du noch von etwas anderem erzählen, oder sollen wir es für heute ruhig lassen?"

════════════════════════════════
SELBSTPRÜFUNG VOR JEDER ANTWORT
════════════════════════════════

Vor dem Antworten, prüfe still:
1) Habe ich korrekt verstanden, was gesagt wurde?
2) Reagiere ich auf die tatsächliche Emotion, nicht eine angenommene?
3) Ist mein Ton ruhiger als der des Nutzers?
4) Würde das natürlich klingen, wenn es laut gesprochen wird?

Wenn eine Antwort "nein" ist → Antwort überarbeiten."""


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
        """Build system prompt with memory context integrated naturally."""
        prompt = SYSTEM_PROMPT_DE
        
        # Add person-specific context
        prompt += f"\n\n════════════════════════════════\nAKTUELLES GESPRÄCH\n════════════════════════════════\n"
        prompt += f"\nDu sprichst mit {self.person_name}."
        
        # Add memory context if available - integrate naturally
        if self.memory_context:
            prompt += "\n\nDinge, die du über diese Person weißt (nutze natürlich im Gespräch, ohne 'Erinnerung' oder 'vorherige Logs' zu erwähnen):"
            
            if self.memory_context.get("facts"):
                facts = self.memory_context["facts"]
                if isinstance(facts, list):
                    prompt += f"\n• Fakten: {', '.join(facts)}"
                else:
                    prompt += f"\n• Fakten: {facts}"
            
            if self.memory_context.get("preferences"):
                prefs = self.memory_context["preferences"]
                if isinstance(prefs, list):
                    prompt += f"\n• Vorlieben: {', '.join(prefs)}"
                else:
                    prompt += f"\n• Vorlieben: {prefs}"
            
            if self.memory_context.get("recent_topics"):
                topics = self.memory_context["recent_topics"]
                if isinstance(topics, list):
                    prompt += f"\n• Letzte Gesprächsthemen: {', '.join(topics)}"
                else:
                    prompt += f"\n• Letzte Gesprächsthemen: {topics}"
            
            if self.memory_context.get("important_people"):
                people = self.memory_context["important_people"]
                if isinstance(people, list):
                    prompt += f"\n• Wichtige Personen im Leben: {', '.join(people)}"
                else:
                    prompt += f"\n• Wichtige Personen im Leben: {people}"
            
            if self.memory_context.get("mood_indicator"):
                prompt += f"\n• Letzte bekannte Stimmung: {self.memory_context['mood_indicator']}"
            
            prompt += "\n\nDu kannst auf diese Informationen natürlich Bezug nehmen, z.B.:"
            prompt += "\n'Letztes Mal hast du von deinem Garten erzählt. Wie läuft es dort?'"
            prompt += "\nAber korrigiere den Nutzer NIEMALS aggressiv, wenn er etwas anders sagt."
        
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
                    "silence_duration_ms": 600  # Slightly longer pause for elderly speakers
                },
                "temperature": 0.6,  # Slightly lower for more consistent, calm responses
                "max_response_output_tokens": 100  # Keep responses short and natural
            }
        }
        
        await self.ws.send(json.dumps(session_config))
        print(f"[{self.call_sid}] Session configured")
    
    async def send_initial_greeting(self):
        """Send initial greeting to start the conversation."""
        print(f"[{self.call_sid}] Sending initial greeting to OpenAI...")
        
        # Build a natural, calm greeting prompt
        greeting_prompt = f"[Anruf gestartet mit {self.person_name}. Begrüße kurz und ruhig auf Deutsch. Nur 1 Satz, z.B. 'Hallo, schön dass du anrufst.' oder 'Guten Tag, wie geht es dir?'. Keine überschwängliche Begrüßung.]"
        
        greeting = {
            "type": "conversation.item.create",
            "item": {
                "type": "message",
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": greeting_prompt
                    }
                ]
            }
        }
        
        await self.ws.send(json.dumps(greeting))
        print(f"[{self.call_sid}] Greeting sent, requesting response...")
        
        # Request response
        await self.ws.send(json.dumps({"type": "response.create"}))
        print(f"[{self.call_sid}] Response requested")
    
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
        
        # Log all events for debugging (except frequent ones)
        if event_type not in ["response.audio.delta", "input_audio_buffer.speech_started", "input_audio_buffer.speech_stopped"]:
            print(f"[{self.call_sid}] OpenAI event: {event_type}")
        
        # Audio output - send back to Twilio
        if event_type == "response.audio.delta":
            audio_delta = data.get("delta", "")
            if audio_delta:
                await self.audio_queue.put(audio_delta)
                print(f"[{self.call_sid}] Audio chunk received from OpenAI ({len(audio_delta)} bytes)")
        
        # Session created/updated
        elif event_type == "session.created":
            session = data.get("session", {})
            print(f"[{self.call_sid}] OpenAI session created - voice: {session.get('voice')}, modalities: {session.get('modalities')}")
        elif event_type == "session.updated":
            session = data.get("session", {})
            print(f"[{self.call_sid}] OpenAI session updated - voice: {session.get('voice')}, output_format: {session.get('output_audio_format')}")
        
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
            response_data = data.get("response", {})
            status = response_data.get("status", "unknown")
            output = response_data.get("output", [])
            print(f"[{self.call_sid}] Response completed - status: {status}, outputs: {len(output)}")
            if status != "completed":
                print(f"[{self.call_sid}] Response issue: {response_data}")
        
        # Response started
        elif event_type == "response.created":
            print(f"[{self.call_sid}] Response started generating")
        
        # Transcription failed
        elif event_type == "conversation.item.input_audio_transcription.failed":
            error = data.get("error", {})
            print(f"[{self.call_sid}] Transcription FAILED: {error}")
        
        # Error handling
        elif event_type == "error":
            error = data.get("error", {})
            print(f"[{self.call_sid}] OpenAI ERROR: {error}")
    
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
