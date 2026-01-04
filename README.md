# EU Voice Companion - Viola

Eine DSGVO-konforme Sprachbegleiter-Plattform für die Altenpflege. **Viola** ist eine KI-gestützte digitale Begleiterin, die ältere Menschen durch natürliche Telefongespräche unterstützt.

## 🎯 Überblick

EU Voice Companion ermöglicht:
- **Eingehende Anrufe**: Registrierte Nutzer rufen eine Twilio-Nummer an und sprechen mit Viola
- **Natürliche Konversation**: Streaming STT → LLM → Streaming TTS mit niedriger Latenz
- **Cross-Call Memory**: Viola erinnert sich an frühere Gespräche (Fakten, Personen, Themen)
- **Post-Call Analytics**: Sentiment-Analyse, Zusammenfassungen, Memory-Extraktion
- **Zwei Portale**: Private (Senioren) und Klinisch (Patienten)

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
| **Frontend** | React + Vite | Dashboard & Management UI (Deutsch) |
| **Datenbank** | SQLite + SQLAlchemy | Async ORM mit GDPR-Features |

---

## 📁 Projektstruktur

```
voice-companion/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI App, Lifespan, CORS
│   │   ├── config.py            # Pydantic Settings, Fernet Encryption
│   │   ├── database.py          # SQLAlchemy Async Engine
│   │   ├── models.py            # ORM Models (Account, Person, Call, etc.)
│   │   ├── schemas.py           # Pydantic Request/Response Schemas
│   │   ├── crud.py              # Database CRUD Operations
│   │   ├── routers/
│   │   │   ├── twilio_webhook.py   # Twilio Voice & Media Stream Handler
│   │   │   ├── people.py           # Person Management API
│   │   │   └── dashboard.py        # Dashboard Statistics API
│   │   └── services/
│   │       ├── realtime_gateway.py # State Machine: LISTENING→THINKING→SPEAKING
│   │       ├── deepgram_stt.py     # Streaming STT Client
│   │       ├── openai_llm.py       # Streaming LLM with Memory Context
│   │       ├── elevenlabs_tts.py   # Streaming TTS Client
│   │       ├── audio_utils.py      # μ-law ↔ PCM Conversion
│   │       ├── post_call_processor.py # Sentiment, Summary, Memory Extraction
│   │       └── metrics.py          # Latency Tracking (STT/LLM/TTS)
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # React Router Setup
│   │   ├── api.js               # Backend API Client
│   │   ├── components/
│   │   │   └── Layout.jsx       # Navigation & Portal Layout
│   │   └── pages/
│   │       ├── privat/          # Private Portal (Senioren)
│   │       │   ├── Dashboard.jsx
│   │       │   ├── Personen.jsx
│   │       │   ├── PersonDetail.jsx
│   │       │   └── Einstellungen.jsx
│   │       └── klinik/          # Clinical Portal (Patienten)
│   │           ├── Overview.jsx
│   │           ├── Patienten.jsx
│   │           └── PatientDetail.jsx
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── env.example
└── README.md
```

---

## 🗄️ Datenbankschema

### Entity-Relationship

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│   accounts   │───┬──▶│    people    │──┬───▶│    calls     │
├──────────────┤   │   ├──────────────┤  │    ├──────────────┤
│ id           │   │   │ id           │  │    │ id           │
│ type         │   │   │ account_id   │──┘    │ account_id   │
│ name         │   │   │ kind         │       │ person_id    │
│ created_at   │   │   │ display_name │       │ direction    │
└──────────────┘   │   │ phone_e164   │       │ twilio_sid   │
                   │   │ language     │       │ from_e164    │
                   │   │ consent_rec. │       │ to_e164      │
                   │   │ retention    │       │ status       │
                   │   │ created_at   │       │ started_at   │
                   │   └──────────────┘       │ ended_at     │
                   │           │              │ duration_sec │
                   │           ▼              │ created_at   │
                   │   ┌──────────────┐       └──────────────┘
                   │   │ memory_state │              │
                   │   ├──────────────┤              │
                   │   │ id           │              ├───────────────┐
                   │   │ person_id    │              │               │
                   │   │ memory_json  │              ▼               ▼
                   │   │ updated_at   │       ┌──────────────┐ ┌──────────────┐
                   │   └──────────────┘       │ transcripts  │ │call_analysis │
                   │                          ├──────────────┤ ├──────────────┤
                   └──▶┌──────────────┐       │ id           │ │ id           │
                       │twilio_numbers│       │ call_id      │ │ call_id      │
                       ├──────────────┤       │ text         │ │ sentiment_*  │
                       │ id           │       │ is_encrypted │ │ summary_de   │
                       │ account_id   │       │ created_at   │ │ memory_json  │
                       │ phone_e164   │       └──────────────┘ │ created_at   │
                       │ twilio_sid   │                        └──────────────┘
                       └──────────────┘
```

### Tabellen-Details

| Tabelle | Beschreibung | GDPR-relevant |
|---------|--------------|---------------|
| `accounts` | Multi-Tenant Container (private/clinical) | Nein |
| `people` | Registrierte Nutzer (Senioren/Patienten) | Ja - consent, retention |
| `calls` | Anruf-Metadaten (SID, Zeiten, Status) | Ja - retention |
| `transcripts` | Gesprächsprotokolle (optional verschlüsselt) | Ja - Fernet, retention |
| `call_analysis` | LLM Sentiment & Zusammenfassung | Ja - retention |
| `memory_state` | Langzeit-Kontext JSON pro Person | Ja - data minimization |
| `twilio_numbers` | Zugewiesene Twilio Nummern | Nein |

### Memory State JSON Schema

```json
{
  "facts": ["Wohnt in Schalksmühle", "Seit 30 Jahren dort"],
  "preferences": ["Mag Spaziergänge", "Liest gerne Krimis"],
  "important_people": ["Sohn: lebt im Ort", "Enkelin: Marie"],
  "recent_topics": ["Fußball", "Einsamkeit", "Garten"],
  "health_notes": ["Fühlt sich manchmal müde"],
  "mood_indicator": "gut"
}
```

---

## 🔄 Anruf-Flow

### 1. Eingehender Anruf

```
Telefon → Twilio → POST /twilio/voice
                         │
                         ▼
                  ┌─────────────────┐
                  │ Nummer bekannt? │──No──▶ TwiML: "Nicht registriert" → Hangup
                  └────────┬────────┘
                          Yes
                           │
                           ▼
                  ┌─────────────────┐
                  │ Call in DB      │
                  │ Person laden    │
                  │ Memory laden    │
                  └────────┬────────┘
                           │
                           ▼
                  TwiML: <Connect><Stream url="wss://.../twilio/stream"/>
```

### 2. WebSocket Media Stream

```
Twilio "start" Event
        │
        ▼
┌───────────────────────────────────────┐
│         RealtimeGateway               │
│                                       │
│  State: IDLE → LISTENING              │
│                                       │
│  1. Deepgram STT verbinden            │
│  2. OpenAI LLM initialisieren         │
│  3. ElevenLabs TTS initialisieren     │
│  4. Memory Context laden              │
│  5. Begrüßung senden                  │
└───────────────────────────────────────┘
```

### 3. Konversations-Schleife

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐      │
│  │  LISTENING  │─────▶│  THINKING   │─────▶│  SPEAKING   │──┐   │
│  │             │      │             │      │             │  │   │
│  │ STT aktiv   │      │ LLM Stream  │      │ TTS Stream  │  │   │
│  │ Partials    │      │ Sentence    │      │ μ-law Audio │  │   │
│  │ Finals      │      │ Chunking    │      │ to Twilio   │  │   │
│  └─────────────┘      └─────────────┘      └─────────────┘  │   │
│         ▲                                                    │   │
│         └────────────────────────────────────────────────────┘   │
│                                                                  │
│  Barge-In: Wenn User während SPEAKING spricht → Cancel → LISTEN │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 4. Turn-Taking Logik

**Deepgram Events:**
- `interim_results`: Partielle Transkripte (für Barge-In Erkennung)
- `is_final`: Finale Transkripte mit Interpunktion
- `speech_final`: Ende einer Sprecheinheit (400ms Stille)
- `UtteranceEnd`: Zusätzlicher Timeout (1500ms nach letztem Wort)

**Incomplete Utterance Detection:**
```python
# Wörter die auf unvollständige Sätze hindeuten
INCOMPLETE_MARKERS_DE = {"aber", "und", "oder", "weil", "dass", "wenn", ...}

# Wenn Satz mit diesen Wörtern endet → noch nicht verarbeiten
if _looks_incomplete("Ja, wenn ich meine Familie sehe, aber"):
    return  # Warte auf mehr
```

### 5. Post-Call Processing

```
Anruf beendet (Twilio "stop" Event)
        │
        ▼
┌─────────────────────────────────────┐
│  process_call_completion()          │
│                                     │
│  1. Transkript speichern (encrypt)  │
│  2. GPT-4o-mini: Sentiment          │
│     {"label": "positiv",            │
│      "score": 0.7,                  │
│      "reason_short_de": "..."}      │
│  3. GPT-4o-mini: Zusammenfassung    │
│     (max 8 Bullet Points)           │
│  4. GPT-4o-mini: Memory Extraktion  │
│     {"facts": [...],                │
│      "important_people": [...]}     │
│  5. Memory State mergen & speichern │
└─────────────────────────────────────┘
```

---

## 🎙️ Viola - Die digitale Begleiterin

### Persönlichkeit

Viola ist eine deutschsprachige, digitale Begleiterin mit folgenden Eigenschaften:

- **Ruhig & warm**: Klare, kurze Sätze
- **Empathisch aber nicht übertrieben**: Emotionale Intensität niedriger als der Nutzer
- **Kontext-bewusst**: Nutzt Langzeit-Memory und aktuelle Konversation
- **Grenzen-bewusst**: Gibt keine medizinischen Ratschläge

### Begrüßung

Personalisiert bei bekanntem Namen:
> "Hallo [Name]! Hier ist Viola, deine persönliche Begleiterin. Schön, dass du anrufst. Wie geht es dir heute?"

Generisch:
> "Hallo! Hier ist Viola, deine persönliche Begleiterin. Schön, dass du anrufst. Wie geht es dir heute?"

### System Prompt (Auszug)

```
Du bist VIOLA, eine deutschsprachige, sprachbasierte digitale Begleiterin.

KERNREGELN:
1) REAGIERE auf das, was TATSÄCHLICH gesagt wurde
2) SPIEGELE kurz (1 Satz), dann natürliche Fortsetzung
3) Emotionale Intensität NIEDRIGER als der Nutzer
4) BEHALTE DEN KONTEXT - wiederhole KEINE Fragen die bereits beantwortet wurden

VERBOTEN:
- "Danke, dass du das teilst"
- "Wie geht es dir?" wiederholen
- Therapie-Sprache

Halte Antworten kurz (1-2 Sätze maximal).
```

---

## 📊 API Endpoints

### Twilio Webhooks

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

### People API

| Endpoint | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/people/seniors` | GET | Liste aller Senioren |
| `/api/people/seniors` | POST | Senior anlegen |
| `/api/people/patients` | GET | Liste aller Patienten |
| `/api/people/patients` | POST | Patient anlegen |
| `/api/people/{id}` | GET | Person mit Stats |
| `/api/people/{id}` | PUT | Person aktualisieren |
| `/api/people/{id}` | DELETE | Person löschen |
| `/api/people/{id}/analytics` | GET | Detaillierte Analytics |

### Health

| Endpoint | Methode | Beschreibung |
|----------|---------|--------------|
| `/` | GET | Service Info |
| `/health` | GET | Health Check |

---

## 🚀 Installation

### Voraussetzungen

- Docker & Docker Compose
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
ELEVENLABS_VOICE_ID=rAmra0SCIYOxYmRNDSm3

# Twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_NUMBER_E164=+1234567890

# Server URL (für Twilio Webhooks)
BASE_URL=https://your-domain.com
```

### 3. Docker Container starten

```bash
docker compose up -d --build
```

### 4. Twilio Webhook konfigurieren

In der Twilio Console:
1. Phone Numbers → Active Numbers → Nummer auswählen
2. Voice Configuration:
   - **Webhook URL**: `https://your-domain.com/twilio/voice`
   - **HTTP POST**
   - **Status Callback URL**: `https://your-domain.com/twilio/status`

### 5. Erste Person anlegen

Öffne `https://your-domain.com/privat/personen` und lege eine Person mit der Telefonnummer an (E.164 Format: `+4915123456789`).

---

## 🔒 GDPR / DSGVO Compliance

### Implementierte Features

| Feature | Implementierung |
|---------|-----------------|
| **Consent** | `consent_recording` Flag pro Person |
| **Retention** | `retention_days` pro Person, automatischer Cleanup |
| **Encryption** | Fernet für Transcripts (`FERNET_KEY`) |
| **Data Minimization** | Memory JSON limitiert (max 20 facts) |
| **Access Control** | Nur registrierte Nummern können anrufen |
| **EU Hosting** | Twilio Region IE1, Server in EU |
| **No Training Use** | OpenAI API mit opt-out |

### Fernet Key generieren

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Ausgabe in `.env` als `FERNET_KEY` eintragen.

### Retention Cleanup

Läuft automatisch täglich. Manuell auslösen:

```bash
curl -X POST https://your-domain.com/api/dashboard/cleanup
```

---

## 📈 Metriken & Observability

### Latenz-Metriken (pro Turn)

```json
{
  "turn_id": 5,
  "stt_latency_ms": 0.0,
  "llm_ttfb_ms": 486.2,
  "llm_total_ms": 1237.8,
  "tts_ttfb_ms": -16.7,
  "total_turn_latency_ms": 882.9,
  "call_sid": "CA123..."
}
```

### Call Summary

```json
{
  "call_sid": "CA123...",
  "duration_sec": 371.4,
  "total_turns": 25,
  "barge_in_count": 0,
  "avg_turn_latency_ms": 965.9
}
```

### Log-Format

```
[CA123...] Incoming call from +49151...
[CA123...] Caller identified: Henry (ID: 1)
[CA123...] Loaded memory for Henry: ['facts', 'important_people']
[CA123...] Memory injected into LLM: [...]
[CA123...] State: listening -> thinking
[CA123...] LLM response: Das freut mich zu hören...
[CA123...] METRIC: turn_complete {...}
```

---

## 🛠️ Entwicklung

### Lokale Entwicklung (ohne Docker)

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### Logs anzeigen

```bash
docker compose logs -f backend
docker compose logs -f frontend
```

### Container neu bauen

```bash
docker compose down
docker compose up -d --build
```

---

## 🐛 Troubleshooting

### Anruf wird sofort beendet

1. Twilio Webhook URL prüfen (HTTPS erforderlich)
2. Backend Logs: `REJECTED: Unknown caller` → Nummer nicht registriert
3. WebSocket 403: Caddy/Nginx muss WebSockets durchlassen

### Keine Stimme hörbar

1. ElevenLabs API Key prüfen
2. Voice ID korrekt? (`rAmra0SCIYOxYmRNDSm3`)
3. Logs: `TTS complete: X chars -> Y bytes`

### STT funktioniert nicht

1. Deepgram API Key prüfen
2. Logs: `Connected to Deepgram STT`
3. Audio-Format: Twilio sendet μ-law, wird zu PCM konvertiert

### Memory wird nicht geladen

1. Logs: `Loaded memory for [Name]: [...]`
2. Nach Anruf prüfen: `Memory updated for person X`
3. Post-Call Processing läuft async nach Anrufende

---

## 📄 Lizenz

MIT License

---

## 👥 Beitragende

- Entwickelt mit Unterstützung von Claude (Anthropic)

---

## 📞 Support

Bei Fragen oder Problemen: GitHub Issues erstellen.
