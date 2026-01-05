"""
ElevenLabs Streaming TTS Client.

Provides high-quality text-to-speech with:
- Streaming audio output for low latency
- Natural German voices with proper intonation
- Audio-Tags for emotional control ([excited], etc.)
- Direct μ-law output for Twilio

Best Practices Applied:
- Use audio tags for questions to get rising intonation
- eleven_flash_v2_5 model for best German prosody
- Optimized voice settings for natural speech
"""
import asyncio
import aiohttp
import re
from typing import Optional, Callable, Awaitable, AsyncGenerator
from dataclasses import dataclass

from app.config import settings
from app.services.audio_utils import resample_16k_to_8k


@dataclass
class TTSChunk:
    """A chunk of TTS audio."""
    audio_pcm: bytes  # PCM 16-bit at 8kHz (ready for Twilio conversion)
    is_final: bool


class ElevenLabsTTS:
    """
    Streaming TTS client using ElevenLabs.
    
    Features:
    - Streaming audio generation
    - Audio-Tags for question intonation
    - German voice support with proper prosody
    - Cancellation support
    """
    
    ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1"
    
    def __init__(self, call_sid: str = "unknown"):
        """
        Initialize ElevenLabs TTS client.
        
        Args:
            call_sid: Call identifier for logging
        """
        self.call_sid = call_sid
        self._cancelled = False
        self._session: Optional[aiohttp.ClientSession] = None
        
        # Metrics
        self.total_chars = 0
        self.total_chunks = 0
    
    def _preprocess_text_for_intonation(self, text: str) -> str:
        """
        Preprocess text to add ElevenLabs audio tags for proper German intonation.
        
        German questions should have RISING intonation at the end.
        ElevenLabs v3 supports audio tags like [excited] to control this.
        
        Args:
            text: Original text
            
        Returns:
            Text with audio tags for better prosody
        """
        # Split into sentences
        sentences = re.split(r'(?<=[.!?])\s+', text.strip())
        processed = []
        
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue
                
            # Check if it's a question (ends with ?)
            if sentence.endswith('?'):
                # Add soft excitement for rising intonation on questions
                # [excited] gives a slight upward lift at the end
                processed.append(f"[excited] {sentence}")
            else:
                processed.append(sentence)
        
        result = ' '.join(processed)
        return result
    
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
        
        # Preprocess text for proper German intonation (questions get rising pitch)
        processed_text = self._preprocess_text_for_intonation(text)
        self.total_chars += len(processed_text)
        
        voice_id = settings.ELEVENLABS_VOICE_ID
        model_id = settings.ELEVENLABS_MODEL
        
        url = f"{self.ELEVENLABS_API_URL}/text-to-speech/{voice_id}/stream"
        
        headers = {
            "xi-api-key": settings.ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
        }
        
        payload = {
            "text": processed_text,
            "model_id": model_id,
            "voice_settings": {
                # Optimized for natural German conversation:
                # - stability 0.45: balanced emotion/stability
                # - similarity_boost 0.70: clarity without distortion  
                # - style 0.15: slight expressiveness (not 0, helps with intonation)
                # - speaker_boost: clearer articulation
                # - speed 0.85: slightly slower for elderly audience
                "stability": 0.45,
                "similarity_boost": 0.70,
                "style": 0.15,
                "use_speaker_boost": True,
                "speed": 0.85
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
                if response.status != 200:
                    error_text = await response.text()
                    print(f"[{self.call_sid}] ElevenLabs error {response.status}: {error_text}")
                    return b""
                
                # Stream audio chunks - already in μ-law 8kHz format!
                async for chunk in response.content.iter_chunked(800):  # ~100ms of 8kHz μ-law
                    if self._cancelled:
                        print(f"[{self.call_sid}] TTS cancelled")
                        break
                    
                    if chunk:
                        all_audio += chunk
                        self.total_chunks += 1
                        
                        if on_audio:
                            await on_audio(chunk)
            
            print(f"[{self.call_sid}] TTS complete: '{text[:50]}...' -> {len(all_audio)} bytes")
            return all_audio
            
        except Exception as e:
            print(f"[{self.call_sid}] TTS error: {e}")
            return b""
    
    def _downsample_24k_to_8k(self, pcm_24k: bytes) -> bytes:
        """
        Downsample from 24kHz to 8kHz.
        
        Takes every 3rd sample (24000/8000 = 3).
        
        Args:
            pcm_24k: PCM 16-bit at 24000 Hz
            
        Returns:
            PCM 16-bit at 8000 Hz
        """
        import struct
        
        # Ensure we have complete samples (2 bytes each)
        if len(pcm_24k) % 2 != 0:
            pcm_24k = pcm_24k[:-1]
        
        num_samples = len(pcm_24k) // 2
        samples_24k = struct.unpack(f'<{num_samples}h', pcm_24k)
        
        # Take every 3rd sample
        samples_8k = samples_24k[::3]
        
        return struct.pack(f'<{len(samples_8k)}h', *samples_8k)
    
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
        """Cancel current synthesis."""
        self._cancelled = True
    
    async def close(self):
        """Close the HTTP session."""
        if self._session and not self._session.closed:
            await self._session.close()
            self._session = None

