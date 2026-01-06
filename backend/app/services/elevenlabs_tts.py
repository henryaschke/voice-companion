"""
ElevenLabs Streaming TTS Client - Optimized for Voice "Lea"

Voice: Lea (pMrwpTuGOma7Nubxs5jo)
- Native German female, neutral Hochdeutsch
- Calm, warm, clear, understated tone
- Optimized for phone audio (8kHz) and elderly listeners

Best Practices Applied:
- eleven_multilingual_v2 model for best German prosody
- Moderate stability (0.40) for natural expression without instability
- Restrained style (0.20) to avoid theatrical delivery
- Text preprocessing for natural sentence rhythm and breathing pauses
"""
import asyncio
import aiohttp
import re
from typing import Optional, Callable, Awaitable

from app.config import settings


class ElevenLabsTTS:
    """
    Streaming TTS client using ElevenLabs, optimized for voice "Lea".
    
    Features:
    - Streaming audio generation with low latency
    - Text preprocessing for natural German rhythm
    - Optimized for phone audio clarity (8kHz)
    - Cancellation support for barge-in
    """
    
    ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1"
    
    # Lea-specific tuning: max words per sentence before considering a split
    MAX_WORDS_PER_CHUNK = 20
    
    def __init__(self, call_sid: str = "unknown"):
        """
        Initialize ElevenLabs TTS client.
        
        Args:
            call_sid: Call identifier for logging
        """
        self.call_sid = call_sid
        self._cancelled = False
        self._session: Optional[aiohttp.ClientSession] = None
        self._current_response: Optional[aiohttp.ClientResponse] = None  # Track current response for cancellation
        
        # Metrics
        self.total_chars = 0
        self.total_chunks = 0
    
    def _preprocess_text_for_lea(self, text: str) -> str:
        """
        Preprocess text for natural German speech with voice Lea.
        
        Lea-specific optimizations:
        - Short sentences (max ~20 words) prevent melodic over-smoothing
        - Strategic comma placement for natural breathing pauses
        - Split long compound sentences on conjunctions
        - Preserve question marks for proper rising intonation
        
        Args:
            text: Original text from LLM
            
        Returns:
            Preprocessed text optimized for Lea's natural delivery
        """
        if not text:
            return ""
        
        text = text.strip()
        
        # Remove any stage directions or emojis that might have slipped through
        text = re.sub(r'\[.*?\]', '', text)  # Remove [brackets]
        text = re.sub(r'[^\w\s.,!?äöüÄÖÜß\-]', '', text)  # Keep only text chars
        
        # Split very long sentences on German conjunctions for breathing pauses
        # Only split if sentence is getting too long (>20 words)
        words = text.split()
        if len(words) > self.MAX_WORDS_PER_CHUNK:
            text = self._split_long_sentences(text)
        
        # Ensure proper spacing after punctuation
        text = re.sub(r'([.,!?])([A-ZÄÖÜa-zäöü])', r'\1 \2', text)
        
        # Clean up multiple spaces
        text = re.sub(r'\s+', ' ', text).strip()
        
        return text
    
    def _split_long_sentences(self, text: str) -> str:
        """
        Split long German sentences on natural break points.
        
        Breaks on conjunctions like 'und', 'aber', 'oder', 'denn', 'weil'
        when the sentence is getting too long, inserting commas for pauses.
        
        Args:
            text: Long text that may need splitting
            
        Returns:
            Text with natural break points added
        """
        # German conjunctions that are natural break points
        conjunctions = r'\b(und|aber|oder|denn|weil|dass|wenn|obwohl|während)\b'
        
        result = []
        sentences = re.split(r'(?<=[.!?])\s+', text)
        
        for sentence in sentences:
            words = sentence.split()
            if len(words) > self.MAX_WORDS_PER_CHUNK:
                # Find conjunction near the middle and add comma before it
                # This creates a natural breathing pause
                parts = re.split(f'({conjunctions})', sentence, flags=re.IGNORECASE)
                if len(parts) > 1:
                    rebuilt = []
                    word_count = 0
                    for i, part in enumerate(parts):
                        part_words = len(part.split())
                        word_count += part_words
                        
                        # Add comma pause before conjunction if we're past halfway
                        if (word_count > self.MAX_WORDS_PER_CHUNK // 2 and 
                            part.lower().strip() in ['und', 'aber', 'oder', 'denn', 'weil', 'dass', 'wenn', 'obwohl', 'während']):
                            rebuilt.append(',')
                        rebuilt.append(part)
                    sentence = ''.join(rebuilt)
            
            result.append(sentence)
        
        return ' '.join(result)
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create aiohttp session."""
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession()
        return self._session
    
    async def synthesize_streaming(
        self,
        text: str,
        on_audio: Optional[Callable[[bytes], Awaitable[None]]] = None
    ) -> bytes:
        """
        Synthesize text to speech with streaming.
        
        Args:
            text: Text to synthesize
            on_audio: Callback for each audio chunk (PCM 8kHz bytes)
            
        Returns:
            Complete audio as PCM 8kHz bytes
        """
        if not settings.ELEVENLABS_API_KEY:
            print(f"[{self.call_sid}] ElevenLabs API key not configured")
            return b""
        
        if not text.strip():
            return b""
        
        self._cancelled = False
        
        # Preprocess text for Lea's optimal delivery
        processed_text = self._preprocess_text_for_lea(text)
        self.total_chars += len(processed_text)
        
        voice_id = settings.ELEVENLABS_VOICE_ID
        model_id = settings.ELEVENLABS_MODEL
        
        url = f"{self.ELEVENLABS_API_URL}/text-to-speech/{voice_id}/stream"
        
        headers = {
            "xi-api-key": settings.ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
        }
        
        # ═══════════════════════════════════════════════════════════════
        # LEA VOICE SETTINGS - Tuned for natural German phone conversation
        # ═══════════════════════════════════════════════════════════════
        # Voice: Lea (pMrwpTuGOma7Nubxs5jo) - native German, Hochdeutsch
        # Target: calm, warm, clear, natural - NOT theatrical or robotic
        #
        # stability: 0.40 (moderate - natural expression without instability)
        #   - Lower than 0.35: can cause inconsistent delivery
        #   - Higher than 0.50: causes robotic flatness
        #
        # similarity_boost: 0.75 (clarity without distortion)
        #   - Ensures clear articulation on 8kHz phone audio
        #
        # style: 0.20 (restrained - avoids theatrical "assistant voice")
        #   - Higher than 0.30: causes unnatural, exaggerated delivery
        #   - Zero: can sound too flat
        #
        # use_speaker_boost: true (clearer articulation for elderly listeners)
        # ═══════════════════════════════════════════════════════════════
        
        payload = {
            "text": processed_text,
            "model_id": model_id,
            "voice_settings": {
                "stability": 0.40,
                "similarity_boost": 0.75,
                "style": 0.20,
                "use_speaker_boost": True
            }
        }
        
        # Use ulaw_8000 directly - exactly what Twilio needs, no conversion required!
        params = {
            "output_format": "ulaw_8000",
            "optimize_streaming_latency": "4"  # Maximum optimization
        }
        
        all_audio = b""
        
        try:
            session = await self._get_session()
            
            async with session.post(url, headers=headers, json=payload, params=params) as response:
                # Track response for cancellation
                self._current_response = response
                
                if response.status != 200:
                    error_text = await response.text()
                    print(f"[{self.call_sid}] ElevenLabs error {response.status}: {error_text}")
                    self._current_response = None
                    return b""
                
                # Stream audio chunks - already in μ-law 8kHz format!
                async for chunk in response.content.iter_chunked(800):  # ~100ms of 8kHz μ-law
                    if self._cancelled:
                        print(f"[{self.call_sid}] TTS cancelled mid-stream")
                        break
                    
                    if chunk:
                        all_audio += chunk
                        self.total_chunks += 1
                        
                        if on_audio and not self._cancelled:
                            await on_audio(chunk)
                
                self._current_response = None
            
            if not self._cancelled:
                print(f"[{self.call_sid}] TTS complete: '{text[:50]}...' -> {len(all_audio)} bytes")
            return all_audio
            
        except asyncio.CancelledError:
            print(f"[{self.call_sid}] TTS task cancelled")
            self._current_response = None
            return b""
        except Exception as e:
            print(f"[{self.call_sid}] TTS error: {e}")
            self._current_response = None
            return b""
    
    async def synthesize_to_ulaw(
        self,
        text: str,
        on_audio: Optional[Callable[[str], Awaitable[None]]] = None
    ) -> str:
        """
        Synthesize text to base64 μ-law for Twilio.
        
        ElevenLabs now outputs μ-law 8kHz directly, so we just base64 encode.
        
        Args:
            text: Text to synthesize
            on_audio: Callback for each audio chunk (base64 μ-law)
            
        Returns:
            Complete audio as base64 μ-law
        """
        import base64
        
        all_ulaw_b64 = ""
        
        async def on_ulaw_chunk(ulaw_chunk: bytes):
            nonlocal all_ulaw_b64
            # Already μ-law, just base64 encode for Twilio
            ulaw_b64 = base64.b64encode(ulaw_chunk).decode('ascii')
            all_ulaw_b64 += ulaw_b64
            if on_audio:
                await on_audio(ulaw_b64)
        
        await self.synthesize_streaming(text, on_ulaw_chunk)
        return all_ulaw_b64
    
    def cancel(self):
        """Cancel current synthesis immediately."""
        self._cancelled = True
        # Close the current response to stop receiving data
        if self._current_response:
            self._current_response.close()
            print(f"[{self.call_sid}] TTS response closed for cancellation")
    
    async def close(self):
        """Close the HTTP session."""
        if self._session and not self._session.closed:
            await self._session.close()
            self._session = None

