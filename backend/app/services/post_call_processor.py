"""
Post-call processing: transcript storage, LLM sentiment analysis, summary, memory update.

This runs asynchronously after a call ends to:
1. Store the transcript (optionally encrypted)
2. Analyze sentiment using LLM (no keyword heuristics)
3. Generate a German summary (max 8 bullet points)
4. Extract memory updates for long-term context
"""
import json
from datetime import datetime
from typing import Optional
from openai import AsyncOpenAI

from app.config import settings
from app.database import async_session_maker
from app import crud
from app.schemas import CallUpdate, CallAnalysisCreate


# Initialize OpenAI client
client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None


async def process_call_completion(call_sid: str, transcript: str):
    """
    Process a completed call:
    1. Finalize call record
    2. Store transcript (if consent given)
    3. Run LLM sentiment analysis
    4. Generate summary
    5. Update memory state
    """
    async with async_session_maker() as db:
        # Get call record
        call = await crud.get_call_by_sid(db, call_sid)
        if not call:
            print(f"[{call_sid}] Call not found for post-processing")
            return
        
        # Update call as completed
        ended_at = datetime.utcnow()
        duration = None
        if call.started_at:
            duration = int((ended_at - call.started_at).total_seconds())
        
        await crud.update_call(db, call.id, CallUpdate(
            status="completed",
            ended_at=ended_at,
            duration_sec=duration
        ))
        
        # Check if we have a transcript to process
        if not transcript or not transcript.strip():
            print(f"[{call_sid}] No transcript to process")
            return
        
        # Get person for consent check
        person = None
        if call.person_id:
            person = await crud.get_person(db, call.person_id)
        
        # Store transcript if consent given or if it's an unknown caller
        # (For GDPR: only store if consent_recording is True)
        if person and person.consent_recording:
            await crud.create_transcript(db, call.id, transcript, encrypt=True)
        elif not person:
            # Unknown caller - store with encryption, flag for review
            await crud.create_transcript(db, call.id, transcript, encrypt=True)
        
        # Run LLM analysis
        if client:
            try:
                # Analyze sentiment
                sentiment = await analyze_sentiment(transcript)
                
                # Generate summary
                summary = await generate_summary(transcript)
                
                # Extract memory updates
                memory_update = await extract_memory_updates(transcript)
                
                # Store analysis
                await crud.create_analysis(db, CallAnalysisCreate(
                    call_id=call.id,
                    sentiment_label=sentiment.get("sentiment_label"),
                    sentiment_score=sentiment.get("sentiment_score"),
                    sentiment_confidence=sentiment.get("confidence"),
                    sentiment_reason=sentiment.get("reason_short_de"),
                    summary_de=summary,
                    memory_update_json=memory_update
                ))
                
                # Update person's memory state
                if call.person_id and memory_update:
                    existing_memory = await crud.get_memory_state(db, call.person_id)
                    existing_json = existing_memory.memory_json if existing_memory else {}
                    
                    # Merge new facts with existing
                    merged = merge_memory(existing_json, memory_update)
                    await crud.update_memory_state(db, call.person_id, merged)
                    
                    print(f"[{call_sid}] Memory updated for person {call.person_id}:")
                    print(f"[{call_sid}]   New facts: {memory_update.get('facts', [])}")
                    print(f"[{call_sid}]   New people: {memory_update.get('important_people', [])}")
                    print(f"[{call_sid}]   Total facts now: {len(merged.get('facts', []))}")
                
                print(f"[{call_sid}] Post-processing complete")
                
            except Exception as e:
                print(f"[{call_sid}] LLM analysis error: {e}")
        else:
            print(f"[{call_sid}] OpenAI not configured, skipping analysis")


async def analyze_sentiment(transcript: str) -> dict:
    """
    Analyze sentiment using LLM classifier (no keyword heuristics).
    
    Returns:
        {
            "sentiment_label": "positiv|neutral|negativ",
            "sentiment_score": -1.0..1.0,
            "confidence": 0.0..1.0,
            "reason_short_de": "max 20 words"
        }
    """
    prompt = f"""Analysiere die Stimmung dieses Gesprächs und antworte NUR mit JSON.

Gespräch:
{transcript[:3000]}

Antworte mit diesem exakten JSON-Format:
{{
    "sentiment_label": "positiv" oder "neutral" oder "negativ",
    "sentiment_score": Zahl zwischen -1.0 (sehr negativ) und 1.0 (sehr positiv),
    "confidence": Zahl zwischen 0.0 und 1.0 (wie sicher bist du),
    "reason_short_de": "Kurze Begründung auf Deutsch (max 20 Wörter)"
}}

Basiere die Analyse auf:
- Emotionaler Ton der Aussagen
- Themen und deren Kontext
- Sprachliche Hinweise auf Wohlbefinden

NUR JSON, keine andere Ausgabe:"""

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=200
        )
        
        content = response.choices[0].message.content.strip()
        
        # Parse JSON from response
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        
        result = json.loads(content)
        
        # Validate and normalize
        return {
            "sentiment_label": result.get("sentiment_label", "neutral"),
            "sentiment_score": float(result.get("sentiment_score", 0)),
            "confidence": float(result.get("confidence", 0.5)),
            "reason_short_de": result.get("reason_short_de", "")[:200]
        }
        
    except Exception as e:
        print(f"Sentiment analysis error: {e}")
        return {
            "sentiment_label": "neutral",
            "sentiment_score": 0.0,
            "confidence": 0.0,
            "reason_short_de": "Analyse fehlgeschlagen"
        }


async def generate_summary(transcript: str) -> str:
    """
    Generate a German summary with max 8 bullet points.
    Focuses on key topics, emotions, and actionable items.
    """
    prompt = f"""Erstelle eine kurze Zusammenfassung dieses Gesprächs auf Deutsch.

Gespräch:
{transcript[:4000]}

Regeln:
- Maximal 8 Stichpunkte
- Jeder Punkt beginnt mit "• "
- Fokus auf: Hauptthemen, emotionale Momente, wichtige Informationen
- Keine sensiblen medizinischen Details
- Kurz und prägnant

Zusammenfassung:"""

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
            max_tokens=400
        )
        
        return response.choices[0].message.content.strip()
        
    except Exception as e:
        print(f"Summary generation error: {e}")
        return "• Zusammenfassung konnte nicht erstellt werden"


async def extract_memory_updates(transcript: str) -> dict:
    """
    Extract structured facts and preferences for long-term memory.
    This enables personalized conversations over time.
    """
    prompt = f"""Extrahiere wichtige Fakten aus diesem Gespräch für das Langzeitgedächtnis.

Gespräch:
{transcript[:3000]}

Antworte NUR mit JSON in diesem Format:
{{
    "facts": ["Fakt 1", "Fakt 2"],
    "preferences": ["Vorliebe 1"],
    "important_people": ["Name: Beziehung"],
    "recent_topics": ["Thema 1", "Thema 2"],
    "health_notes": ["Allgemeine Notiz ohne Details"],
    "mood_indicator": "gut|mittel|schlecht"
}}

Regeln:
- Nur klare, verifizierte Fakten
- Keine Spekulationen
- Keine sensiblen medizinischen Details
- Leer lassen wenn nichts Relevantes

NUR JSON:"""

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=300
        )
        
        content = response.choices[0].message.content.strip()
        
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        
        return json.loads(content)
        
    except Exception as e:
        print(f"Memory extraction error: {e}")
        return {}


def merge_memory(existing: dict, new: dict) -> dict:
    """
    Merge new memory updates with existing memory state.
    Keeps lists deduplicated and limits size for GDPR data minimization.
    """
    result = existing.copy()
    
    for key in ["facts", "preferences", "important_people", "recent_topics", "health_notes"]:
        existing_list = result.get(key, [])
        new_list = new.get(key, [])
        
        # Combine and deduplicate
        combined = list(set(existing_list + new_list))
        
        # Limit size (data minimization)
        max_items = 20 if key == "facts" else 10
        result[key] = combined[-max_items:]
    
    # Update mood indicator
    if new.get("mood_indicator"):
        result["mood_indicator"] = new["mood_indicator"]
    
    return result

