"""CRUD operations with multi-tenant (account_id) filtering."""
from datetime import datetime, timedelta
from typing import Optional, List
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Account, Person, Call, Transcript, CallAnalysis, MemoryState, TwilioNumber
from app.schemas import PersonCreate, PersonUpdate, CallCreate, CallUpdate, CallAnalysisCreate
from app.config import encrypt_text, decrypt_text, settings


# ============= Account CRUD =============
async def get_account(db: AsyncSession, account_id: int) -> Optional[Account]:
    result = await db.execute(select(Account).where(Account.id == account_id))
    return result.scalar_one_or_none()


async def get_accounts(db: AsyncSession) -> List[Account]:
    result = await db.execute(select(Account))
    return list(result.scalars().all())


# ============= Person CRUD =============
async def get_person(db: AsyncSession, person_id: int, account_id: Optional[int] = None) -> Optional[Person]:
    """Get person by ID, optionally filtered by account (tenant isolation)."""
    query = select(Person).where(Person.id == person_id)
    if account_id:
        query = query.where(Person.account_id == account_id)
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def get_person_by_phone(db: AsyncSession, phone_e164: str, account_id: Optional[int] = None) -> Optional[Person]:
    """Find person by phone number."""
    query = select(Person).where(Person.phone_e164 == phone_e164)
    if account_id:
        query = query.where(Person.account_id == account_id)
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def get_people(
    db: AsyncSession, 
    account_id: int,
    kind: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Person]:
    """Get all people for an account with optional kind filter."""
    query = select(Person).where(Person.account_id == account_id)
    if kind:
        query = query.where(Person.kind == kind)
    query = query.offset(skip).limit(limit).order_by(Person.created_at.desc())
    result = await db.execute(query)
    return list(result.scalars().all())


async def create_person(db: AsyncSession, person: PersonCreate) -> Person:
    """Create a new person with extended profile data."""
    # Default account based on kind
    account_id = person.account_id
    if not account_id:
        account_id = 2 if person.kind == "patient" else 1
    
    # Build personal_context_json from nested object
    personal_context_json = None
    if person.personal_context:
        personal_context_json = person.personal_context.model_dump(exclude_unset=True)
    
    # Build address_json from nested object
    address_json = None
    if person.address:
        address_json = person.address.model_dump(exclude_unset=True)
    
    db_person = Person(
        account_id=account_id,
        kind=person.kind,
        display_name=person.display_name,
        phone_e164=person.phone_e164,
        language=person.language,
        consent_recording=person.consent_recording,
        retention_days=person.retention_days,
        age=person.age,
        personal_context_json=personal_context_json,
        address_json=address_json
    )
    db.add(db_person)
    await db.commit()
    await db.refresh(db_person)
    
    # Create empty memory state
    memory = MemoryState(person_id=db_person.id, memory_json={})
    db.add(memory)
    await db.commit()
    
    return db_person


async def update_person(db: AsyncSession, person_id: int, updates: PersonUpdate, account_id: Optional[int] = None) -> Optional[Person]:
    """Update a person's details with extended profile data."""
    person = await get_person(db, person_id, account_id)
    if not person:
        return None
    
    update_data = updates.model_dump(exclude_unset=True)
    
    # Handle nested personal_context
    if "personal_context" in update_data and update_data["personal_context"]:
        person.personal_context_json = update_data.pop("personal_context")
    elif "personal_context" in update_data:
        update_data.pop("personal_context")
    
    # Handle nested address
    if "address" in update_data and update_data["address"]:
        person.address_json = update_data.pop("address")
    elif "address" in update_data:
        update_data.pop("address")
    
    # Update remaining flat fields
    for field, value in update_data.items():
        setattr(person, field, value)
    
    await db.commit()
    await db.refresh(person)
    return person


async def check_phone_exists(db: AsyncSession, phone_e164: str, exclude_person_id: Optional[int] = None) -> bool:
    """Check if phone number already exists (for uniqueness validation)."""
    query = select(Person).where(Person.phone_e164 == phone_e164)
    if exclude_person_id:
        query = query.where(Person.id != exclude_person_id)
    result = await db.execute(query)
    return result.scalar_one_or_none() is not None


async def delete_person(db: AsyncSession, person_id: int, account_id: Optional[int] = None) -> bool:
    """Delete a person and all related data."""
    person = await get_person(db, person_id, account_id)
    if not person:
        return False
    
    await db.delete(person)
    await db.commit()
    return True


# ============= Call CRUD =============
async def get_call(db: AsyncSession, call_id: int, account_id: Optional[int] = None) -> Optional[Call]:
    """Get call by ID with optional account filter."""
    query = select(Call).where(Call.id == call_id)
    if account_id:
        query = query.where(Call.account_id == account_id)
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def get_call_by_sid(db: AsyncSession, twilio_call_sid: str) -> Optional[Call]:
    """Get call by Twilio SID."""
    result = await db.execute(
        select(Call).where(Call.twilio_call_sid == twilio_call_sid)
    )
    return result.scalar_one_or_none()


async def get_calls(
    db: AsyncSession,
    account_id: int,
    person_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Call]:
    """Get calls for an account, optionally filtered by person."""
    query = select(Call).where(Call.account_id == account_id)
    if person_id:
        query = query.where(Call.person_id == person_id)
    query = query.offset(skip).limit(limit).order_by(Call.created_at.desc())
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_calls_with_analysis(
    db: AsyncSession,
    account_id: int,
    person_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Call]:
    """Get calls with transcript and analysis loaded."""
    query = (
        select(Call)
        .options(selectinload(Call.transcript), selectinload(Call.analysis))
        .where(Call.account_id == account_id)
    )
    if person_id:
        query = query.where(Call.person_id == person_id)
    query = query.offset(skip).limit(limit).order_by(Call.created_at.desc())
    result = await db.execute(query)
    return list(result.scalars().all())


async def create_call(db: AsyncSession, call: CallCreate) -> Call:
    """Create a new call record."""
    db_call = Call(
        account_id=call.account_id,
        person_id=call.person_id,
        direction=call.direction,
        twilio_call_sid=call.twilio_call_sid,
        from_e164=call.from_e164,
        to_e164=call.to_e164,
        status="initiated"
    )
    db.add(db_call)
    await db.commit()
    await db.refresh(db_call)
    return db_call


async def update_call(db: AsyncSession, call_id: int, updates: CallUpdate) -> Optional[Call]:
    """Update call status/times."""
    call = await get_call(db, call_id)
    if not call:
        return None
    
    update_data = updates.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(call, field, value)
    
    await db.commit()
    await db.refresh(call)
    return call


# ============= Transcript CRUD =============
async def create_transcript(db: AsyncSession, call_id: int, text: str, encrypt: bool = True) -> Transcript:
    """Create transcript, optionally encrypted."""
    stored_text = text
    is_encrypted = False
    
    if encrypt and settings.FERNET_KEY:
        stored_text = encrypt_text(text)
        is_encrypted = True
    
    transcript = Transcript(
        call_id=call_id,
        text=stored_text,
        is_encrypted=is_encrypted
    )
    db.add(transcript)
    await db.commit()
    await db.refresh(transcript)
    return transcript


async def get_transcript(db: AsyncSession, call_id: int) -> Optional[str]:
    """Get decrypted transcript text."""
    result = await db.execute(
        select(Transcript).where(Transcript.call_id == call_id)
    )
    transcript = result.scalar_one_or_none()
    if not transcript:
        return None
    
    if transcript.is_encrypted:
        return decrypt_text(transcript.text)
    return transcript.text


# ============= Analysis CRUD =============
async def create_analysis(db: AsyncSession, analysis: CallAnalysisCreate) -> CallAnalysis:
    """Create call analysis record."""
    db_analysis = CallAnalysis(
        call_id=analysis.call_id,
        sentiment_label=analysis.sentiment_label,
        sentiment_score=analysis.sentiment_score,
        sentiment_confidence=analysis.sentiment_confidence,
        sentiment_reason=analysis.sentiment_reason,
        summary_de=analysis.summary_de,
        memory_update_json=analysis.memory_update_json
    )
    db.add(db_analysis)
    await db.commit()
    await db.refresh(db_analysis)
    return db_analysis


async def get_analysis(db: AsyncSession, call_id: int) -> Optional[CallAnalysis]:
    """Get analysis for a call."""
    result = await db.execute(
        select(CallAnalysis).where(CallAnalysis.call_id == call_id)
    )
    return result.scalar_one_or_none()


# ============= Memory State CRUD =============
async def get_memory_state(db: AsyncSession, person_id: int) -> Optional[MemoryState]:
    """Get memory state for a person."""
    result = await db.execute(
        select(MemoryState).where(MemoryState.person_id == person_id)
    )
    return result.scalar_one_or_none()


async def update_memory_state(db: AsyncSession, person_id: int, memory_json: dict) -> MemoryState:
    """Update or create memory state."""
    memory = await get_memory_state(db, person_id)
    if memory:
        memory.memory_json = memory_json
        memory.updated_at = datetime.utcnow()
    else:
        memory = MemoryState(person_id=person_id, memory_json=memory_json)
        db.add(memory)
    
    await db.commit()
    await db.refresh(memory)
    return memory


# ============= Statistics =============
async def get_account_stats(db: AsyncSession, account_id: int) -> dict:
    """Get dashboard statistics for an account."""
    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)
    
    # Total people
    people_result = await db.execute(
        select(func.count(Person.id)).where(Person.account_id == account_id)
    )
    total_people = people_result.scalar() or 0
    
    # Total calls
    calls_result = await db.execute(
        select(func.count(Call.id)).where(Call.account_id == account_id)
    )
    total_calls = calls_result.scalar() or 0
    
    # Calls this week
    week_calls_result = await db.execute(
        select(func.count(Call.id)).where(
            and_(Call.account_id == account_id, Call.created_at >= week_ago)
        )
    )
    calls_this_week = week_calls_result.scalar() or 0
    
    # Average duration
    avg_duration_result = await db.execute(
        select(func.avg(Call.duration_sec)).where(
            and_(Call.account_id == account_id, Call.duration_sec.isnot(None))
        )
    )
    avg_duration = avg_duration_result.scalar()
    
    # Average sentiment
    avg_sentiment_result = await db.execute(
        select(func.avg(CallAnalysis.sentiment_score))
        .join(Call, CallAnalysis.call_id == Call.id)
        .where(and_(Call.account_id == account_id, CallAnalysis.sentiment_score.isnot(None)))
    )
    avg_sentiment = avg_sentiment_result.scalar()
    
    # Sentiment trend (last 7 days)
    sentiment_trend = []
    for i in range(6, -1, -1):
        day = now - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        
        day_sentiment = await db.execute(
            select(func.avg(CallAnalysis.sentiment_score))
            .join(Call, CallAnalysis.call_id == Call.id)
            .where(
                and_(
                    Call.account_id == account_id,
                    Call.created_at >= day_start,
                    Call.created_at < day_end,
                    CallAnalysis.sentiment_score.isnot(None)
                )
            )
        )
        score = day_sentiment.scalar()
        sentiment_trend.append({
            "date": day_start.isoformat(),
            "score": score
        })
    
    return {
        "total_people": total_people,
        "total_calls": total_calls,
        "calls_this_week": calls_this_week,
        "avg_duration_sec": avg_duration,
        "avg_sentiment_score": avg_sentiment,
        "sentiment_trend": sentiment_trend
    }


async def get_person_stats(db: AsyncSession, person_id: int) -> dict:
    """Get statistics for a single person."""
    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)
    
    # Total calls
    total_result = await db.execute(
        select(func.count(Call.id)).where(Call.person_id == person_id)
    )
    total_calls = total_result.scalar() or 0
    
    # Calls this week
    week_result = await db.execute(
        select(func.count(Call.id)).where(
            and_(Call.person_id == person_id, Call.created_at >= week_ago)
        )
    )
    calls_this_week = week_result.scalar() or 0
    
    # Average duration
    avg_duration_result = await db.execute(
        select(func.avg(Call.duration_sec)).where(
            and_(Call.person_id == person_id, Call.duration_sec.isnot(None))
        )
    )
    avg_duration = avg_duration_result.scalar()
    
    # Last call
    last_call_result = await db.execute(
        select(Call.created_at)
        .where(Call.person_id == person_id)
        .order_by(Call.created_at.desc())
        .limit(1)
    )
    last_call_row = last_call_result.first()
    last_call_at = last_call_row[0] if last_call_row else None
    
    # Average sentiment
    avg_sentiment_result = await db.execute(
        select(func.avg(CallAnalysis.sentiment_score))
        .join(Call, CallAnalysis.call_id == Call.id)
        .where(and_(Call.person_id == person_id, CallAnalysis.sentiment_score.isnot(None)))
    )
    avg_sentiment = avg_sentiment_result.scalar()
    
    return {
        "total_calls": total_calls,
        "calls_this_week": calls_this_week,
        "avg_duration_sec": avg_duration,
        "last_call_at": last_call_at,
        "avg_sentiment_score": avg_sentiment
    }


# ============= Retention Cleanup =============
async def cleanup_expired_data(db: AsyncSession) -> dict:
    """Delete transcripts and analyses older than retention_days per person."""
    deleted_transcripts = 0
    deleted_analyses = 0
    now = datetime.utcnow()
    
    # Get all people with their retention settings
    people_result = await db.execute(select(Person))
    people = people_result.scalars().all()
    
    for person in people:
        retention_cutoff = now - timedelta(days=person.retention_days)
        
        # Find expired calls
        expired_calls = await db.execute(
            select(Call.id).where(
                and_(
                    Call.person_id == person.id,
                    Call.created_at < retention_cutoff
                )
            )
        )
        expired_call_ids = [row[0] for row in expired_calls.all()]
        
        if expired_call_ids:
            # Delete transcripts
            for call_id in expired_call_ids:
                transcript_result = await db.execute(
                    select(Transcript).where(Transcript.call_id == call_id)
                )
                transcript = transcript_result.scalar_one_or_none()
                if transcript:
                    await db.delete(transcript)
                    deleted_transcripts += 1
                
                # Delete analysis
                analysis_result = await db.execute(
                    select(CallAnalysis).where(CallAnalysis.call_id == call_id)
                )
                analysis = analysis_result.scalar_one_or_none()
                if analysis:
                    await db.delete(analysis)
                    deleted_analyses += 1
    
    await db.commit()
    
    return {
        "deleted_transcripts": deleted_transcripts,
        "deleted_analyses": deleted_analyses
    }


# ============= Twilio Numbers =============
async def get_twilio_numbers(db: AsyncSession, account_id: int) -> List[TwilioNumber]:
    """Get Twilio numbers for an account."""
    result = await db.execute(
        select(TwilioNumber).where(TwilioNumber.account_id == account_id)
    )
    return list(result.scalars().all())

