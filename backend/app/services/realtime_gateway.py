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
from app.services.openai_llm import OpenAILLM, ConversationTurn, ToolCallRequest
from app.services.elevenlabs_tts import ElevenLabsTTS
from app.services.metrics import CallMetrics
from app.services.external_tools import get_fetching_phrase


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
        person_age: Optional[int] = None,
        personal_context: Optional[dict] = None,
        memory_context: Optional[dict] = None,
        on_audio_out: Optional[Callable[[str, int], Awaitable[None]]] = None,  # (audio, turn_id)
        on_clear_audio: Optional[Callable[[], Awaitable[None]]] = None
    ):
        """
        Initialize the gateway.
        
        Args:
            call_sid: Twilio call SID for logging
            person_name: Name of the person for personalization
            person_age: Age of the person (for communication style)
            personal_context: Static profile data (hobbies, sensitivities, important people)
            memory_context: Dynamic long-term memory from conversations
            on_audio_out: Callback to send audio to Twilio (base64 μ-law)
            on_clear_audio: Callback to clear Twilio's audio buffer (for barge-in)
        """
        self.call_sid = call_sid
        self.person_name = person_name
        self.person_age = person_age
        self.personal_context = personal_context or {}
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
        self._vad_threshold = 1200  # RMS energy threshold (increased from 500 to filter echo/noise at call start)
        self._consecutive_speech_frames = 0  # Require multiple frames to avoid false positives
        self._cancelled = False  # Flag for cancellation during tool calls
        
        # CRITICAL: Track when we actually started sending audio
        # Barge-in should only be allowed AFTER we've sent some audio
        # Otherwise user's own voice (echo/tail) triggers false positives
        self._audio_sent_count = 0  # Number of audio chunks sent in current turn
        self._min_audio_before_bargein = 20  # Require at least 20 chunks (~400ms) - prevents false barge-in during greeting
        
        # CRITICAL: Turn ID for race condition prevention
        # Each turn gets a unique ID. Audio chunks are tagged with this ID.
        # If the turn ID doesn't match, audio is dropped.
        self._current_turn_id = 0
        
        # CRITICAL: Track when audio is expected to finish playing on Twilio
        # State changes to LISTENING when TTS is done, but Twilio still plays audio!
        # We need to keep barge-in detection active until audio finishes playing.
        self._audio_playing_until = 0.0  # Unix timestamp when audio should be done
        
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
        
        # Initialize LLM with full context
        self.llm = OpenAILLM(call_sid=self.call_sid)
        self.llm.set_context(
            person_name=self.person_name,
            person_age=self.person_age,
            personal_context=self.personal_context,
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
                f"Hallo {first_name}! Hier ist Theresa. Schön, dass du anrufst. Wie geht's dir?",
                f"Hey {first_name}! Theresa hier. Na, wie läuft's bei dir?",
                f"Hallo {first_name}! Schön von dir zu hören. Was macht das Leben?",
                f"Hi {first_name}! Hier ist Theresa. Wie geht es dir heute?",
                f"Hallo {first_name}! Freut mich, von dir zu hören. Alles gut bei dir?",
                f"Na {first_name}! Theresa am Apparat. Wie geht's, wie steht's?",
            ]
        else:
            greetings = [
                "Hallo! Hier ist Theresa. Schön, dass du anrufst. Wie geht's dir?",
                "Hey! Theresa hier. Na, wie läuft's bei dir?",
                "Hallo! Schön von dir zu hören. Was macht das Leben?",
                "Hi! Hier ist Theresa. Wie geht es dir heute?",
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
        # CRITICAL: Only allow barge-in AFTER we've actually sent some audio!
        # Otherwise the user's own voice (echo/tail from their last utterance)
        # triggers false positive barge-ins.
        # 
        # ALSO: Check if audio is still playing on Twilio!
        # The state may have changed to LISTENING, but Twilio is still playing audio.
        # We need to detect barge-in until the audio finishes playing.
        audio_still_playing = time.time() < self._audio_playing_until
        can_bargein = (self.state == GatewayState.SPEAKING or audio_still_playing) and self._audio_sent_count >= self._min_audio_before_bargein
        
        if can_bargein:
            energy = self._calculate_audio_energy(pcm_bytes)
            if energy > self._vad_threshold:
                self._consecutive_speech_frames += 1
                # Require 3 consecutive frames of speech to avoid false positives
                if self._consecutive_speech_frames >= 3:
                    state_info = f"state={self.state.value}, audio_playing={audio_still_playing}"
                    print(f"[{self.call_sid}] BARGE-IN via local VAD (energy={energy:.0f}, {state_info}, chunks={self._audio_sent_count}) - stopping agent!")
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
    
    def _remove_overlap(self, existing: str, new_text: str) -> str:
        """
        Remove overlapping words between existing text and new text.
        
        Deepgram sometimes sends overlapping final transcripts, e.g.:
        - existing: "Das kenn ich doch schon alles das"
        - new_text: "das basilikum"
        - result: "basilikum" (removes duplicate "das")
        
        Returns the new_text with any overlapping prefix removed.
        """
        if not existing or not new_text:
            return new_text
        
        # Get last few words of existing text (check up to 3 words overlap)
        existing_words = existing.lower().split()
        new_words = new_text.split()
        new_words_lower = [w.lower() for w in new_words]
        
        if not existing_words or not new_words:
            return new_text
        
        # Check for overlap: does new_text start with words that end existing?
        # Check 1, 2, or 3 word overlaps
        for overlap_len in range(min(3, len(new_words)), 0, -1):
            if len(existing_words) >= overlap_len:
                # Get last N words of existing
                existing_tail = existing_words[-overlap_len:]
                # Get first N words of new
                new_head = new_words_lower[:overlap_len]
                
                if existing_tail == new_head:
                    # Found overlap! Remove the overlapping words from new_text
                    remaining = new_words[overlap_len:]
                    if remaining:
                        return " ".join(remaining)
                    else:
                        return ""  # Entire new_text was duplicate
        
        return new_text
    
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
        audio_still_playing = time.time() < self._audio_playing_until
        
        # Barge-in: user started speaking while agent is speaking OR audio still playing
        # CRITICAL: Only allow barge-in AFTER we've actually sent some audio!
        # Otherwise user's echo triggers false positives
        can_bargein = (current_state == GatewayState.SPEAKING or audio_still_playing) and self._audio_sent_count >= self._min_audio_before_bargein
        
        if can_bargein:
            state_info = f"state={current_state.value}, audio_playing={audio_still_playing}"
            print(f"[{self.call_sid}] BARGE-IN via SpeechStarted ({state_info}, chunks={self._audio_sent_count}) - stopping agent NOW!")
            self.metrics.record_barge_in()
            await self._handle_barge_in()
    
    async def _on_transcript(self, event: TranscriptEvent):
        """
        Handle transcript events from STT.
        
        Args:
            event: Transcript event with text and metadata
        """
        current_state = self.state
        audio_still_playing = time.time() < self._audio_playing_until
        
        # Note: Barge-in is now handled by _on_speech_started (faster)
        # But keep this as backup for transcript-based detection
        # CRITICAL: Only allow barge-in AFTER we've actually sent some audio!
        can_bargein = (current_state == GatewayState.SPEAKING or audio_still_playing) and self._audio_sent_count >= self._min_audio_before_bargein
        
        if can_bargein and event.text:
            print(f"[{self.call_sid}] BARGE-IN (transcript backup, after {self._audio_sent_count} chunks): '{event.text[:50]}...'")
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
                    # Check for overlapping words at the boundary
                    # Deepgram sometimes sends overlapping transcripts
                    new_text = self._remove_overlap(self._current_utterance, event.text)
                    if new_text:
                        self._current_utterance += " " + new_text
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
        
        # CRITICAL: Increment turn ID FIRST - this invalidates any old audio
        self._current_turn_id += 1
        my_turn_id = self._current_turn_id
        
        print(f"[{self.call_sid}] TURN {my_turn_id} STARTED")
        
        # Reset flags for new turn
        self._cancelled = False
        self._audio_sent_count = 0  # Reset audio counter for barge-in timing
        self._consecutive_speech_frames = 0  # Reset VAD frames
        self._audio_playing_until = 0.0  # Reset audio end time
        
        user_text = self._current_utterance
        self._current_utterance = ""
        
        # Add to conversation history
        self.full_conversation.append({"role": "user", "content": user_text})
        self.llm.add_turn("user", user_text)
        
        # Enter thinking state
        await self._set_state(GatewayState.THINKING)
        self.metrics.llm_start()
        
        # Generate response (may be text or tool call request)
        response_text = ""
        first_sentence = True
        
        async def on_sentence(sentence: str):
            nonlocal response_text, first_sentence
            
            # CRITICAL: Check BOTH cancelled flag AND turn ID
            # Turn ID prevents race condition where new turn resets _cancelled
            if self._cancelled or self._current_turn_id != my_turn_id:
                print(f"[{self.call_sid}] TURN {my_turn_id} STALE - skipping sentence (current={self._current_turn_id}, cancelled={self._cancelled})")
                return
            
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
                
                # CRITICAL: Check BOTH cancelled flag AND turn ID
                if self._cancelled or self._current_turn_id != my_turn_id:
                    return
                
                if first_audio:
                    self.metrics.tts_first_audio()
                    first_audio = False
                
                if self.on_audio_out:
                    # Pass turn ID so Twilio callback can also verify
                    await self.on_audio_out(b64_ulaw, my_turn_id)
            
            # Synthesize and stream this sentence
            await self.tts.synthesize_to_ulaw(sentence, on_tts_audio)
        
        try:
            # First LLM call - may return text or tool call request
            result = await self.llm.generate_streaming(user_text, on_sentence)
            
            # Check if this turn was cancelled during generation
            if self._cancelled or self._current_turn_id != my_turn_id:
                print(f"[{self.call_sid}] TURN {my_turn_id} CANCELLED - not completing")
                await self._set_state(GatewayState.LISTENING)
                return
            
            # Check if this is a tool call request
            if isinstance(result, ToolCallRequest):
                await self._handle_tool_call(user_text, result, on_sentence)
                
                # Check again after tool call
                if self._cancelled or self._current_turn_id != my_turn_id:
                    print(f"[{self.call_sid}] TURN {my_turn_id} CANCELLED after tool - not completing")
                    await self._set_state(GatewayState.LISTENING)
                    return
            else:
                self.metrics.llm_complete()
                self.metrics.tts_complete()
                
        except Exception as e:
            print(f"[{self.call_sid}] Response generation error: {e}")
            await self._set_state(GatewayState.LISTENING)
            return
        
        # CRITICAL: Only add to conversation and emit metrics if turn was NOT cancelled
        if not self._cancelled and self._current_turn_id == my_turn_id:
            if response_text.strip():
                self.full_conversation.append({"role": "assistant", "content": response_text.strip()})
            
            # End turn and emit metrics
            self.metrics.end_turn()
            print(f"[{self.call_sid}] TURN {my_turn_id} COMPLETED")
        else:
            print(f"[{self.call_sid}] TURN {my_turn_id} NOT completed (cancelled={self._cancelled}, current={self._current_turn_id})")
        
        await self._set_state(GatewayState.LISTENING)
        
        # Start new turn timing
        self.metrics.start_turn()
    
    async def _handle_tool_call(
        self,
        user_text: str,
        tool_call: ToolCallRequest,
        on_sentence
    ):
        """
        Handle a tool call request from the LLM.
        
        Flow:
        1. Say "Lass mich das kurz herausfinden..."
        2. Execute the tool
        3. Call LLM again with tool result
        4. Stream the final response
        
        Args:
            user_text: Original user text
            tool_call: The tool call request
            on_sentence: Callback for streaming sentences to TTS
        """
        # Capture turn ID for this tool call
        my_turn_id = self._current_turn_id
        
        print(f"[{self.call_sid}] Handling tool call: {tool_call.tool_name} (turn {my_turn_id})")
        
        # 1. Say a "fetching" phrase so user knows we're working on it
        fetching_phrase = get_fetching_phrase()
        await self._set_state(GatewayState.SPEAKING)
        self.metrics.tts_start()
        
        first_audio = True
        
        async def on_fetching_audio(b64_ulaw: str):
            nonlocal first_audio
            
            # Stop if barge-in happened or turn changed
            if self._cancelled or self._current_turn_id != my_turn_id:
                return
            
            if first_audio:
                self.metrics.tts_first_audio()
                first_audio = False
            
            if self.on_audio_out:
                # Pass turn ID so Twilio callback can also verify
                await self.on_audio_out(b64_ulaw, my_turn_id)
        
        await self.tts.synthesize_to_ulaw(fetching_phrase, on_fetching_audio)
        
        # Add fetching phrase to conversation
        self.full_conversation.append({"role": "assistant", "content": fetching_phrase})
        
        print(f"[{self.call_sid}] Spoke fetching phrase: '{fetching_phrase}'")
        
        # 2. Execute the tool (while still in SPEAKING state to prevent barge-in during fetch)
        tool_result = await self.llm.tools.execute_tool(
            tool_call.tool_name,
            tool_call.arguments
        )
        
        print(f"[{self.call_sid}] Tool result received ({len(tool_result)} chars)")
        
        # Check if cancelled during tool execution or turn changed
        if self._cancelled or self._current_turn_id != my_turn_id:
            print(f"[{self.call_sid}] Tool call aborted - turn changed or cancelled")
            return
        
        # 3. Call LLM again with tool result
        await self.llm.generate_with_tool_result(
            user_text,
            tool_call,
            tool_result,
            on_sentence
        )
        
        self.metrics.llm_complete()
        self.metrics.tts_complete()
    
    async def _speak(self, text: str):
        """
        Speak text through TTS.
        
        Args:
            text: Text to speak
        """
        if not self.tts:
            return
        
        # Capture turn ID for this speech
        my_turn_id = self._current_turn_id
        
        self.metrics.tts_start()
        first_audio = True
        
        async def on_audio(b64_ulaw: str):
            nonlocal first_audio
            
            # Stop if barge-in happened or turn changed
            if self._cancelled or self._current_turn_id != my_turn_id:
                return
            
            if first_audio:
                self.metrics.tts_first_audio()
                first_audio = False
            
            if self.on_audio_out:
                # Pass turn ID so Twilio callback can also verify
                await self.on_audio_out(b64_ulaw, my_turn_id)
        
        await self.tts.synthesize_to_ulaw(text, on_audio)
        self.metrics.tts_complete()
        
        # Add to conversation
        self.full_conversation.append({"role": "assistant", "content": text})
    
    async def _handle_barge_in(self):
        """Handle user interruption (barge-in)."""
        # CRITICAL: Do NOT increment turn ID here!
        # Turn ID is ONLY incremented in _process_turn when a new turn starts.
        # This ensures Turn IDs are strictly monotonic without gaps.
        
        print(f"[{self.call_sid}] BARGE-IN: Turn {self._current_turn_id} cancelled")
        
        # Set cancelled flag to stop any ongoing callbacks
        self._cancelled = True
        
        # Reset audio playing time since we're clearing the buffer
        self._audio_playing_until = 0.0
        
        # CRITICAL: Clear Twilio's audio buffer FIRST
        # This stops the already-buffered audio from playing
        if self.on_clear_audio:
            try:
                await self.on_clear_audio()
                print(f"[{self.call_sid}] Twilio audio buffer cleared for turn {self._current_turn_id}")
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
        
        # Close external tools (aiohttp session)
        if self.llm and self.llm.tools:
            await self.llm.tools.close()
        
        # Log metrics
        summary = self.metrics.get_summary()
        print(f"[{self.call_sid}] Call summary: {summary}")
        
        print(f"[{self.call_sid}] Gateway stopped")

