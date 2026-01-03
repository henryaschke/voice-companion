"""
Audio format conversion utilities for Twilio Media Streams.

Twilio Media Streams use:
- Format: μ-law (G.711 PCMU)
- Sample rate: 8000 Hz
- Channels: Mono
- Encoding: Base64

Deepgram expects:
- Format: PCM 16-bit signed little-endian
- Sample rate: 8000 Hz or 16000 Hz (we use 8000 to avoid resampling)
- Channels: Mono

ElevenLabs TTS outputs:
- Format: PCM 16-bit or MP3
- Sample rate: Various (we request 8000 Hz μ-law directly if possible, else convert)
"""
import base64
import struct
from typing import Optional

# μ-law to linear PCM conversion table (ITU-T G.711)
# Pre-computed for performance
ULAW_TO_PCM_TABLE = []

def _build_ulaw_table():
    """Build μ-law to PCM lookup table."""
    global ULAW_TO_PCM_TABLE
    ULAW_TO_PCM_TABLE = []
    
    for i in range(256):
        # Invert all bits
        ulaw_byte = ~i & 0xFF
        
        # Extract sign, exponent, and mantissa
        sign = (ulaw_byte & 0x80)
        exponent = (ulaw_byte >> 4) & 0x07
        mantissa = ulaw_byte & 0x0F
        
        # Compute linear value
        linear = (mantissa << 3) + 0x84
        linear <<= exponent
        linear -= 0x84
        
        # Apply sign
        if sign:
            linear = -linear
        
        ULAW_TO_PCM_TABLE.append(linear)

# Build table on module load
_build_ulaw_table()


# PCM to μ-law conversion constants
ULAW_BIAS = 0x84
ULAW_CLIP = 32635

def _pcm_to_ulaw_sample(sample: int) -> int:
    """Convert a single PCM sample to μ-law."""
    # Get sign and absolute value
    sign = 0
    if sample < 0:
        sign = 0x80
        sample = -sample
    
    # Clip
    if sample > ULAW_CLIP:
        sample = ULAW_CLIP
    
    # Add bias
    sample += ULAW_BIAS
    
    # Find exponent and mantissa
    exponent = 7
    exp_mask = 0x4000
    
    while exponent > 0 and not (sample & exp_mask):
        exponent -= 1
        exp_mask >>= 1
    
    mantissa = (sample >> (exponent + 3)) & 0x0F
    
    # Combine and invert
    ulaw_byte = ~(sign | (exponent << 4) | mantissa) & 0xFF
    
    return ulaw_byte


def ulaw_to_pcm(ulaw_bytes: bytes) -> bytes:
    """
    Convert μ-law audio to 16-bit PCM.
    
    Args:
        ulaw_bytes: Raw μ-law audio bytes
        
    Returns:
        PCM 16-bit signed little-endian bytes
    """
    pcm_samples = []
    for byte in ulaw_bytes:
        pcm_samples.append(ULAW_TO_PCM_TABLE[byte])
    
    # Pack as 16-bit signed little-endian
    return struct.pack(f'<{len(pcm_samples)}h', *pcm_samples)


def pcm_to_ulaw(pcm_bytes: bytes) -> bytes:
    """
    Convert 16-bit PCM to μ-law audio.
    
    Args:
        pcm_bytes: PCM 16-bit signed little-endian bytes
        
    Returns:
        μ-law audio bytes
    """
    # Unpack PCM samples
    num_samples = len(pcm_bytes) // 2
    pcm_samples = struct.unpack(f'<{num_samples}h', pcm_bytes)
    
    # Convert each sample
    ulaw_bytes = bytes([_pcm_to_ulaw_sample(s) for s in pcm_samples])
    
    return ulaw_bytes


def base64_ulaw_to_pcm(b64_ulaw: str) -> bytes:
    """
    Convert base64-encoded μ-law to PCM bytes.
    
    Args:
        b64_ulaw: Base64 encoded μ-law audio from Twilio
        
    Returns:
        PCM 16-bit bytes
    """
    ulaw_bytes = base64.b64decode(b64_ulaw)
    return ulaw_to_pcm(ulaw_bytes)


def pcm_to_base64_ulaw(pcm_bytes: bytes) -> str:
    """
    Convert PCM bytes to base64-encoded μ-law for Twilio.
    
    Args:
        pcm_bytes: PCM 16-bit bytes
        
    Returns:
        Base64 encoded μ-law audio for Twilio
    """
    ulaw_bytes = pcm_to_ulaw(pcm_bytes)
    return base64.b64encode(ulaw_bytes).decode('ascii')


def resample_8k_to_16k(pcm_8k: bytes) -> bytes:
    """
    Simple linear interpolation resample from 8kHz to 16kHz.
    
    Args:
        pcm_8k: PCM 16-bit at 8000 Hz
        
    Returns:
        PCM 16-bit at 16000 Hz
    """
    num_samples = len(pcm_8k) // 2
    samples_8k = struct.unpack(f'<{num_samples}h', pcm_8k)
    
    # Double the samples with linear interpolation
    samples_16k = []
    for i in range(num_samples):
        samples_16k.append(samples_8k[i])
        if i < num_samples - 1:
            # Interpolate between current and next sample
            interpolated = (samples_8k[i] + samples_8k[i + 1]) // 2
            samples_16k.append(interpolated)
        else:
            # Last sample, just duplicate
            samples_16k.append(samples_8k[i])
    
    return struct.pack(f'<{len(samples_16k)}h', *samples_16k)


def resample_16k_to_8k(pcm_16k: bytes) -> bytes:
    """
    Downsample from 16kHz to 8kHz by taking every other sample.
    
    Args:
        pcm_16k: PCM 16-bit at 16000 Hz
        
    Returns:
        PCM 16-bit at 8000 Hz
    """
    num_samples = len(pcm_16k) // 2
    samples_16k = struct.unpack(f'<{num_samples}h', pcm_16k)
    
    # Take every other sample
    samples_8k = samples_16k[::2]
    
    return struct.pack(f'<{len(samples_8k)}h', *samples_8k)


# Frame size constants for different sample rates
FRAME_MS = 20  # Standard frame duration
SAMPLES_PER_FRAME_8K = 160   # 8000 Hz * 0.020 s
SAMPLES_PER_FRAME_16K = 320  # 16000 Hz * 0.020 s
BYTES_PER_FRAME_8K_ULAW = 160      # μ-law: 1 byte per sample
BYTES_PER_FRAME_8K_PCM = 320       # PCM 16-bit: 2 bytes per sample
BYTES_PER_FRAME_16K_PCM = 640      # PCM 16-bit at 16kHz


def chunk_audio(audio_bytes: bytes, chunk_size: int) -> list[bytes]:
    """
    Split audio into chunks of specified size.
    
    Args:
        audio_bytes: Audio data
        chunk_size: Size of each chunk in bytes
        
    Returns:
        List of audio chunks
    """
    chunks = []
    for i in range(0, len(audio_bytes), chunk_size):
        chunk = audio_bytes[i:i + chunk_size]
        if chunk:
            chunks.append(chunk)
    return chunks

