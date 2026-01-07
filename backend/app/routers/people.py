"""
People (seniors/patients) API routes.

Endpoints:
- GET  /api/people/seniors      - List all seniors
- GET  /api/people/patients     - List all patients
- POST /api/people/seniors      - Create senior
- POST /api/people/patients     - Create patient
- GET  /api/people/{id}         - Get person by ID
- GET  /api/people/{id}/analytics - Get person analytics
- PUT  /api/people/{id}         - Update person
- DELETE /api/people/{id}       - Delete person
"""
import re
from typing import List, Literal
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app import crud
from app.schemas import (
    PersonCreate, PersonUpdate, PersonResponse, PersonWithStats,
    PersonAnalytics, CallWithAnalysis
)
from app.routers.auth import verify_admin_token

router = APIRouter(prefix="/api/people", tags=["people"])


# ============= Helpers =============

def normalize_phone_to_e164(phone: str) -> str:
    """
    Normalize phone number to E.164 format.
    - Removes spaces, dashes, parentheses
    - Converts German 0xxx to +49xxx
    - Returns as-is if already E.164
    """
    cleaned = re.sub(r'[^\d+]', '', phone)
    
    if cleaned.startswith('+'):
        return cleaned
    if cleaned.startswith('0'):
        return '+49' + cleaned[1:]
    if cleaned.startswith('49'):
        return '+' + cleaned
    return '+49' + cleaned


def person_to_response(person, stats: dict = None) -> PersonWithStats:
    """Convert Person model to PersonWithStats response."""
    base = {
        "id": person.id,
        "account_id": person.account_id,
        "kind": person.kind,
        "display_name": person.display_name,
        "phone_e164": person.phone_e164,
        "language": person.language,
        "consent_recording": person.consent_recording,
        "retention_days": person.retention_days,
        "age": person.age,
        "personal_context_json": person.personal_context_json,
        "address_json": person.address_json,
        "created_at": person.created_at,
        "updated_at": person.updated_at,
    }
    if stats:
        base.update(stats)
    return PersonWithStats(**base)


async def list_people_by_kind(
    db: AsyncSession,
    kind: Literal["senior", "patient"],
    skip: int = 0,
    limit: int = 100
) -> List[PersonWithStats]:
    """List people filtered by kind with stats."""
    account_id = 1 if kind == "senior" else 2
    people = await crud.get_people(db, account_id=account_id, kind=kind, skip=skip, limit=limit)
    
    result = []
    for person in people:
        stats = await crud.get_person_stats(db, person.id)
        result.append(person_to_response(person, stats))
    return result


async def create_person_with_kind(
    db: AsyncSession,
    person: PersonCreate,
    kind: Literal["senior", "patient"]
) -> PersonResponse:
    """Create a person with specified kind."""
    person.phone_e164 = normalize_phone_to_e164(person.phone_e164)
    
    if await crud.check_phone_exists(db, person.phone_e164):
        raise HTTPException(
            status_code=409,
            detail=f"Telefonnummer {person.phone_e164} existiert bereits."
        )
    
    person.kind = kind
    person.account_id = 1 if kind == "senior" else 2
    return await crud.create_person(db, person)


# ============= List Endpoints =============

@router.get("/seniors", response_model=List[PersonWithStats])
async def list_seniors(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin_token)
):
    """List all seniors (private account)."""
    return await list_people_by_kind(db, "senior", skip, limit)


@router.get("/patients", response_model=List[PersonWithStats])
async def list_patients(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin_token)
):
    """List all patients (clinical account)."""
    return await list_people_by_kind(db, "patient", skip, limit)


# ============= Create Endpoints =============

@router.post("/seniors", response_model=PersonResponse, status_code=201)
async def create_senior(
    person: PersonCreate,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin_token)
):
    """Create a new senior."""
    return await create_person_with_kind(db, person, "senior")


@router.post("/patients", response_model=PersonResponse, status_code=201)
async def create_patient(
    person: PersonCreate,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin_token)
):
    """Create a new patient."""
    return await create_person_with_kind(db, person, "patient")


# ============= Single Person Endpoints =============

@router.get("/{person_id}", response_model=PersonWithStats)
async def get_person(
    person_id: int,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin_token)
):
    """Get a person by ID with stats."""
    person = await crud.get_person(db, person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Person nicht gefunden")
    
    stats = await crud.get_person_stats(db, person.id)
    return person_to_response(person, stats)


@router.get("/{person_id}/analytics", response_model=PersonAnalytics)
async def get_person_analytics(
    person_id: int,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin_token)
):
    """Get detailed analytics for a person."""
    person = await crud.get_person(db, person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Person nicht gefunden")
    
    # Get calls with analysis
    calls = await crud.get_calls_with_analysis(db, person.account_id, person_id=person_id, limit=50)
    
    calls_with_analysis = []
    sentiment_history = []
    
    for call in calls:
        transcript_text = None
        if call.transcript:
            from app.config import decrypt_text
            transcript_text = decrypt_text(call.transcript.text) if call.transcript.is_encrypted else call.transcript.text
        
        calls_with_analysis.append(CallWithAnalysis(
            id=call.id,
            account_id=call.account_id,
            person_id=call.person_id,
            direction=call.direction,
            twilio_call_sid=call.twilio_call_sid,
            from_e164=call.from_e164,
            to_e164=call.to_e164,
            started_at=call.started_at,
            ended_at=call.ended_at,
            duration_sec=call.duration_sec,
            status=call.status,
            created_at=call.created_at,
            transcript_text=transcript_text,
            sentiment_label=call.analysis.sentiment_label if call.analysis else None,
            sentiment_score=call.analysis.sentiment_score if call.analysis else None,
            sentiment_confidence=call.analysis.sentiment_confidence if call.analysis else None,
            sentiment_reason=call.analysis.sentiment_reason if call.analysis else None,
            summary_de=call.analysis.summary_de if call.analysis else None
        ))
        
        if call.analysis and call.analysis.sentiment_score is not None:
            sentiment_history.append({
                "date": call.created_at.isoformat(),
                "score": call.analysis.sentiment_score,
                "label": call.analysis.sentiment_label
            })
    
    memory = await crud.get_memory_state(db, person_id)
    stats = await crud.get_person_stats(db, person_id)
    
    return PersonAnalytics(
        person=PersonResponse(
            id=person.id,
            account_id=person.account_id,
            kind=person.kind,
            display_name=person.display_name,
            phone_e164=person.phone_e164,
            language=person.language,
            consent_recording=person.consent_recording,
            retention_days=person.retention_days,
            age=person.age,
            personal_context_json=person.personal_context_json,
            address_json=person.address_json,
            created_at=person.created_at,
            updated_at=person.updated_at
        ),
        calls=calls_with_analysis,
        total_calls=stats["total_calls"],
        avg_duration_sec=stats["avg_duration_sec"],
        avg_sentiment_score=stats["avg_sentiment_score"],
        sentiment_history=sentiment_history,
        memory_state=memory.memory_json if memory else None
    )


@router.put("/{person_id}", response_model=PersonResponse)
async def update_person(
    person_id: int,
    updates: PersonUpdate,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin_token)
):
    """Update a person."""
    person = await crud.update_person(db, person_id, updates)
    if not person:
        raise HTTPException(status_code=404, detail="Person nicht gefunden")
    return person


@router.delete("/{person_id}")
async def delete_person(
    person_id: int,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin_token)
):
    """Delete a person and all related data."""
    success = await crud.delete_person(db, person_id)
    if not success:
        raise HTTPException(status_code=404, detail="Person nicht gefunden")
    return {"message": "Person gelöscht"}
