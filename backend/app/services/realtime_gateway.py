"""
Realtime Voice Gateway - Main Orchestrator.

State Machine:
  LISTENING → THINKING → SPEAKING → LISTENING
      ↑                      │
      └──── BARGE-IN ────────┘

Responsibilities:
- Receive audio from Twilio (μ-law)
- Convert and stream to Deepgram STT
- Detect end-of-turn
- Generate response with GPT-4o
- Stream TTS back to Twilio
- Handle barge-in (user interrupts agent)
"""
import asyncio
import time
from enum import Enum
from typing import Optional, Callable, Awaitable

from app.config import settings
from app.services.audio_utils import base64_ulaw_to_pcm
from app.services.deepgram_stt import DeepgramSTT, TranscriptEvent
from app.services.openai_llm import OpenAILLM, ConversationTurn
from app.services.elevenlabs_tts import ElevenLabsTTS
from app.services.metrics import CallMetrics


class GatewayState(Enum):
    """Voice gateway states."""
    IDLE = "idle"
    LISTENING = "listening"
    THINKING = "thinking"
    SPEAKING = "speaking"


class RealtimeGateway:
    """
    Main orchestrator for real-time voice conversations.
    
    Coordinates:
    - Deepgram STT (streaming)
    - OpenAI LLM (streaming)
    - ElevenLabs TTS (streaming)
    - State machine for turn-taking
    - Barge-in handling
    """
    
    def __init__(
        self,
        call_sid: str,
        person_name: str = "Anrufer",
        memory_context: Optional[dict] = None,
        on_audio_out: Optional[Callable[[str], Awaitable[None]]] = None,
        on_clear_audio: Optional[Callable[[], Awaitable[None]]] = None
    ):
        """
        Initialize the gateway.
        
        Args:
            call_sid: Twilio call SID for logging
            person_name: Name of the person for personalization
            memory_context: Long-term memory from database
            on_audio_out: Callback to send audio to Twilio (base64 μ-law)
            on_clear_audio: Callback to clear Twilio's audio buffer (for barge-in)
        """
        self.call_sid = call_sid
        self.person_name = person_name
        self.memory_context = memory_context or {}
        self.on_audio_out = on_audio_out
        self.on_clear_audio = on_clear_audio  # Callback to clear Twilio's audio buffer
        
        # State
        self.state = GatewayState.IDLE
        self._state_lock = asyncio.Lock()
        
        # Components
        self.stt: Optional[DeepgramSTT] = None
        self.llm: Optional[OpenAILLM] = None
        self.tts: Optional[ElevenLabsTTS] = None
        
        # Metrics
        self.metrics = CallMetrics()
        
        # Turn management
        self._current_utterance = ""
        self._utterance_start_time = 0.0
        self._last_speech_time = 0.0
        self._pending_response_task: Optional[asyncio.Task] = None
        
        # Barge-in detection via local VAD (Voice Activity Detection)
        self._barge_in_text = ""  # Text captured during barge-in
        self._vad_threshold = 500  # RMS energy threshold for speech detection
        self._consecutive_speech_frames = 0  # Require multiple frames to avoid false positives
        
        # Full conversation for post-processing
        self.full_conversation: list[dict] = []
    
    async def start(self):
        """Initialize and start all components."""
        self.metrics.start_call(self.call_sid)
        print(f"[{self.call_sid}] Gateway starting...")
        
        # Initialize STT with barge-in detection via SpeechStarted
        self.stt = DeepgramSTT(
            on_transcript=self._on_transcript,
            on_speech_started=self._on_speech_started,
            call_sid=self.call_sid
        )
        await self.stt.connect()
        
        # Initialize LLM
        self.llm = OpenAILLM(call_sid=self.call_sid)
        self.llm.set_context(
            person_name=self.person_name,
            memory_state=self.memory_context
        )
        
        # Initialize TTS
        self.tts = ElevenLabsTTS(call_sid=self.call_sid)
        
        # Enter listening state
        await self._set_state(GatewayState.LISTENING)
        
        print(f"[{self.call_sid}] Gateway started, entering LISTENING state")
    
    async def send_initial_greeting(self):
        """Send personalized, variable greeting when call starts."""
        import random
        
        # Extract first name only (split by space, take first part)
        first_name = None
        if self.person_name and self.person_name != "Anrufer":
            first_name = self.person_name.split()[0]
        
        # Variable greetings - randomly selected for natural feel
        if first_name:
            greetings = [
                f"Hallo {first_name}! Hier ist Viola. Schön, dass du anrufst. Wie geht's dir?",
                f"Hey {first_name}! Viola hier. Na, wie läuft's bei dir?",
                f"Hallo {first_name}! Schön von dir zu hören. Was macht das Leben?",
                f"Hi {first_name}! Hier ist Viola. Wie geht es dir heute?",
                f"Hallo {first_name}! Freut mich, von dir zu hören. Alles gut bei dir?",
                f"Na {first_name}! Viola am Apparat. Wie geht's, wie steht's?",
            ]
        else:
            greetings = [
                "Hallo! Hier ist Viola. Schön, dass du anrufst. Wie geht's dir?",
                "Hey! Viola hier. Na, wie läuft's bei dir?",
                "Hallo! Schön von dir zu hören. Was macht das Leben?",
                "Hi! Hier ist Viola. Wie geht es dir heute?",
            ]
        
        greeting = random.choice(greetings)
        
        print(f"[{self.call_sid}] Sending greeting: {greeting}")
        
        await self._set_state(GatewayState.SPEAKING)
        await self._speak(greeting)
        
        # Add greeting to LLM context so it knows what was said
        if self.llm:
            self.llm.add_turn("assistant", greeting)
        
        await self._set_state(GatewayState.LISTENING)
        self.metrics.start_turn()
    
    async def receive_audio(self, b64_ulaw: str):
        """
        Receive audio from Twilio.
        
        Args:
            b64_ulaw: Base64 encoded μ-law audio
        """
        # Convert to PCM for Deepgram
        pcm_bytes = base64_ulaw_to_pcm(b64_ulaw)
        
        # LOCAL VAD: Check audio energy for barge-in detection
        # This is INSTANT - no waiting for Deepgram!
        if self.state == GatewayState.SPEAKING:
            energy = self._calculate_audio_energy(pcm_bytes)
            if energy > self._vad_threshold:
                self._consecutive_speech_frames += 1
                # Require 3 consecutive frames of speech to avoid false positives
                if self._consecutive_speech_frames >= 3:
                    print(f"[{self.call_sid}] BARGE-IN via local VAD (energy={energy:.0f}) - stopping agent!")
                    self.metrics.record_barge_in()
                    await self._handle_barge_in()
                    self._consecutive_speech_frames = 0
            else:
                self._consecutive_speech_frames = 0
        
        # Always send to STT
        if self.stt:
            await self.stt.send_audio(pcm_bytes)
        
        # Track speech timing
        self._last_speech_time = time.time()
    
    def _calculate_audio_energy(self, pcm_bytes: bytes) -> float:
        """
        Calculate RMS energy of PCM audio for VAD.
        
        Args:
            pcm_bytes: PCM 16-bit signed little-endian audio
            
        Returns:
            RMS energy value (0-32767 range)
        """
        import struct
        
        if len(pcm_bytes) < 2:
            return 0.0
        
        # Unpack PCM samples (16-bit signed)
        num_samples = len(pcm_bytes) // 2
        try:
            samples = struct.unpack(f'<{num_samples}h', pcm_bytes[:num_samples*2])
        except struct.error:
            return 0.0
        
        # Calculate RMS energy
        if not samples:
            return 0.0
        
        sum_squares = sum(s * s for s in samples)
        rms = (sum_squares / len(samples)) ** 0.5
        
        return rms
    
    async def _on_speech_started(self):
        """
        Handle SpeechStarted event from Deepgram.
        This fires IMMEDIATELY when speech is detected, before any transcript.
        Used for fast barge-in detection.
        """
        current_state = self.state
        
        # Barge-in: user started speaking while agent is speaking
        if current_state == GatewayState.SPEAKING:
            print(f"[{self.call_sid}] BARGE-IN via SpeechStarted - stopping agent NOW!")
            self.metrics.record_barge_in()
            await self._handle_barge_in()
    
    async def _on_transcript(self, event: TranscriptEvent):
        """
        Handle transcript events from STT.
        
        Args:
            event: Transcript event with text and metadata
        """
        current_state = self.state
        
        # Note: Barge-in is now handled by _on_speech_started (faster)
        # But keep this as backup for transcript-based detection
        if current_state == GatewayState.SPEAKING and event.text:
            print(f"[{self.call_sid}] BARGE-IN (transcript backup): '{event.text[:50]}...'")
            self.metrics.record_barge_in()
            self._barge_in_text = event.text
            await self._handle_barge_in()
            return
        
        # Only process transcripts in LISTENING state
        if current_state != GatewayState.LISTENING:
            return
        
        if event.text:
            # Start utterance timing if new
            if not self._current_utterance:
                self._utterance_start_time = time.time()
                self.metrics.start_turn()
            
            # Accumulate transcript - APPEND final transcripts, don't replace!
            if event.is_final:
                if self._current_utterance:
                    # Append with space
                    self._current_utterance += " " + event.text
                else:
                    self._current_utterance = event.text
                print(f"[{self.call_sid}] STT accumulated: '{self._current_utterance}'")
            else:
                # For partials, we just track that speech is happening
                self.metrics.stt_partial_count += 1
        
        # Check for end of turn (speech_final from Deepgram or UtteranceEnd)
        if event.speech_final:
            print(f"[{self.call_sid}] speech_final received, utterance='{self._current_utterance[:50] if self._current_utterance else '(empty)'}...'")
            
            if self._current_utterance:
                # Check if utterance is just a filler word (user still thinking)
                # Common German fillers that shouldn't trigger a response alone
                # Note: "ja" removed - it's often a complete response
                FILLER_WORDS = {'und', 'aber', 'also', 'naja', 'hmm', 'ähm', 'öhm', 'na', 'so', 'äh'}
                
                utterance_clean = self._current_utterance.strip().lower().rstrip('.,!?')
                
                # If the entire utterance is just a filler word, wait for more
                if utterance_clean in FILLER_WORDS:
                    print(f"[{self.call_sid}] Filler word detected, waiting for more: '{self._current_utterance}'")
                    return
                
                print(f"[{self.call_sid}] End of turn detected: '{self._current_utterance}'")
                self.metrics.end_user_speech()
                self.metrics.stt_final()
                
                await self._process_turn()
    
    async def _process_turn(self):
        """Process complete user turn and generate response."""
        if not self._current_utterance:
            return
        
        user_text = self._current_utterance
        self._current_utterance = ""
        
        # Add to conversation history
        self.full_conversation.append({"role": "user", "content": user_text})
        self.llm.add_turn("user", user_text)
        
        # Enter thinking state
        await self._set_state(GatewayState.THINKING)
        self.metrics.llm_start()
        
        # Generate response
        response_text = ""
        first_sentence = True
        
        async def on_sentence(sentence: str):
            nonlocal response_text, first_sentence
            response_text += sentence + " "
            
            if first_sentence:
                self.metrics.llm_first_token()
                first_sentence = False
            
            # Stream sentence to TTS immediately
            await self._set_state(GatewayState.SPEAKING)
            self.metrics.tts_start()
            
            first_audio = True
            
            async def on_tts_audio(b64_ulaw: str):
                nonlocal first_audio
                if first_audio:
                    self.metrics.tts_first_audio()
                    first_audio = False
                
                if self.on_audio_out:
                    await self.on_audio_out(b64_ulaw)
            
            # Synthesize and stream this sentence
            await self.tts.synthesize_to_ulaw(sentence, on_tts_audio)
        
        try:
            await self.llm.generate_streaming(user_text, on_sentence)
            self.metrics.llm_complete()
            self.metrics.tts_complete()
        except Exception as e:
            print(f"[{self.call_sid}] Response generation error: {e}")
        
        # Add response to conversation
        if response_text.strip():
            self.full_conversation.append({"role": "assistant", "content": response_text.strip()})
        
        # End turn and return to listening
        self.metrics.end_turn()
        await self._set_state(GatewayState.LISTENING)
        
        # Start new turn timing
        self.metrics.start_turn()
    
    async def _speak(self, text: str):
        """
        Speak text through TTS.
        
        Args:
            text: Text to speak
        """
        if not self.tts:
            return
        
        self.metrics.tts_start()
        first_audio = True
        
        async def on_audio(b64_ulaw: str):
            nonlocal first_audio
            if first_audio:
                self.metrics.tts_first_audio()
                first_audio = False
            
            if self.on_audio_out:
                await self.on_audio_out(b64_ulaw)
        
        await self.tts.synthesize_to_ulaw(text, on_audio)
        self.metrics.tts_complete()
        
        # Add to conversation
        self.full_conversation.append({"role": "assistant", "content": text})
    
    async def _handle_barge_in(self):
        """Handle user interruption (barge-in)."""
        print(f"[{self.call_sid}] Handling barge-in - stopping agent...")
        
        # CRITICAL: Clear Twilio's audio buffer FIRST
        # This stops the already-buffered audio from playing
        if self.on_clear_audio:
            try:
                await self.on_clear_audio()
                print(f"[{self.call_sid}] Twilio audio buffer cleared")
            except Exception as e:
                print(f"[{self.call_sid}] Error clearing audio buffer: {e}")
        
        # Cancel LLM generation
        if self.llm:
            self.llm.cancel()
        
        # Cancel TTS
        if self.tts:
            self.tts.cancel()
        
        # Cancel any pending response task
        if self._pending_response_task:
            self._pending_response_task.cancel()
            try:
                await self._pending_response_task
            except asyncio.CancelledError:
                pass
            self._pending_response_task = None
        
        # Use the barge-in text as the start of the new utterance
        # This is what the user was saying when they interrupted
        if self._barge_in_text:
            self._current_utterance = self._barge_in_text
            print(f"[{self.call_sid}] Barge-in text captured: '{self._barge_in_text}'")
            self._barge_in_text = ""
        else:
            self._current_utterance = ""
        
        # Return to listening - let user finish their thought
        await self._set_state(GatewayState.LISTENING)
        self.metrics.start_turn()
    
    async def _set_state(self, new_state: GatewayState):
        """Thread-safe state transition."""
        async with self._state_lock:
            old_state = self.state
            self.state = new_state
            if old_state != new_state:
                print(f"[{self.call_sid}] State: {old_state.value} -> {new_state.value}")
    
    def get_full_transcript(self) -> str:
        """Get full conversation as text for post-processing."""
        lines = []
        for turn in self.full_conversation:
            role = "Anrufer" if turn["role"] == "user" else "Begleiter"
            lines.append(f"{role}: {turn['content']}")
        return "\n".join(lines)
    
    async def stop(self):
        """Stop and cleanup all components."""
        print(f"[{self.call_sid}] Gateway stopping...")
        
        self.metrics.end_call()
        
        # Disconnect STT
        if self.stt:
            await self.stt.finish_stream()
            await self.stt.disconnect()
        
        # Close TTS session
        if self.tts:
            await self.tts.close()
        
        # Log metrics
        summary = self.metrics.get_summary()
        print(f"[{self.call_sid}] Call summary: {summary}")
        
        print(f"[{self.call_sid}] Gateway stopped")

