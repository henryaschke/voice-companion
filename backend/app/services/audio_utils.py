"""
Audio format conversion utilities for Twilio Media Streams.

Twilio sends: μ-law (G.711 PCMU) at 8kHz, base64 encoded
Deepgram needs: PCM 16-bit at 8kHz
ElevenLabs outputs: μ-law 8kHz directly (no conversion needed)
"""
import base64
import struct


# μ-law to linear PCM conversion table (ITU-T G.711)
# Pre-computed for performance
ULAW_TO_PCM_TABLE: list[int] = []


def _build_ulaw_table():
    """Build μ-law to PCM lookup table."""
    global ULAW_TO_PCM_TABLE
    ULAW_TO_PCM_TABLE = []
    
    for i in range(256):
        ulaw_byte = ~i & 0xFF
        sign = (ulaw_byte & 0x80)
        exponent = (ulaw_byte >> 4) & 0x07
        mantissa = ulaw_byte & 0x0F
        
        linear = (mantissa << 3) + 0x84
        linear <<= exponent
        linear -= 0x84
        
        if sign:
            linear = -linear
        
        ULAW_TO_PCM_TABLE.append(linear)


# Build table on module load
_build_ulaw_table()


def ulaw_to_pcm(ulaw_bytes: bytes) -> bytes:
    """Convert μ-law audio to 16-bit PCM."""
    pcm_samples = [ULAW_TO_PCM_TABLE[byte] for byte in ulaw_bytes]
    return struct.pack(f'<{len(pcm_samples)}h', *pcm_samples)


def base64_ulaw_to_pcm(b64_ulaw: str) -> bytes:
    """Convert base64-encoded μ-law (from Twilio) to PCM bytes (for Deepgram)."""
    ulaw_bytes = base64.b64decode(b64_ulaw)
    return ulaw_to_pcm(ulaw_bytes)

