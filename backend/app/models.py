"""SQLAlchemy models for EU Voice Companion."""
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    String, Integer, Boolean, Float, Text, DateTime, ForeignKey, JSON, Enum
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.database import Base
from app.config import settings


class AccountType(str, enum.Enum):
    PRIVATE = "private"
    CLINICAL = "clinical"


class PersonKind(str, enum.Enum):
    SENIOR = "senior"
    PATIENT = "patient"


class CallDirection(str, enum.Enum):
    INBOUND = "inbound"
    OUTBOUND = "outbound"


class CallStatus(str, enum.Enum):
    INITIATED = "initiated"
    RINGING = "ringing"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    NO_ANSWER = "no_answer"


class Account(Base):
    """Multi-tenant account (private or clinical)."""
    __tablename__ = "accounts"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    type: Mapped[str] = mapped_column(String(20), default="private")
    name: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    people: Mapped[list["Person"]] = relationship(back_populates="account", cascade="all, delete-orphan")
    twilio_numbers: Mapped[list["TwilioNumber"]] = relationship(back_populates="account", cascade="all, delete-orphan")
    calls: Mapped[list["Call"]] = relationship(back_populates="account", cascade="all, delete-orphan")


class Person(Base):
    """A senior (private) or patient (clinical) being monitored."""
    __tablename__ = "people"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"), index=True)
    kind: Mapped[str] = mapped_column(String(20), default="senior")  # senior | patient
    display_name: Mapped[str] = mapped_column(String(255))
    phone_e164: Mapped[str] = mapped_column(String(20), index=True)
    language: Mapped[str] = mapped_column(String(10), default="de")
    
    # GDPR consent and retention
    consent_recording: Mapped[bool] = mapped_column(Boolean, default=False)
    retention_days: Mapped[int] = mapped_column(Integer, default=settings.DEFAULT_RETENTION_DAYS)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    account: Mapped["Account"] = relationship(back_populates="people")
    calls: Mapped[list["Call"]] = relationship(back_populates="person", cascade="all, delete-orphan")
    memory_state: Mapped[Optional["MemoryState"]] = relationship(back_populates="person", uselist=False, cascade="all, delete-orphan")


class TwilioNumber(Base):
    """Twilio phone numbers assigned to accounts."""
    __tablename__ = "twilio_numbers"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"), index=True)
    phone_e164: Mapped[str] = mapped_column(String(20), unique=True)
    twilio_sid: Mapped[str] = mapped_column(String(100))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    account: Mapped["Account"] = relationship(back_populates="twilio_numbers")


class Call(Base):
    """A single phone call record."""
    __tablename__ = "calls"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"), index=True)
    person_id: Mapped[Optional[int]] = mapped_column(ForeignKey("people.id"), nullable=True, index=True)
    
    direction: Mapped[str] = mapped_column(String(20), default="inbound")
    twilio_call_sid: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    from_e164: Mapped[str] = mapped_column(String(20))
    to_e164: Mapped[str] = mapped_column(String(20))
    
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    duration_sec: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="initiated")
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    account: Mapped["Account"] = relationship(back_populates="calls")
    person: Mapped[Optional["Person"]] = relationship(back_populates="calls")
    transcript: Mapped[Optional["Transcript"]] = relationship(back_populates="call", uselist=False, cascade="all, delete-orphan")
    analysis: Mapped[Optional["CallAnalysis"]] = relationship(back_populates="call", uselist=False, cascade="all, delete-orphan")


class Transcript(Base):
    """Call transcript (optionally encrypted for GDPR compliance)."""
    __tablename__ = "transcripts"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    call_id: Mapped[int] = mapped_column(ForeignKey("calls.id"), unique=True, index=True)
    
    # Text may be encrypted if FERNET_KEY is set
    text: Mapped[str] = mapped_column(Text, default="")
    is_encrypted: Mapped[bool] = mapped_column(Boolean, default=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    call: Mapped["Call"] = relationship(back_populates="transcript")


class CallAnalysis(Base):
    """Post-call LLM analysis: sentiment, summary, memory updates."""
    __tablename__ = "call_analysis"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    call_id: Mapped[int] = mapped_column(ForeignKey("calls.id"), unique=True, index=True)
    
    # Sentiment from LLM classifier
    sentiment_label: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # positiv|neutral|negativ
    sentiment_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # -1.0 to 1.0
    sentiment_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # 0.0 to 1.0
    sentiment_reason: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)  # Short German explanation
    
    # Summary in German (max 8 bullet points)
    summary_de: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Memory update JSON (facts extracted for long-term context)
    memory_update_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    call: Mapped["Call"] = relationship(back_populates="analysis")


class MemoryState(Base):
    """Long-term context memory for a person (GDPR-minimized)."""
    __tablename__ = "memory_state"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    person_id: Mapped[int] = mapped_column(ForeignKey("people.id"), unique=True, index=True)
    
    # Structured memory: facts, preferences, important events, names
    memory_json: Mapped[dict] = mapped_column(JSON, default=dict)
    
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    person: Mapped["Person"] = relationship(back_populates="memory_state")

