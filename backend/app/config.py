"""Application configuration with GDPR-aware defaults."""
import os
from pydantic_settings import BaseSettings
from typing import Optional
from cryptography.fernet import Fernet


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/voicecompanion.db"
    
    # OpenAI (GPT-4o for reasoning)
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"  # Best streaming model available
    
    # Deepgram (Streaming STT)
    DEEPGRAM_API_KEY: str = ""
    DEEPGRAM_MODEL: str = "nova-2"  # Best accuracy + speed
    DEEPGRAM_LANGUAGE: str = "de"   # German
    
    # ElevenLabs (Streaming TTS)
    ELEVENLABS_API_KEY: str = ""
    ELEVENLABS_VOICE_ID: str = "nGISSznGHAgSTKaMXEPO"  # New German female voice
    # Model options:
    # - eleven_turbo_v2_5: Fastest but less natural prosody
    # - eleven_multilingual_v2: Best German prosody (audio tags don't work in streaming)
    # - eleven_flash_v2_5: Fast but audio tags not supported in streaming API
    ELEVENLABS_MODEL: str = "eleven_multilingual_v2"  # Best for German intonation
    
    # Twilio
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_NUMBER_E164: str = ""
    TWILIO_REGION: str = "ie1"  # EU Region Ireland
    
    # Security
    ADMIN_TOKEN: str = "dev-admin-token"
    FERNET_KEY: Optional[str] = None  # For transcript encryption at rest
    
    # Application
    BASE_URL: str = "http://localhost:8000"
    
    # Voice Agent Tuning Parameters
    END_OF_TURN_SILENCE_MS: int = 750   # Silence before considering turn complete
    GRACE_MS: int = 200                  # Extra grace period after silence
    MIN_UTTERANCE_MS: int = 600          # Minimum utterance length
    MAX_UTTERANCE_MS: int = 15000        # Maximum utterance length
    BARGE_IN_THRESHOLD_MS: int = 150     # How fast to detect barge-in
    
    # GDPR Settings
    DEFAULT_RETENTION_DAYS: int = 30
    ENABLE_TRANSCRIPT_STORAGE: bool = True
    EU_HOSTING_ONLY: bool = True
    NO_TRAINING_USE: bool = True
    
    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()


def get_fernet() -> Optional[Fernet]:
    """Get Fernet instance for encryption, or None if not configured."""
    if settings.FERNET_KEY:
        return Fernet(settings.FERNET_KEY.encode())
    return None


def encrypt_text(text: str) -> str:
    """Encrypt text if FERNET_KEY is set, otherwise return as-is."""
    fernet = get_fernet()
    if fernet and text:
        return fernet.encrypt(text.encode()).decode()
    return text


def decrypt_text(text: str) -> str:
    """Decrypt text if FERNET_KEY is set, otherwise return as-is."""
    fernet = get_fernet()
    if fernet and text:
        try:
            return fernet.decrypt(text.encode()).decode()
        except Exception:
            return text  # Return as-is if decryption fails
    return text

