# EU Voice Companion 🇪🇺📞

Ein DSGVO-konformer **KI-gestützter Telefonbegleiter** für ältere Menschen und Patienten. Die Plattform ermöglicht natürliche Telefongespräche mit einem KI-Assistenten, der sich an frühere Gespräche erinnert und die emotionale Stimmung analysiert.

---

## Inhaltsverzeichnis

1. [Überblick](#überblick)
2. [Systemarchitektur](#systemarchitektur)
3. [Kommunikationsfluss im Detail](#kommunikationsfluss-im-detail)
4. [Backend-Dokumentation](#backend-dokumentation)
5. [API-Endpunkte im Detail](#api-endpunkte-im-detail)
6. [Datenmodell](#datenmodell)
7. [Frontend-Dokumentation](#frontend-dokumentation)
8. [DSGVO-Konformität](#dsgvo-konformität)
9. [Installation & Deployment](#installation--deployment)
10. [Konfiguration](#konfiguration)
11. [Troubleshooting](#troubleshooting)

---

## Überblick

### Was macht diese Anwendung?

EU Voice Companion ist eine Telefonplattform, die es ermöglicht:

1. **Eingehende Anrufe entgegenzunehmen** - Nutzer rufen eine Twilio-Telefonnummer an
2. **KI-Gespräche zu führen** - Ein KI-Assistent (OpenAI Realtime API) führt natürliche Gespräche auf Deutsch
3. **Gespräche zu transkribieren** - Echtzeit-Spracherkennung während des Gesprächs
4. **Stimmung zu analysieren** - Nach jedem Gespräch wird die emotionale Stimmung per LLM analysiert
5. **Langzeit-Gedächtnis zu pflegen** - Die KI erinnert sich an wichtige Fakten aus früheren Gesprächen
6. **Analytics bereitzustellen** - Dashboard mit Statistiken, Anrufverläufen und Stimmungstrends

### Zielgruppen

- **Privatbereich**: Betreuung von Senioren durch regelmäßige KI-Gespräche
- **Klinikbereich**: Monitoring von Patienten mit Stimmungsanalyse

### Technologie-Stack

| Komponente | Technologie |
|------------|-------------|
| Backend | Python 3.11, FastAPI, SQLAlchemy |
| Frontend | React 18, Vite, JavaScript |
| Datenbank | SQLite (MVP), PostgreSQL-ready |
| Telefonie | Twilio Voice + Media Streams |
| KI-Sprache | OpenAI Realtime API |
| KI-Analyse | OpenAI GPT-4o-mini |
| Reverse Proxy | Caddy (automatisches HTTPS) |
| Container | Docker + Docker Compose |

---

## Systemarchitektur

### Komponenten-Übersicht

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              INTERNET                                        │
└─────────────────────────────────────────────────────────────────────────────┘
         │                           │                            │
         │ HTTPS                     │ WSS                        │ HTTPS
         ▼                           ▼                            ▼
┌─────────────────┐      ┌─────────────────┐           ┌─────────────────┐
│   Web Browser   │      │     Twilio      │           │     OpenAI      │
│   (Frontend)    │      │  Voice/Streams  │           │  Realtime API   │
└────────┬────────┘      └────────┬────────┘           └────────┬────────┘
         │                        │                             │
         │                        │                             │
         ▼                        ▼                             │
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CADDY (Reverse Proxy)                          │
│                         Automatisches SSL/TLS                                │
│                    https://63-181-10-71.sslip.io                            │
└─────────────────────────────────────────────────────────────────────────────┘
         │                        │                             
         │ /api/*                 │ /twilio/*                   
         │ Port 3000              │ Port 8000                   
         ▼                        ▼                             
┌─────────────────┐      ┌─────────────────────────────────────┐
│    FRONTEND     │      │              BACKEND                 │
│   Vite + React  │      │    FastAPI + WebSocket Server        │
│   Port 3000     │      │           Port 8000                  │
└─────────────────┘      └──────────────────┬──────────────────┘
                                            │
                                            ▼
                                  ┌─────────────────┐
                                  │    SQLite DB    │
                                  │ voicecompanion  │
                                  │      .db        │
                                  └─────────────────┘
```

### Container-Struktur (Docker)

```
docker-compose.yml
├── backend (Port 8000)
│   ├── FastAPI Application
│   ├── WebSocket Server für Twilio Streams
│   ├── OpenAI Realtime API Client
│   └── SQLite Datenbank (/app/data/)
│
└── frontend (Port 3000)
    ├── Vite Dev Server
    └── React Application
```

---

## Kommunikationsfluss im Detail

### 1. Eingehender Anruf - Schritt für Schritt

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    PHASE 1: ANRUF-INITIIERUNG                            │
└──────────────────────────────────────────────────────────────────────────┘

Schritt 1: Nutzer wählt Twilio-Nummer
─────────────────────────────────────
    📞 Nutzer (+49170...) ──────► Twilio (+1 850 909 9752)
    
    - Nutzer wählt die Twilio-Telefonnummer
    - Twilio empfängt den Anruf und sucht nach konfigurierten Webhooks

Schritt 2: Twilio ruft unseren Voice Webhook
────────────────────────────────────────────
    Twilio ──HTTP POST──► https://63-181-10-71.sslip.io/twilio/voice
    
    Request Body (Form Data):
    {
        "CallSid": "CA...beispiel-call-sid...",           // Eindeutige Anruf-ID
        "From": "+49170XXXXXXX",                          // Anrufer-Nummer
        "To": "+1XXXXXXXXXX",                             // Twilio-Nummer
        "CallStatus": "ringing",
        "Direction": "inbound"
    }

Schritt 3: Backend verarbeitet Webhook
──────────────────────────────────────
    a) Anrufer identifizieren:
       - Suche in DB: SELECT * FROM people WHERE phone_e164 = '+49170XXXXXXX'
       - Wenn gefunden: Lade person_id, account_id, consent_recording
       - Wenn nicht gefunden: Behandle als unbekannten Anrufer
    
    b) Call-Record erstellen:
       - INSERT INTO calls (twilio_call_sid, from_e164, to_e164, status, ...)
       - Status: "in_progress"
       - started_at: aktuelle Zeit

Schritt 4: TwiML-Antwort generieren
───────────────────────────────────
    Backend ──HTTP 200──► Twilio
    
    Response (XML - TwiML):
    <?xml version="1.0" encoding="UTF-8"?>
    <Response>
        <Connect>
            <Stream 
                name="voice-companion-stream" 
                url="wss://your-domain.sslip.io/twilio/stream?call_sid=CAxxxxxx..."
            />
        </Connect>
    </Response>
    
    Diese TwiML-Antwort sagt Twilio:
    - Verbinde den Anruf mit unserem WebSocket-Server
    - Streame Audio bidirektional (wir empfangen UND senden Audio)


┌──────────────────────────────────────────────────────────────────────────┐
│                    PHASE 2: WEBSOCKET-VERBINDUNG                         │
└──────────────────────────────────────────────────────────────────────────┘

Schritt 5: Twilio öffnet WebSocket
──────────────────────────────────
    Twilio ──WSS──► wss://63-181-10-71.sslip.io/twilio/stream?call_sid=CA52...
    
    - Twilio initiiert WebSocket-Verbindung
    - Caddy leitet an Backend Port 8000 weiter
    - Backend akzeptiert die Verbindung

Schritt 6: Twilio sendet "connected" Event
──────────────────────────────────────────
    Twilio ──WS Message──► Backend
    
    {
        "event": "connected",
        "protocol": "Call",
        "version": "1.0.0"
    }

Schritt 7: Twilio sendet "start" Event
──────────────────────────────────────
    Twilio ──WS Message──► Backend
    
    {
        "event": "start",
        "sequenceNumber": "1",
        "start": {
            "streamSid": "MZxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
            "accountSid": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
            "callSid": "CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
            "tracks": ["inbound", "outbound"],
            "mediaFormat": {
                "encoding": "audio/x-mulaw",  // μ-law Audio-Format
                "sampleRate": 8000,           // 8kHz
                "channels": 1                 // Mono
            }
        }
    }
    
    - streamSid: Eindeutige ID für diesen Audio-Stream
    - mediaFormat: Twilio verwendet μ-law (G.711) bei 8kHz


┌──────────────────────────────────────────────────────────────────────────┐
│                    PHASE 3: OPENAI REALTIME VERBINDUNG                   │
└──────────────────────────────────────────────────────────────────────────┘

Schritt 8: Backend verbindet zu OpenAI Realtime API
────────────────────────────────────────────────────
    Backend ──WSS──► wss://api.openai.com/v1/realtime?model=gpt-realtime-mini-2025-12-15
    
    Headers:
    {
        "Authorization": "Bearer sk-...",
        "OpenAI-Beta": "realtime=v1"
    }

Schritt 9: OpenAI Session konfigurieren
───────────────────────────────────────
    Backend ──WS Message──► OpenAI
    
    {
        "type": "session.update",
        "session": {
            "modalities": ["text", "audio"],
            "instructions": "Du bist ein freundlicher digitaler Begleiter...",
            "voice": "alloy",                    // Stimme: alloy, echo, shimmer
            "input_audio_format": "g711_ulaw",   // Twilio-kompatibel
            "output_audio_format": "g711_ulaw",  // Twilio-kompatibel
            "input_audio_transcription": {
                "model": "whisper-1"             // Für Transkription
            },
            "turn_detection": {
                "type": "server_vad",            // Server-seitige Spracherkennung
                "threshold": 0.5,
                "prefix_padding_ms": 300,
                "silence_duration_ms": 500
            },
            "temperature": 0.7,
            "max_response_output_tokens": 150
        }
    }

Schritt 10: OpenAI bestätigt Session
────────────────────────────────────
    OpenAI ──WS Message──► Backend
    
    {
        "type": "session.created",
        "session": {
            "id": "sess_...",
            "voice": "alloy",
            "modalities": ["audio", "text"],
            ...
        }
    }


┌──────────────────────────────────────────────────────────────────────────┐
│                    PHASE 4: INITIALE BEGRÜSSUNG                          │
└──────────────────────────────────────────────────────────────────────────┘

Schritt 11: Backend sendet Begrüßungs-Prompt
────────────────────────────────────────────
    Backend ──WS Message──► OpenAI
    
    {
        "type": "conversation.item.create",
        "item": {
            "type": "message",
            "role": "user",
            "content": [{
                "type": "input_text",
                "text": "[Anruf gestartet - begrüße den Anrufer freundlich auf Deutsch]"
            }]
        }
    }
    
    {
        "type": "response.create"
    }

Schritt 12: OpenAI generiert Audio-Antwort
──────────────────────────────────────────
    OpenAI ──WS Messages──► Backend
    
    Mehrere "response.audio.delta" Events mit Base64-encoded Audio:
    {
        "type": "response.audio.delta",
        "delta": "//uQxAAAAAANIAAAAAExBTUUzLjEw..."  // Base64 μ-law Audio
    }
    
    Am Ende:
    {
        "type": "response.done",
        "response": {
            "status": "completed",
            "output": [...]
        }
    }

Schritt 13: Backend leitet Audio an Twilio
──────────────────────────────────────────
    Backend ──WS Message──► Twilio
    
    {
        "event": "media",
        "streamSid": "MZxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "media": {
            "payload": "//uQxAAAAAANIAAAAAExBTUUzLjEw..."  // Base64 Audio
        }
    }
    
    - Twilio empfängt das Audio und spielt es dem Anrufer vor
    - Der Anrufer hört: "Hallo! Schön dass Sie anrufen. Wie geht es Ihnen heute?"


┌──────────────────────────────────────────────────────────────────────────┐
│                    PHASE 5: ECHTZEIT-GESPRÄCH                            │
└──────────────────────────────────────────────────────────────────────────┘

Ab jetzt läuft die Kommunikation in einer Schleife:

    ┌─────────┐          ┌─────────┐          ┌─────────┐
    │ Anrufer │◄────────►│ Twilio  │◄────────►│ Backend │◄────────►│ OpenAI │
    └─────────┘          └─────────┘          └─────────┘          └────────┘
    
    1. Anrufer spricht ──► Twilio captured Audio
    2. Twilio ──media event──► Backend (Base64 Audio-Chunks, ~20ms)
    3. Backend ──input_audio_buffer.append──► OpenAI
    4. OpenAI's VAD erkennt Ende der Sprache
    5. OpenAI transkribiert + generiert Antwort
    6. OpenAI ──response.audio.delta──► Backend (Audio-Chunks)
    7. Backend ──media event──► Twilio
    8. Twilio spielt Audio ──► Anrufer hört Antwort
    
    Dieser Zyklus wiederholt sich für jede Gesprächsrunde.

Audio-Format-Details:
─────────────────────
    - Format: G.711 μ-law (auch "PCMU" genannt)
    - Sample Rate: 8000 Hz
    - Bit Depth: 8-bit
    - Channels: 1 (Mono)
    - Chunk-Größe: ~20ms Audio pro WebSocket-Nachricht
    - Encoding: Base64
    
    Warum μ-law?
    - Standard für Telefonie
    - Gute Kompression für Sprache
    - Von Twilio und OpenAI Realtime nativ unterstützt


┌──────────────────────────────────────────────────────────────────────────┐
│                    PHASE 6: ANRUF-BEENDIGUNG                             │
└──────────────────────────────────────────────────────────────────────────┘

Schritt X: Anrufer legt auf
───────────────────────────
    Twilio ──WS Message──► Backend
    
    {
        "event": "stop",
        "sequenceNumber": "999",
        "stop": {
            "accountSid": "AC...",
            "callSid": "CA..."
        }
    }

Schritt X+1: WebSocket wird geschlossen
───────────────────────────────────────
    - Backend trennt Verbindung zu OpenAI
    - Backend sammelt vollständiges Transkript
    - WebSocket zu Twilio wird geschlossen

Schritt X+2: Twilio Status Callback
───────────────────────────────────
    Twilio ──HTTP POST──► https://.../twilio/status
    
    {
        "CallSid": "CA...",
        "CallStatus": "completed",
        "CallDuration": "127"  // Sekunden
    }
    
    Backend:
    - UPDATE calls SET status='completed', duration_sec=127, ended_at=NOW()


┌──────────────────────────────────────────────────────────────────────────┐
│                    PHASE 7: POST-CALL PROCESSING                         │
└──────────────────────────────────────────────────────────────────────────┘

Nach dem Anruf führt das Backend asynchron folgende Schritte aus:

1. Transkript speichern (falls Einwilligung)
───────────────────────────────────────────
    - Prüfe: person.consent_recording == True?
    - Wenn ja: Verschlüssele mit Fernet (falls FERNET_KEY gesetzt)
    - INSERT INTO transcripts (call_id, text, is_encrypted)

2. LLM Sentiment-Analyse
────────────────────────
    Prompt an GPT-4o-mini:
    "Analysiere die Stimmung dieses Gesprächs...
    Gespräch: [Transkript]
    Antworte mit JSON: {sentiment_label, sentiment_score, ...}"
    
    Ergebnis:
    {
        "sentiment_label": "positiv",
        "sentiment_score": 0.7,
        "confidence": 0.85,
        "reason_short_de": "Der Anrufer klang fröhlich und sprach über positive Erlebnisse."
    }

3. Zusammenfassung generieren
─────────────────────────────
    Prompt: "Erstelle eine Zusammenfassung (max 8 Stichpunkte)..."
    
    Ergebnis:
    • Der Anrufer berichtete von einem Arztbesuch
    • Er erwähnte seine Enkelin Lisa
    • Stimmung war insgesamt positiv
    ...

4. Memory-Updates extrahieren
─────────────────────────────
    Prompt: "Extrahiere wichtige Fakten für das Langzeitgedächtnis..."
    
    Ergebnis:
    {
        "facts": ["Hat eine Enkelin namens Lisa"],
        "preferences": ["Mag klassische Musik"],
        "important_people": ["Lisa: Enkelin"],
        "recent_topics": ["Arztbesuch", "Garten"],
        "mood_indicator": "gut"
    }

5. Datenbank-Updates
────────────────────
    INSERT INTO call_analysis (call_id, sentiment_label, sentiment_score, summary_de, ...)
    UPDATE memory_state SET memory_json = {...} WHERE person_id = ...
```

---

## Backend-Dokumentation

### Verzeichnisstruktur

```
backend/
├── app/
│   ├── __init__.py           # Package-Initialisierung
│   ├── main.py               # FastAPI Application Entry Point
│   ├── config.py             # Konfiguration + Environment Variables
│   ├── database.py           # SQLAlchemy Setup + Session Management
│   ├── models.py             # Datenbank-Modelle (ORM)
│   ├── schemas.py            # Pydantic Schemas (Request/Response)
│   ├── crud.py               # Database Operations (Create, Read, Update, Delete)
│   │
│   ├── routers/              # API-Endpunkte
│   │   ├── __init__.py
│   │   ├── people.py         # /api/people/* Endpunkte
│   │   ├── dashboard.py      # /api/dashboard/* Endpunkte
│   │   └── twilio_webhook.py # /twilio/* Endpunkte + WebSocket
│   │
│   └── services/             # Business Logic
│       ├── __init__.py
│       ├── realtime_agent.py      # OpenAI Realtime API Client
│       └── post_call_processor.py # Nachbearbeitung (Sentiment, Summary)
│
├── data/                     # SQLite Datenbank (gemountet)
├── requirements.txt          # Python Dependencies
└── Dockerfile               # Container-Definition
```

### Kern-Module im Detail

#### `config.py` - Konfiguration

```python
class Settings(BaseSettings):
    # Datenbank
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/voicecompanion.db"
    
    # OpenAI
    OPENAI_API_KEY: str = ""
    
    # Twilio
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_NUMBER_E164: str = ""
    
    # Sicherheit
    ADMIN_TOKEN: str = "dev-admin-token"
    FERNET_KEY: Optional[str] = None  # Für Verschlüsselung
    
    # URLs
    BASE_URL: str = "http://localhost:8000"
```

**Verschlüsselungs-Funktionen:**
- `encrypt_text(text)` - Verschlüsselt Text mit Fernet
- `decrypt_text(text)` - Entschlüsselt Text

#### `database.py` - Datenbankverbindung

```python
# Async SQLAlchemy Engine
engine = create_async_engine(DATABASE_URL)

# Session Factory
async_session_maker = async_sessionmaker(engine)

# Dependency für FastAPI
async def get_db():
    async with async_session_maker() as session:
        yield session

# Initialisierung beim Start
async def init_db():
    # Erstelle alle Tabellen
    # Erstelle Default-Accounts (Private + Clinical)
```

#### `models.py` - Datenbank-Modelle

Siehe [Datenmodell](#datenmodell) für Details.

#### `crud.py` - Datenbankoperationen

Alle Datenbankoperationen mit **Tenant-Isolation** (account_id Filter):

```python
# Personen
async def get_person(db, person_id, account_id=None)
async def get_person_by_phone(db, phone_e164)
async def get_people(db, account_id, kind=None)
async def create_person(db, person_data)
async def update_person(db, person_id, updates)
async def delete_person(db, person_id)

# Anrufe
async def get_call(db, call_id)
async def get_call_by_sid(db, twilio_call_sid)
async def create_call(db, call_data)
async def update_call(db, call_id, updates)

# Transkripte (mit Verschlüsselung)
async def create_transcript(db, call_id, text, encrypt=True)
async def get_transcript(db, call_id)  # Entschlüsselt automatisch

# Analyse
async def create_analysis(db, analysis_data)
async def get_analysis(db, call_id)

# Memory
async def get_memory_state(db, person_id)
async def update_memory_state(db, person_id, memory_json)

# Statistiken
async def get_account_stats(db, account_id)
async def get_person_stats(db, person_id)

# Cleanup (DSGVO)
async def cleanup_expired_data(db)
```

---

## API-Endpunkte im Detail

### Übersicht aller Endpunkte

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| GET | `/` | Health Check |
| GET | `/health` | Health Check |
| **Dashboard** |
| GET | `/api/dashboard/private` | Stats für Privatbereich |
| GET | `/api/dashboard/clinical` | Stats für Klinikbereich |
| GET | `/api/dashboard/settings/private` | Einstellungen |
| POST | `/api/dashboard/cleanup` | Manuelle Datenbereinigung |
| **Personen** |
| GET | `/api/people/seniors` | Liste aller Senioren |
| GET | `/api/people/patients` | Liste aller Patienten |
| POST | `/api/people/seniors` | Senior anlegen |
| POST | `/api/people/patients` | Patient anlegen |
| GET | `/api/people/{id}` | Person Details |
| GET | `/api/people/{id}/analytics` | Person Analytics |
| PUT | `/api/people/{id}` | Person aktualisieren |
| DELETE | `/api/people/{id}` | Person löschen |
| **Twilio** |
| POST | `/twilio/voice` | Voice Webhook (TwiML) |
| WS | `/twilio/stream` | Media Stream WebSocket |
| POST | `/twilio/status` | Status Callback |
| POST | `/twilio/outbound/call` | Ausgehender Anruf |

---

### Dashboard-Endpunkte

#### `GET /api/dashboard/private`

**Beschreibung:** Liefert Statistiken für den Privatbereich (Senioren).

**Response:**
```json
{
    "total_people": 5,
    "total_calls": 47,
    "calls_this_week": 12,
    "avg_duration_sec": 185.5,
    "avg_sentiment_score": 0.42,
    "sentiment_trend": [
        {"date": "2024-12-24T00:00:00", "score": 0.3},
        {"date": "2024-12-25T00:00:00", "score": 0.5},
        {"date": "2024-12-26T00:00:00", "score": 0.6},
        ...
    ]
}
```

**Berechnung:**
- `total_people`: COUNT(*) FROM people WHERE account_id = 1
- `calls_this_week`: COUNT(*) FROM calls WHERE created_at >= 7 Tage zurück
- `avg_sentiment_score`: AVG(sentiment_score) aus call_analysis
- `sentiment_trend`: Durchschnitt pro Tag der letzten 7 Tage

---

#### `GET /api/dashboard/clinical`

**Beschreibung:** Identisch zu `/private`, aber für account_id = 2 (Klinik).

---

#### `POST /api/dashboard/cleanup`

**Beschreibung:** Führt DSGVO-Datenbereinigung durch.

**Logik:**
```python
für jede Person:
    retention_cutoff = heute - person.retention_days
    für jeden Anruf älter als retention_cutoff:
        lösche Transkript
        lösche Analyse
```

**Response:**
```json
{
    "message": "Bereinigung abgeschlossen",
    "deleted_transcripts": 3,
    "deleted_analyses": 3
}
```

---

### Personen-Endpunkte

#### `GET /api/people/seniors`

**Beschreibung:** Liste aller Senioren mit Statistiken.

**Response:**
```json
[
    {
        "id": 1,
        "account_id": 1,
        "kind": "senior",
        "display_name": "Maria Schmidt",
        "phone_e164": "+49170XXXXXXXX",
        "language": "de",
        "consent_recording": true,
        "retention_days": 30,
        "created_at": "2024-12-20T10:00:00",
        "total_calls": 12,
        "calls_this_week": 3,
        "avg_duration_sec": 240.5,
        "last_call_at": "2024-12-30T14:30:00",
        "avg_sentiment_score": 0.65
    },
    ...
]
```

---

#### `POST /api/people/seniors`

**Beschreibung:** Neuen Senior anlegen.

**Request Body:**
```json
{
    "display_name": "Hans Müller",
    "phone_e164": "+49170XXXXXXXX",
    "language": "de",
    "consent_recording": true,
    "retention_days": 30
}
```

**Validierung:**
- `phone_e164`: Muss mit + beginnen, E.164 Format
- `retention_days`: 1-365

**Response:** Das erstellte Person-Objekt.

---

#### `GET /api/people/{id}/analytics`

**Beschreibung:** Detaillierte Analytics für eine Person.

**Response:**
```json
{
    "person": { ... },
    "calls": [
        {
            "id": 47,
            "direction": "inbound",
            "twilio_call_sid": "CA...",
            "from_e164": "+49170...",
            "to_e164": "+1850...",
            "started_at": "2024-12-30T14:30:00",
            "ended_at": "2024-12-30T14:35:00",
            "duration_sec": 300,
            "status": "completed",
            "transcript_text": "Anrufer: Hallo...\nBegleiter: Guten Tag...",
            "sentiment_label": "positiv",
            "sentiment_score": 0.7,
            "sentiment_confidence": 0.85,
            "sentiment_reason": "Freundliche Konversation",
            "summary_de": "• Gespräch über Alltag\n• Erwähnte Arztbesuch"
        },
        ...
    ],
    "total_calls": 12,
    "avg_duration_sec": 240.5,
    "avg_sentiment_score": 0.65,
    "sentiment_history": [
        {"date": "2024-12-28T14:30:00", "score": 0.5, "label": "neutral"},
        {"date": "2024-12-30T14:30:00", "score": 0.7, "label": "positiv"}
    ],
    "memory_state": {
        "facts": ["Hat Enkelin Lisa", "Lebt alleine"],
        "preferences": ["Mag klassische Musik"],
        "important_people": ["Lisa: Enkelin", "Dr. Weber: Hausarzt"],
        "recent_topics": ["Arztbesuch", "Garten"]
    }
}
```

---

### Twilio-Endpunkte

#### `POST /twilio/voice`

**Beschreibung:** Webhook für eingehende Anrufe. Twilio ruft diesen Endpunkt auf, wenn jemand die Twilio-Nummer anruft.

**Request (Form Data von Twilio):**
```
CallSid=CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
From=+49170XXXXXXXX
To=+18509099752
CallStatus=ringing
Direction=inbound
AccountSid=AC...
```

**Verarbeitung:**
1. Anrufer identifizieren (Suche nach Telefonnummer)
2. Call-Record in DB erstellen
3. TwiML generieren für Media Stream

**Response (TwiML XML):**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Connect>
        <Stream 
            name="voice-companion-stream" 
            url="wss://your-domain.sslip.io/twilio/stream?call_sid=CAxxxxxx..."
        />
    </Connect>
</Response>
```

**TwiML erklärt:**
- `<Response>`: Root-Element für TwiML
- `<Connect>`: Verbindet Anruf mit externem System
- `<Stream>`: Startet bidirektionalen Audio-Stream zu WebSocket-URL

---

#### `WS /twilio/stream`

**Beschreibung:** WebSocket-Endpunkt für Twilio Media Streams.

**Query Parameter:**
- `call_sid`: Twilio Call SID (zur Identifikation)

**Eingehende Events von Twilio:**

1. **connected** - Verbindung hergestellt
```json
{"event": "connected", "protocol": "Call", "version": "1.0.0"}
```

2. **start** - Stream gestartet
```json
{
    "event": "start",
    "streamSid": "MZ...",
    "start": {
        "callSid": "CA...",
        "mediaFormat": {"encoding": "audio/x-mulaw", "sampleRate": 8000}
    }
}
```

3. **media** - Audio-Daten (alle ~20ms)
```json
{
    "event": "media",
    "media": {
        "track": "inbound",
        "payload": "//uQxAAAAAANIAAAAAExBTUUzLjEw..."  // Base64 μ-law Audio
    }
}
```

4. **stop** - Stream beendet
```json
{"event": "stop"}
```

**Ausgehende Events an Twilio:**

```json
{
    "event": "media",
    "streamSid": "MZ...",
    "media": {
        "payload": "//uQxAAAAAANIAAAAAExBTUUzLjEw..."  // Base64 Audio von OpenAI
    }
}
```

---

#### `POST /twilio/status`

**Beschreibung:** Callback für Anruf-Status-Updates.

**Request (Form Data):**
```
CallSid=CA...
CallStatus=completed
CallDuration=127
```

**Mögliche Status:**
- `initiated` - Anruf gestartet
- `ringing` - Telefon klingelt
- `in-progress` - Verbunden
- `completed` - Beendet
- `failed` - Fehlgeschlagen
- `no-answer` - Keine Antwort

---

#### `POST /twilio/outbound/call`

**Beschreibung:** Startet einen ausgehenden Anruf zu einer Person.

**Query Parameter:**
- `person_id`: ID der Person die angerufen werden soll

**Response:**
```json
{
    "message": "Anruf gestartet",
    "call_id": 48,
    "twilio_sid": "CA..."
}
```

**Fehler:**
```json
{"error": "Person nicht gefunden"}
{"error": "Twilio nicht konfiguriert"}
```

---

## Datenmodell

### Entity-Relationship Diagramm

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   accounts  │       │   people    │       │    calls    │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │──────<│ id (PK)     │──────<│ id (PK)     │
│ type        │       │ account_id  │       │ account_id  │
│ name        │       │ kind        │       │ person_id   │
│ created_at  │       │ display_name│       │ direction   │
└─────────────┘       │ phone_e164  │       │ twilio_sid  │
                      │ language    │       │ from_e164   │
                      │ consent_rec │       │ to_e164     │
                      │ retention   │       │ started_at  │
                      │ created_at  │       │ ended_at    │
                      └──────┬──────┘       │ duration    │
                             │              │ status      │
                             │              │ created_at  │
                             ▼              └──────┬──────┘
                      ┌─────────────┐              │
                      │memory_state │              │
                      ├─────────────┤              ▼
                      │ id (PK)     │       ┌─────────────┐
                      │ person_id   │       │ transcripts │
                      │ memory_json │       ├─────────────┤
                      │ updated_at  │       │ id (PK)     │
                      └─────────────┘       │ call_id     │
                                            │ text        │
                                            │ is_encrypted│
                                            │ created_at  │
                                            └──────┬──────┘
                                                   │
                                            ┌──────┴──────┐
                                            │call_analysis│
                                            ├─────────────┤
                                            │ id (PK)     │
                                            │ call_id     │
                                            │ sentiment_* │
                                            │ summary_de  │
                                            │ memory_json │
                                            │ created_at  │
                                            └─────────────┘
```

### Tabellen-Definitionen

#### `accounts`
```sql
CREATE TABLE accounts (
    id INTEGER PRIMARY KEY,
    type VARCHAR(20) DEFAULT 'private',  -- 'private' | 'clinical'
    name VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Default-Einträge:
INSERT INTO accounts (id, type, name) VALUES 
    (1, 'private', 'Standard Privatkonto'),
    (2, 'clinical', 'Standard Klinikkonto');
```

#### `people`
```sql
CREATE TABLE people (
    id INTEGER PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id),
    kind VARCHAR(20) DEFAULT 'senior',   -- 'senior' | 'patient'
    display_name VARCHAR(255) NOT NULL,
    phone_e164 VARCHAR(20) NOT NULL,     -- z.B. '+49170XXXXXXXX'
    language VARCHAR(10) DEFAULT 'de',
    consent_recording BOOLEAN DEFAULT FALSE,
    retention_days INTEGER DEFAULT 30,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_phone (phone_e164),
    INDEX idx_account (account_id)
);
```

#### `calls`
```sql
CREATE TABLE calls (
    id INTEGER PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id),
    person_id INTEGER REFERENCES people(id) NULL,
    direction VARCHAR(20) DEFAULT 'inbound',  -- 'inbound' | 'outbound'
    twilio_call_sid VARCHAR(100) UNIQUE,
    from_e164 VARCHAR(20),
    to_e164 VARCHAR(20),
    started_at DATETIME NULL,
    ended_at DATETIME NULL,
    duration_sec INTEGER NULL,
    status VARCHAR(20) DEFAULT 'initiated',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_twilio_sid (twilio_call_sid),
    INDEX idx_person (person_id),
    INDEX idx_account (account_id)
);
```

#### `transcripts`
```sql
CREATE TABLE transcripts (
    id INTEGER PRIMARY KEY,
    call_id INTEGER UNIQUE REFERENCES calls(id),
    text TEXT,                              -- Kann verschlüsselt sein
    is_encrypted BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### `call_analysis`
```sql
CREATE TABLE call_analysis (
    id INTEGER PRIMARY KEY,
    call_id INTEGER UNIQUE REFERENCES calls(id),
    sentiment_label VARCHAR(20),    -- 'positiv' | 'neutral' | 'negativ'
    sentiment_score FLOAT,          -- -1.0 bis 1.0
    sentiment_confidence FLOAT,     -- 0.0 bis 1.0
    sentiment_reason VARCHAR(500),  -- Kurze deutsche Erklärung
    summary_de TEXT,                -- Zusammenfassung (max 8 Stichpunkte)
    memory_update_json JSON,        -- Extrahierte Fakten
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### `memory_state`
```sql
CREATE TABLE memory_state (
    id INTEGER PRIMARY KEY,
    person_id INTEGER UNIQUE REFERENCES people(id),
    memory_json JSON DEFAULT '{}',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Beispiel memory_json:
{
    "facts": ["Lebt alleine", "Hat Hund namens Bello"],
    "preferences": ["Mag klassische Musik", "Trinkt gerne Kaffee"],
    "important_people": ["Lisa: Enkelin", "Dr. Weber: Hausarzt"],
    "recent_topics": ["Arztbesuch letzte Woche", "Geburtstag der Enkelin"],
    "health_notes": ["Erwähnte Rückenschmerzen"],
    "mood_indicator": "gut"
}
```

---

## Frontend-Dokumentation

### Struktur

```
frontend/
├── src/
│   ├── main.jsx          # React Entry Point
│   ├── App.jsx           # Router Setup
│   ├── api.js            # API Client
│   ├── index.css         # Globale Styles
│   │
│   ├── components/
│   │   ├── Layout.jsx    # Sidebar + Navigation
│   │   └── Layout.css
│   │
│   └── pages/
│       ├── privat/       # Privatbereich
│       │   ├── Dashboard.jsx
│       │   ├── Personen.jsx
│       │   ├── PersonDetail.jsx
│       │   └── Einstellungen.jsx
│       │
│       └── klinik/       # Klinikbereich
│           ├── Overview.jsx
│           ├── Patienten.jsx
│           └── PatientDetail.jsx
│
├── package.json
├── vite.config.js
└── Dockerfile
```

### Routen

| Route | Komponente | Beschreibung |
|-------|------------|--------------|
| `/` | Redirect | → `/privat/dashboard` |
| `/privat/dashboard` | Dashboard | Übersicht mit KPIs |
| `/privat/personen` | Personen | Senioren-Liste + CRUD |
| `/privat/personen/:id` | PersonDetail | Detail + Anrufverlauf |
| `/privat/einstellungen` | Einstellungen | DSGVO-Settings |
| `/klinik` | Overview | Klinik-Übersicht |
| `/klinik/patienten` | Patienten | Patienten-Liste + CRUD |
| `/klinik/patienten/:id` | PatientDetail | Patient Analytics |

### API Client (`api.js`)

```javascript
const API_BASE = ''  // Leer = relative URLs über Caddy

async function fetchAPI(endpoint, options = {}) {
    const response = await fetch(API_BASE + endpoint, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    })
    return response.json()
}

// Beispiel-Funktionen:
export async function getSeniors() {
    return fetchAPI('/api/people/seniors')
}

export async function createSenior(data) {
    return fetchAPI('/api/people/seniors', {
        method: 'POST',
        body: JSON.stringify(data)
    })
}
```

---

## DSGVO-Konformität

### Implementierte Maßnahmen

| Anforderung | Implementierung |
|-------------|-----------------|
| **EU-Hosting** | Deployment auf AWS Frankfurt (eu-central-1) |
| **Einwilligung** | `consent_recording` pro Person |
| **Datenminimierung** | Zusammenfassungen statt Roh-Transkripte als Kontext |
| **Aufbewahrungsfrist** | `retention_days` pro Person, automatische Löschung |
| **Verschlüsselung** | Fernet-Verschlüsselung für Transkripte |
| **Tenant-Isolation** | `account_id` Filter auf allen Queries |
| **Kein Training** | `NO_TRAINING_USE` Flag, keine Logs an Dritte |

### Twilio EU-Region

```
Twilio Console → Phone Numbers → Nummer auswählen → Region: Ireland (IE1)
```

### Ohne Einwilligung

Wenn `consent_recording = false`:
- Anruf-Metadaten werden gespeichert (für Analytics)
- Transkript wird NICHT gespeichert
- Analyse wird durchgeführt aber nicht persistiert

---

## Installation & Deployment

### Voraussetzungen

- AWS Lightsail Instance (Ubuntu 22.04, mind. 2GB RAM)
- Domain oder sslip.io
- Twilio Account mit Telefonnummer
- OpenAI Account mit Realtime API Zugang

### Quick Deploy

```bash
# 1. System vorbereiten
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
sudo apt install -y docker-compose git

# 2. Repository klonen
git clone https://github.com/henryaschke/voice-companion.git
cd voice-companion

# 3. Environment konfigurieren
cat > .env << 'EOF'
OPENAI_API_KEY=sk-...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_NUMBER_E164=+1...
ADMIN_TOKEN=sicheres-token
BASE_URL=https://deine-domain.sslip.io
EOF

# 4. Starten
sudo docker-compose up -d --build

# 5. Caddy für HTTPS
sudo apt install caddy -y
sudo tee /etc/caddy/Caddyfile << 'EOF'
deine-domain.sslip.io {
    handle /api/* { reverse_proxy localhost:8000 }
    handle /twilio/* { reverse_proxy localhost:8000 }
    handle /health { reverse_proxy localhost:8000 }
    handle { reverse_proxy localhost:3000 }
}
EOF
sudo systemctl restart caddy
```

---

## Konfiguration

### Environment Variables

| Variable | Beschreibung | Erforderlich |
|----------|--------------|--------------|
| `OPENAI_API_KEY` | OpenAI API Key mit Realtime Zugang | ✅ |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | ✅ |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | ✅ |
| `TWILIO_NUMBER_E164` | Twilio Telefonnummer | ✅ |
| `BASE_URL` | Öffentliche HTTPS URL | ✅ |
| `ADMIN_TOKEN` | Einfacher API-Schutz | Optional |
| `FERNET_KEY` | Verschlüsselungskey | Empfohlen |
| `DATABASE_URL` | SQLite/PostgreSQL URL | Optional |

### Fernet Key generieren

```python
from cryptography.fernet import Fernet
print(Fernet.generate_key().decode())
```

### Twilio Webhook-Konfiguration

1. Twilio Console → Phone Numbers → Active Numbers
2. Nummer auswählen
3. Voice Configuration:
   - A call comes in: Webhook, POST, `https://domain/twilio/voice`
   - Status callback: `https://domain/twilio/status`

---

## Troubleshooting

### Problem: Anruf wird sofort beendet

**Ursache:** WebSocket-Verbindung schlägt fehl

**Lösung:**
```bash
# Logs prüfen
sudo docker-compose logs -f backend

# Caddy prüfen
sudo systemctl status caddy
```

### Problem: "insufficient_quota" Fehler

**Ursache:** OpenAI Account hat kein Guthaben

**Lösung:**
1. [platform.openai.com/billing](https://platform.openai.com/billing)
2. Guthaben aufladen ($5-10 für Tests)

### Problem: "model_not_found" Fehler

**Ursache:** Falscher Model-Name oder kein Realtime API Zugang

**Lösung:**
- Model prüfen: `gpt-realtime-mini-2025-12-15`
- Realtime API Zugang im OpenAI Dashboard prüfen

### Problem: Frontend zeigt "Failed to fetch"

**Ursache:** API-Calls gehen an falsche URL

**Lösung:**
- `VITE_API_BASE_URL` entfernen (leer lassen für relative URLs)
- Caddy-Konfiguration prüfen

---

## Lizenz

Proprietär - nur für autorisierte Nutzung.

---

## Kontakt

Für Fragen und Support: [Repository Issues](https://github.com/henryaschke/voice-companion/issues)
