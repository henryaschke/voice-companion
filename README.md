# EU Voice Companion - Theresa

Eine DSGVO-konforme Sprachbegleiter-Plattform für die Altenpflege. **Theresa** ist eine KI-gestützte digitale Begleiterin, die ältere Menschen durch natürliche Telefongespräche unterstützt.

## 🎯 Überblick

EU Voice Companion ermöglicht:
- **Eingehende Anrufe**: Registrierte Nutzer rufen eine Twilio-Nummer an und sprechen mit Theresa
- **Natürliche Konversation**: Streaming STT → LLM → Streaming TTS mit niedriger Latenz
- **Cross-Call Memory**: Theresa erinnert sich an frühere Gespräche (Fakten, Personen, Themen)
- **Post-Call Analytics**: Sentiment-Analyse, Zusammenfassungen, Memory-Extraktion
- **Drei Portale**: Familie (Senioren), Pflegeeinrichtung (Bewohner), Arzt (Patienten)

---

## 🏗️ Architektur

### Echtzeit-Sprachpipeline

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────────────────────────┐
│   Telefon   │────▶│    Twilio    │────▶│         Backend (FastAPI)           │
│  (Anrufer)  │◀────│ Media Stream │◀────│                                     │
└─────────────┘     └──────────────┘     │  ┌─────────┐  ┌─────┐  ┌─────────┐  │
                         │               │  │Deepgram │  │GPT- │  │Eleven-  │  │
                    WebSocket            │  │  STT    │──│ 4o  │──│ Labs    │  │
                    (bidirektional)      │  │         │  │     │  │  TTS    │  │
                         │               │  └─────────┘  └─────┘  └─────────┘  │
                         ▼               └─────────────────────────────────────┘
                    μ-law 8kHz                          │
                    Audio                               ▼
                                                   SQLite DB
                                              (Memory, Transcripts)
```

### Komponenten

| Komponente | Technologie | Beschreibung |
|------------|-------------|--------------|
| **Backend** | FastAPI + Uvicorn | Async Python API Server |
| **STT** | Deepgram Nova-2 | Streaming Speech-to-Text (Deutsch) |
| **LLM** | OpenAI GPT-4o | Streaming Reasoning & Konversation |
| **TTS** | ElevenLabs | Streaming Text-to-Speech (μ-law 8kHz) |
| **Telefonie** | Twilio Media Streams | Bidirektionale WebSocket Audio |
| **Frontend** | React + Vite + TypeScript + shadcn/ui + Tailwind | Dashboard & Management UI |
| **Datenbank** | SQLite + SQLAlchemy | Async ORM mit GDPR-Features |

---

## 📁 Projektstruktur

```
voice-companion/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI App, Lifespan, CORS
│   │   ├── config.py            # Pydantic Settings, Fernet Encryption
│   │   ├── database.py          # SQLAlchemy Async Engine + Migrations
│   │   ├── models.py            # ORM Models (Account, Person, Call, etc.)
│   │   ├── schemas.py           # Pydantic Request/Response Schemas
│   │   ├── crud.py              # Database CRUD Operations
│   │   ├── routers/
│   │   │   ├── auth.py            # Shared authentication utilities
│   │   │   ├── twilio_webhook.py  # Twilio Voice & Media Stream Handler
│   │   │   ├── people.py          # Person Management API
│   │   │   └── dashboard.py       # Dashboard Statistics API
│   │   └── services/
│   │       ├── realtime_gateway.py    # State Machine: LISTENING→THINKING→SPEAKING
│   │       ├── deepgram_stt.py        # Streaming STT Client
│   │       ├── openai_llm.py          # Streaming LLM with Memory Context
│   │       ├── elevenlabs_tts.py      # Streaming TTS Client (German pronunciation)
│   │       ├── audio_utils.py         # μ-law ↔ PCM Conversion
│   │       ├── post_call_processor.py # Sentiment, Summary, Memory Extraction
│   │       └── metrics.py             # Latency Tracking (STT/LLM/TTS)
│   ├── data/                    # SQLite database files
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/                    # React TypeScript App (Lovable-built)
│   ├── src/
│   │   ├── App.tsx              # React Router Setup
│   │   ├── api/                 # API Client functions
│   │   │   └── people.ts        # Create Senior/Patient API calls
│   │   ├── components/
│   │   │   ├── ui/              # shadcn/ui components
│   │   │   ├── dashboard/       # Dashboard widgets
│   │   │   ├── layout/          # App layout & sidebar
│   │   │   ├── careHome/        # Care home portal components
│   │   │   ├── doctor/          # Doctor portal components
│   │   │   └── settings/        # Settings components
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx    # Family portal dashboard
│   │   │   ├── AddUser.tsx      # Multi-step user creation form
│   │   │   ├── care/            # Care home portal pages
│   │   │   └── doctor/          # Doctor portal pages
│   │   ├── contexts/            # React context providers (Portal switching)
│   │   ├── hooks/               # Custom React hooks
│   │   ├── types/               # TypeScript type definitions
│   │   └── data/                # Mock data (for unintegrated features)
│   ├── Dockerfile
│   ├── tailwind.config.ts
│   └── package.json
├── docs/
│   └── frontend-endpoint-inventory.md  # API endpoint mapping
├── docker-compose.yml
├── env.example
└── README.md
```

---

## 🗄️ Datenbankschema

### Person Model (Erweitert)

```python
class Person:
    id: int
    account_id: int              # 1=Private, 2=Clinical
    kind: str                    # "senior" | "patient"
    display_name: str
    phone_e164: str              # UNIQUE, E.164 format
    language: str                # Default: "de"
    age: int | None              # Optional age
    personal_context_json: dict  # Interests, description, important people
    address_json: dict           # Street, postal code, city
    consent_recording: bool
    retention_days: int
    created_at: datetime
    updated_at: datetime | None
```

### Personal Context JSON Schema

```json
{
  "short_description": "Liebevolle 78-jährige Oma",
  "interests": "Stricken, Gartenarbeit, Kreuzworträtsel",
  "important_people": "Thomas (Sohn), Anna (Enkelin)",
  "preferred_topics": "Familie, Wetter, Nachrichten",
  "daily_routines": "Morgens Kaffee, nachmittags Spaziergang",
  "sensitivities": "Verstorbener Ehemann",
  "diagnoses": "Bluthochdruck",
  "medications": "Metoprolol 50mg",
  "allergies": "Penicillin"
}
```

### Address JSON Schema

```json
{
  "street_house_number": "Musterstraße 12",
  "postal_code": "12345",
  "city": "Berlin"
}
```

---

## 📊 API Endpoints

### People API (✅ Frontend integriert)

| Endpoint | Methode | Status | Beschreibung |
|----------|---------|--------|--------------|
| `/api/people/seniors` | GET | ✅ | Liste aller Senioren |
| `/api/people/seniors` | POST | ✅ | Senior anlegen (mit Profil) |
| `/api/people/patients` | GET | ✅ | Liste aller Patienten |
| `/api/people/patients` | POST | ✅ | Patient anlegen (mit Profil) |
| `/api/people/{id}` | GET | 🔜 | Person mit Stats |
| `/api/people/{id}` | PUT | 🔜 | Person aktualisieren |
| `/api/people/{id}` | DELETE | 🔜 | Person löschen |
| `/api/people/{id}/analytics` | GET | 🔜 | Detaillierte Analytics |

### Create Person Request Body

```json
{
  "display_name": "Erika Mustermann",
  "phone_e164": "0171 1234567",
  "age": 78,
  "language": "de",
  "personal_context": {
    "short_description": "Liebevolle Oma",
    "interests": "Stricken, Gartenarbeit"
  },
  "address": {
    "street_house_number": "Musterstraße 12",
    "postal_code": "12345",
    "city": "Berlin"
  }
}
```

**Phone Normalization:** German numbers (0171...) are automatically converted to E.164 (+49171...).

**Duplicate Check:** Returns `409 Conflict` if phone number already exists.

### Twilio Webhooks (Call Agent)

| Endpoint | Methode | Beschreibung |
|----------|---------|--------------|
| `/twilio/voice` | POST | Incoming Call Handler → TwiML |
| `/twilio/stream` | WebSocket | Bidirektionaler Media Stream |
| `/twilio/status` | POST | Call Status Callbacks |
| `/twilio/outbound/call` | POST | Ausgehenden Anruf starten |

### Dashboard API

| Endpoint | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/dashboard/private` | GET | Stats für Private Account |
| `/api/dashboard/clinical` | GET | Stats für Clinical Account |
| `/api/dashboard/settings/private` | GET | Einstellungen abrufen |
| `/api/dashboard/cleanup` | POST | Manueller Retention Cleanup |

---

## 🚀 Installation

### Voraussetzungen

- Docker & Docker Compose (oder Python 3.11+ und Node.js 20+)
- Twilio Account mit Telefonnummer
- OpenAI API Key
- Deepgram API Key
- ElevenLabs API Key

### 1. Repository klonen

```bash
git clone https://github.com/henryaschke/voice-companion.git
cd voice-companion
```

### 2. Environment konfigurieren

```bash
cp env.example .env
# .env bearbeiten und API Keys eintragen
```

**Erforderliche Variablen:**

```env
# OpenAI (GPT-4o für Reasoning)
OPENAI_API_KEY=sk-...

# Deepgram (Streaming STT)
DEEPGRAM_API_KEY=...

# ElevenLabs (Streaming TTS)
ELEVENLABS_API_KEY=sk_...
ELEVENLABS_VOICE_ID=yVKATr0ZJETwd3tQtpNG

# Twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_NUMBER_E164=+1234567890

# Server URL (für Twilio Webhooks)
BASE_URL=https://your-domain.com
```

### 3. Docker starten

```bash
docker compose up -d --build
```

**Services:**
- Backend: http://localhost:8000
- Frontend: http://localhost:3000

### 4. Twilio Webhook konfigurieren

In der Twilio Console:
1. Phone Numbers → Active Numbers → Nummer auswählen
2. Voice Configuration:
   - **Webhook URL**: `https://your-domain.com/twilio/voice`
   - **HTTP POST**
   - **Status Callback URL**: `https://your-domain.com/twilio/status`

---

## 🛠️ Lokale Entwicklung

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Läuft auf http://localhost:8080
```

**Frontend Environment:**
```bash
# frontend/.env
VITE_API_BASE_URL=http://localhost:8000
```

---

## 🎙️ Theresa - Die digitale Begleiterin

### Persönlichkeit

- **Ruhig & warm**: Klare, kurze Sätze
- **Empathisch**: Emotionale Intensität niedriger als der Nutzer
- **Kontext-bewusst**: Nutzt Langzeit-Memory und aktuelle Konversation
- **Grenzen-bewusst**: Gibt keine medizinischen Ratschläge
- **Deutsche Aussprache**: Namen und Zahlen werden auf Deutsch ausgesprochen

### Begrüßung

> "Hallo [Name]! Hier ist Theresa, deine persönliche Begleiterin. Schön, dass du anrufst. Wie geht es dir heute?"

---

## 🔒 GDPR / DSGVO Compliance

| Feature | Implementierung |
|---------|-----------------|
| **Consent** | `consent_recording` Flag pro Person |
| **Retention** | `retention_days` pro Person, automatischer Cleanup |
| **Encryption** | Fernet für Transcripts (`FERNET_KEY`) |
| **Data Minimization** | Memory JSON limitiert (max 20 facts) |
| **Access Control** | Nur registrierte Nummern können anrufen |
| **EU Hosting** | Twilio Region IE1, Server in EU |

---

## 📈 Features Roadmap

### ✅ Phase 1 - Call Agent
- Twilio Media Streams Integration
- Deepgram STT (Deutsch)
- OpenAI GPT-4o Streaming
- ElevenLabs TTS (Deutsche Aussprache)
- Barge-In Support
- Post-Call Analysis (Sentiment, Summary, Memory)

### ✅ Phase 2 - Create User
- Multi-Step Formular (6 Schritte)
- Personal Context speichern
- Adresse speichern
- Telefonnummer-Normalisierung
- Duplikat-Prüfung

### 🔜 Phase 3 - Full Integration
- Dashboard mit echten Daten
- Person Detail View
- Call History
- Analytics Dashboard

---

## 📄 Lizenz

MIT License

---

## 👥 Beitragende

- Entwickelt mit Unterstützung von Claude (Anthropic)

---

## 📞 Support

Bei Fragen oder Problemen: GitHub Issues erstellen.
