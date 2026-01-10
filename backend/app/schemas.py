"""Pydantic schemas for API request/response validation."""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


# ============= Account Schemas =============
class AccountBase(BaseModel):
    type: str = "private"
    name: str


class AccountCreate(AccountBase):
    pass


class AccountResponse(AccountBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============= Person Schemas =============

# Nested schemas for structured JSON fields
class PersonalContextInput(BaseModel):
    """Personal context fields from frontend form.
    
    Context Hierarchy:
    1. IDENTITY: short_description, communication_style
    2. CONVERSATION STARTERS: interests, preferred_topics, life_highlights
    3. SOCIAL CONTEXT: important_people, daily_routines
    4. SENSITIVITIES: sensitivities (critical - avoid these topics!)
    5. MEDICAL: diagnoses, medications, allergies, mobility, nutrition
    """
    # Identity & Personality
    short_description: Optional[str] = None  # "Liebevolle 78-jährige Oma"
    communication_style: Optional[str] = None  # "Spricht gerne ausführlich", "Mag direkten Humor"
    
    # Conversation Starters
    interests: Optional[str] = None  # "Stricken, Gartenarbeit, Kreuzworträtsel"
    preferred_topics: Optional[str] = None  # "Familie, Wetter, Nachrichten"
    life_highlights: Optional[str] = None  # "War 40 Jahre Lehrerin, stolz auf 5 Enkel"
    
    # Social Context
    important_people: Optional[str] = None  # "Thomas (Sohn), Anna (Enkelin)"
    daily_routines: Optional[str] = None  # "Morgens Kaffee, nachmittags Spaziergang"
    
    # CRITICAL: Sensitivities (Agent must avoid or handle carefully!)
    sensitivities: Optional[str] = None  # "Verstorbener Ehemann, Thema Pflegeheim"
    
    # Care home / clinical specific
    diagnoses: Optional[str] = None
    medications: Optional[str] = None
    allergies: Optional[str] = None
    mobility: Optional[str] = None
    nutrition: Optional[str] = None


class AddressInput(BaseModel):
    """Address fields from frontend form."""
    street_house_number: Optional[str] = None
    postal_code: Optional[str] = None
    city: Optional[str] = None


class PersonBase(BaseModel):
    display_name: str
    phone_e164: str
    kind: str = "senior"  # senior | patient
    language: str = "de"
    consent_recording: bool = False
    retention_days: int = 30


class PersonCreate(PersonBase):
    """Extended create schema with new fields."""
    account_id: Optional[int] = None  # Will default to account 1 or 2 based on kind
    age: Optional[int] = None
    personal_context: Optional[PersonalContextInput] = None
    address: Optional[AddressInput] = None


class PersonUpdate(BaseModel):
    display_name: Optional[str] = None
    phone_e164: Optional[str] = None
    language: Optional[str] = None
    consent_recording: Optional[bool] = None
    retention_days: Optional[int] = None
    age: Optional[int] = None
    personal_context: Optional[PersonalContextInput] = None
    address: Optional[AddressInput] = None


class PersonResponse(PersonBase):
    id: int
    account_id: int
    age: Optional[int] = None
    personal_context_json: Optional[dict] = None
    address_json: Optional[dict] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class PersonWithStats(PersonResponse):
    """Person with call statistics for dashboard."""
    total_calls: int = 0
    calls_this_week: int = 0
    avg_duration_sec: Optional[float] = None
    last_call_at: Optional[datetime] = None
    avg_sentiment_score: Optional[float] = None


# ============= Call Schemas =============
class CallBase(BaseModel):
    direction: str = "inbound"
    from_e164: str
    to_e164: str


class CallCreate(CallBase):
    account_id: int
    person_id: Optional[int] = None
    twilio_call_sid: str


class CallUpdate(BaseModel):
    status: Optional[str] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    duration_sec: Optional[int] = None


class CallResponse(CallBase):
    id: int
    account_id: int
    person_id: Optional[int]
    twilio_call_sid: str
    started_at: Optional[datetime]
    ended_at: Optional[datetime]
    duration_sec: Optional[int]
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class CallWithAnalysis(CallResponse):
    """Call with transcript and analysis for detail views."""
    transcript_text: Optional[str] = None
    sentiment_label: Optional[str] = None
    sentiment_score: Optional[float] = None
    sentiment_confidence: Optional[float] = None
    sentiment_reason: Optional[str] = None
    summary_de: Optional[str] = None


# ============= Transcript Schemas =============
class TranscriptCreate(BaseModel):
    call_id: int
    text: str


class TranscriptResponse(BaseModel):
    id: int
    call_id: int
    text: str
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============= Analysis Schemas =============
class SentimentResult(BaseModel):
    """LLM sentiment classification result."""
    sentiment_label: str = Field(..., pattern="^(positiv|neutral|negativ)$")
    sentiment_score: float = Field(..., ge=-1.0, le=1.0)
    confidence: float = Field(..., ge=0.0, le=1.0)
    reason_short_de: str = Field(..., max_length=200)


class CallAnalysisCreate(BaseModel):
    call_id: int
    sentiment_label: Optional[str] = None
    sentiment_score: Optional[float] = None
    sentiment_confidence: Optional[float] = None
    sentiment_reason: Optional[str] = None
    summary_de: Optional[str] = None
    memory_update_json: Optional[dict] = None


class CallAnalysisResponse(BaseModel):
    id: int
    call_id: int
    sentiment_label: Optional[str]
    sentiment_score: Optional[float]
    sentiment_confidence: Optional[float]
    sentiment_reason: Optional[str]
    summary_de: Optional[str]
    memory_update_json: Optional[dict]
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============= Memory Schemas =============
class MemoryStateResponse(BaseModel):
    id: int
    person_id: int
    memory_json: dict
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ============= Dashboard Schemas =============
class DashboardStats(BaseModel):
    """Overview statistics for dashboard."""
    total_people: int = 0
    total_calls: int = 0
    calls_this_week: int = 0
    avg_duration_sec: Optional[float] = None
    avg_sentiment_score: Optional[float] = None
    sentiment_trend: List[dict] = []  # Last 7 days sentiment averages


class PersonAnalytics(BaseModel):
    """Analytics for a single person."""
    person: PersonResponse
    calls: List[CallWithAnalysis] = []
    total_calls: int = 0
    avg_duration_sec: Optional[float] = None
    avg_sentiment_score: Optional[float] = None
    sentiment_history: List[dict] = []
    memory_state: Optional[dict] = None


# ============= Twilio Number Schemas =============
class TwilioNumberResponse(BaseModel):
    id: int
    account_id: int
    phone_e164: str
    twilio_sid: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============= Settings Schemas =============
class SettingsResponse(BaseModel):
    """Account settings view."""
    twilio_numbers: List[TwilioNumberResponse] = []
    default_consent: bool = False
    default_retention_days: int = 30

