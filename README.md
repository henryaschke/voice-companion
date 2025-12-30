# EU Voice Companion

Ein DSGVO-konformer digitaler Begleiter für ältere Menschen - MVP-Plattform mit Twilio Voice, OpenAI Realtime API und LLM-basierter Stimmungsanalyse.

## 🇪🇺 DSGVO-Hinweis

**WICHTIG**: Diese Anwendung ist für den Betrieb in der EU konzipiert. Deployment MUSS auf EU-Servern erfolgen (z.B. AWS eu-central-1, Hetzner, Fly.io EU).

## Funktionsübersicht

- **Echtzeit-Telefonie**: Bidirektionale Sprachkommunikation über Twilio Media Streams
- **KI-Begleiter**: Natürliche Gespräche mit OpenAI Realtime API (Speech-to-Speech)
- **Streaming-Transkription**: Kontinuierliche Transkription während des Gesprächs
- **LLM-Stimmungsanalyse**: Sentiment-Klassifizierung ohne Keyword-Heuristiken
- **Langzeit-Gedächtnis**: Kontexterhaltung über mehrere Gespräche hinweg
- **Mehrsprachige UI**: Vollständig deutsche Benutzeroberfläche

## Architektur

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Twilio Voice   │────▶│  FastAPI Backend │────▶│  OpenAI Realtime │
│   (EU Region)    │◀────│   (WebSocket)    │◀────│      API         │
└──────────────────┘     └──────────────────┘     └──────────────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │  SQLite + CRUD   │
                         │   (Encrypted)    │
                         └──────────────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │  React Frontend  │
                         │   (German UI)    │
                         └──────────────────┘
```

## Tech Stack

### Backend
- Python 3.11+
- FastAPI + Uvicorn
- SQLAlchemy + aiosqlite (SQLite)
- WebSockets für Twilio Media Streams
- OpenAI Python SDK (Realtime API)
- Cryptography (Fernet) für Verschlüsselung

### Frontend
- Vite + React 18
- React Router 6
- Lucide Icons
- Vollständig deutsche UI

## Schnellstart

### Voraussetzungen

- Python 3.11+
- Node.js 18+
- Twilio-Konto mit Telefonnummer
- OpenAI API-Schlüssel (mit Realtime API Zugang)
- ngrok oder öffentlich erreichbare URL für Webhooks

### 1. Umgebungsvariablen

```bash
cp env.example .env
# Bearbeiten Sie .env mit Ihren Zugangsdaten
```

### 2. Backend starten

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend starten

```bash
cd frontend
npm install
npm run dev
```

### 4. Twilio konfigurieren

1. Gehen Sie zu [Twilio Console](https://console.twilio.com/)
2. Wählen Sie Ihre Telefonnummer
3. **WICHTIG**: Setzen Sie die Region auf **Ireland (IE1)** für DSGVO-Konformität
4. Konfigurieren Sie Webhooks:
   - **Voice URL**: `https://your-domain.eu/twilio/voice` (POST)
   - **Status Callback URL**: `https://your-domain.eu/twilio/status` (POST)

### 5. Für lokale Entwicklung (ngrok)

```bash
ngrok http 8000
# Kopieren Sie die HTTPS-URL und setzen Sie BASE_URL in .env
```

## Docker Deployment

```bash
docker-compose up -d
```

## Umgebungsvariablen

| Variable | Beschreibung | Erforderlich |
|----------|-------------|--------------|
| `OPENAI_API_KEY` | OpenAI API-Schlüssel | ✅ |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | ✅ |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | ✅ |
| `TWILIO_NUMBER_E164` | Twilio-Telefonnummer (+49...) | ✅ |
| `BASE_URL` | Öffentliche HTTPS-URL für Webhooks | ✅ |
| `ADMIN_TOKEN` | Einfacher Zugriffsschutz | Optional |
| `FERNET_KEY` | Verschlüsselungsschlüssel | Empfohlen |

### Fernet-Schlüssel generieren

```python
from cryptography.fernet import Fernet
print(Fernet.generate_key().decode())
```

## API-Endpunkte

### Dashboard
- `GET /api/dashboard/private` - Statistiken Privatbereich
- `GET /api/dashboard/clinical` - Statistiken Klinikbereich
- `POST /api/dashboard/cleanup` - Manuelle Datenbereinigung

### Personen
- `GET /api/people/seniors` - Liste Senioren
- `GET /api/people/patients` - Liste Patienten
- `POST /api/people/seniors` - Senior erstellen
- `POST /api/people/patients` - Patient erstellen
- `GET /api/people/{id}` - Person Details
- `GET /api/people/{id}/analytics` - Analytics für Person
- `PUT /api/people/{id}` - Person aktualisieren
- `DELETE /api/people/{id}` - Person löschen

### Twilio
- `POST /twilio/voice` - Inbound Voice Webhook
- `WS /twilio/stream` - Media Stream WebSocket
- `POST /twilio/status` - Status Callback
- `POST /twilio/outbound/call` - Ausgehenden Anruf starten

## Frontend-Routen

### Privatbereich
- `/privat/dashboard` - Übersicht mit KPIs
- `/privat/personen` - Personenverwaltung
- `/privat/personen/:id` - Personendetails + Anrufverlauf
- `/privat/einstellungen` - DSGVO-Einstellungen

### Klinikbereich
- `/klinik` - Übersicht (teilweise Platzhalter)
- `/klinik/patienten` - Patientenverwaltung
- `/klinik/patienten/:id` - Patientenanalytics

## DSGVO-Konformität

### Implementierte Maßnahmen

1. **EU-Hosting**: Deployment nur auf EU-Servern
2. **Twilio EU-Region**: Konfiguration für IE1 (Irland)
3. **Einwilligung**: Pro-Person `consent_recording` Flag
4. **Datenminimierung**: Zusammenfassungen statt Roh-Transkripte als Kontext
5. **Aufbewahrungsfristen**: Konfigurierbar pro Person (`retention_days`)
6. **Automatische Löschung**: Täglicher Cleanup-Job
7. **Verschlüsselung**: Transkripte verschlüsselt mit Fernet (wenn konfiguriert)
8. **Mandantentrennung**: `account_id` Filter auf allen Queries
9. **Kein Training**: Daten werden nicht für LLM-Training verwendet

### Twilio EU-Region

In der Twilio Console:
1. Phone Numbers → Manage → Active Numbers
2. Nummer auswählen
3. "Region" auf **Ireland (IE1)** setzen

### Ohne Einwilligung

Wenn `consent_recording = false`:
- Anruf-Metadaten werden gespeichert
- Transkript wird NICHT gespeichert
- Analyse wird durchgeführt, aber nicht persistiert

## Datenmodell

```
accounts
├── id, type, name, created_at

people
├── id, account_id, kind, display_name, phone_e164
├── language, consent_recording, retention_days, created_at

calls
├── id, account_id, person_id, direction, twilio_call_sid
├── from_e164, to_e164, started_at, ended_at, duration_sec, status

transcripts
├── id, call_id, text (encrypted), is_encrypted, created_at

call_analysis
├── id, call_id, sentiment_label, sentiment_score, sentiment_confidence
├── sentiment_reason, summary_de, memory_update_json, created_at

memory_state
├── id, person_id, memory_json, updated_at
```

## Realtime API Integration

Die Integration nutzt OpenAI's Realtime API für minimale Latenz:

1. **Audio-Format**: G.711 μ-law (Twilio-kompatibel)
2. **Turn Detection**: Server-seitiges VAD
3. **Speech-to-Speech**: Keine separate TTS-Latenz
4. **Streaming**: Bidirektionales Audio über WebSocket

### Ablauf eines Anrufs

1. Twilio ruft `/twilio/voice` Webhook auf
2. TwiML startet bidirektionalen Media Stream
3. Backend verbindet zu OpenAI Realtime API
4. Audio wird zwischen Twilio ↔ Backend ↔ OpenAI gestreamt
5. Bei Anrufende: Transkript speichern, LLM-Analyse starten
6. Sentiment, Zusammenfassung und Memory-Update werden generiert

## Testing

### Manueller Test

1. Backend + Frontend starten
2. Person mit Ihrer Telefonnummer anlegen
3. Einwilligung aktivieren
4. Twilio-Nummer anrufen
5. Nach Gespräch: Dashboard prüfen

### Ausgehender Testanruf

```bash
curl -X POST "http://localhost:8000/twilio/outbound/call?person_id=1"
```

## Einschränkungen (MVP)

- **Keine Authentifizierung**: Nur einfacher ADMIN_TOKEN
- **Keine Zahlungen**: Stub only
- **SQLite**: Für Produktion PostgreSQL empfohlen
- **Einzelserver**: Keine horizontale Skalierung
- **Klinik-UI**: Teilweise Platzhalter

## Nächste Schritte

1. PostgreSQL statt SQLite
2. Vollständige Authentifizierung (OIDC)
3. Scheduled Outbound Calls
4. Erweiterte Analytics
5. Multi-Region Deployment
6. Audit Logging

## Lizenz

Proprietär - nur für autorisierte Nutzung.

