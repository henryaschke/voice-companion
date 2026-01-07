# Frontend Endpoint Inventory

> **Generated:** 2026-01-07  
> **Purpose:** Document all API calls from the old frontend before migration  
> **Status:** Reference for new frontend integration (Phase 2)

---

## API Base Configuration

```javascript
// frontend/src/api.js
const API_BASE = import.meta.env.VITE_API_BASE_URL || ''
```

**Headers sent with all requests:**
- `Content-Type: application/json`
- `X-Admin-Token: {localStorage.admin_token}` (if present)

---

## Dashboard Endpoints

### GET `/api/dashboard/private`
| Attribute | Value |
|-----------|-------|
| **Function** | `getPrivateDashboard()` |
| **Used in** | `frontend/src/pages/privat/Dashboard.jsx` |
| **Component** | `PrivateDashboard` |
| **Purpose** | Fetch private portal dashboard statistics |
| **Expected Response** | `{ total_people, calls_this_week, avg_duration_sec, avg_sentiment_score, sentiment_trend: [{date, score}] }` |

### GET `/api/dashboard/clinical`
| Attribute | Value |
|-----------|-------|
| **Function** | `getClinicalDashboard()` |
| **Used in** | `frontend/src/pages/klinik/Overview.jsx` |
| **Component** | `KlinikOverview` |
| **Purpose** | Fetch clinical portal dashboard statistics |
| **Expected Response** | `{ total_people, total_calls, calls_this_week, avg_sentiment_score }` |

### GET `/api/dashboard/settings/private`
| Attribute | Value |
|-----------|-------|
| **Function** | `getPrivateSettings()` |
| **Used in** | `frontend/src/pages/privat/Einstellungen.jsx` |
| **Component** | `PrivatEinstellungen` |
| **Purpose** | Fetch private settings including Twilio numbers and GDPR config |
| **Expected Response** | `{ twilio_numbers: [{id, phone_e164, is_active}], default_consent, default_retention_days }` |

### POST `/api/dashboard/cleanup`
| Attribute | Value |
|-----------|-------|
| **Function** | `runCleanup()` |
| **Used in** | `frontend/src/pages/privat/Einstellungen.jsx` |
| **Component** | `PrivatEinstellungen` |
| **Purpose** | Trigger manual cleanup of expired transcripts/analyses |
| **Expected Response** | `{ message, deleted_transcripts, deleted_analyses }` |

---

## People (Seniors) Endpoints - Private Portal

### GET `/api/people/seniors`
| Attribute | Value |
|-----------|-------|
| **Function** | `getSeniors()` |
| **Used in** | `frontend/src/pages/privat/Dashboard.jsx`, `frontend/src/pages/privat/Personen.jsx` |
| **Components** | `PrivatDashboard`, `PrivatPersonen` |
| **Purpose** | List all seniors (private portal people) |
| **Expected Response** | `[{ id, display_name, phone_e164, consent_recording, retention_days, total_calls, avg_duration_sec, avg_sentiment_score }]` |

### GET `/api/people/{id}`
| Attribute | Value |
|-----------|-------|
| **Function** | `getSenior(id)` |
| **Used in** | (Available but not directly called - analytics endpoint used instead) |
| **Purpose** | Get single senior details |
| **Expected Response** | `{ id, display_name, phone_e164, consent_recording, retention_days, ... }` |

### GET `/api/people/{id}/analytics`
| Attribute | Value |
|-----------|-------|
| **Function** | `getSeniorAnalytics(id)` |
| **Used in** | `frontend/src/pages/privat/PersonDetail.jsx` |
| **Component** | `PrivatPersonDetail` |
| **Purpose** | Get detailed analytics for a senior including calls and memory state |
| **Expected Response** | `{ person: {...}, calls: [{id, created_at, duration_sec, sentiment_label, sentiment_score, sentiment_reason, summary_de, transcript_text, direction}], total_calls, avg_duration_sec, avg_sentiment_score, memory_state: {facts, preferences, important_people, recent_topics} }` |

### POST `/api/people/seniors`
| Attribute | Value |
|-----------|-------|
| **Function** | `createSenior(data)` |
| **Used in** | `frontend/src/pages/privat/Personen.jsx` |
| **Component** | `PrivatPersonen` |
| **Purpose** | Create a new senior |
| **Request Body** | `{ display_name, phone_e164, consent_recording, retention_days }` |
| **Expected Response** | Created senior object |

### PUT `/api/people/{id}`
| Attribute | Value |
|-----------|-------|
| **Function** | `updateSenior(id, data)` |
| **Used in** | `frontend/src/pages/privat/Personen.jsx` |
| **Component** | `PrivatPersonen` |
| **Purpose** | Update senior details |
| **Request Body** | `{ display_name, phone_e164, consent_recording, retention_days }` |
| **Expected Response** | Updated senior object |

### DELETE `/api/people/{id}`
| Attribute | Value |
|-----------|-------|
| **Function** | `deleteSenior(id)` |
| **Used in** | `frontend/src/pages/privat/Personen.jsx` |
| **Component** | `PrivatPersonen` |
| **Purpose** | Delete a senior and all associated data |
| **Expected Response** | Success confirmation |

---

## People (Patients) Endpoints - Clinical Portal

### GET `/api/people/patients`
| Attribute | Value |
|-----------|-------|
| **Function** | `getPatients()` |
| **Used in** | `frontend/src/pages/klinik/Overview.jsx`, `frontend/src/pages/klinik/Patienten.jsx` |
| **Components** | `KlinikOverview`, `KlinikPatienten` |
| **Purpose** | List all patients (clinical portal people) |
| **Expected Response** | `[{ id, display_name, phone_e164, consent_recording, retention_days, total_calls, avg_sentiment_score }]` |

### GET `/api/people/{id}`
| Attribute | Value |
|-----------|-------|
| **Function** | `getPatient(id)` |
| **Used in** | (Available but not directly called - analytics endpoint used instead) |
| **Purpose** | Get single patient details |

### GET `/api/people/{id}/analytics`
| Attribute | Value |
|-----------|-------|
| **Function** | `getPatientAnalytics(id)` |
| **Used in** | `frontend/src/pages/klinik/PatientDetail.jsx` |
| **Component** | `KlinikPatientDetail` |
| **Purpose** | Get detailed analytics for a patient including sentiment history |
| **Expected Response** | `{ person: {...}, calls: [...], total_calls, avg_duration_sec, avg_sentiment_score, sentiment_history: [{date, score, label}], memory_state: {...} }` |

### POST `/api/people/patients`
| Attribute | Value |
|-----------|-------|
| **Function** | `createPatient(data)` |
| **Used in** | `frontend/src/pages/klinik/Patienten.jsx` |
| **Component** | `KlinikPatienten` |
| **Purpose** | Create a new patient |
| **Request Body** | `{ display_name, phone_e164, consent_recording, retention_days }` |

### PUT `/api/people/{id}`
| Attribute | Value |
|-----------|-------|
| **Function** | `updatePatient(id, data)` |
| **Used in** | `frontend/src/pages/klinik/Patienten.jsx` |
| **Component** | `KlinikPatienten` |
| **Purpose** | Update patient details |
| **Request Body** | `{ display_name, phone_e164, consent_recording, retention_days }` |

### DELETE `/api/people/{id}`
| Attribute | Value |
|-----------|-------|
| **Function** | `deletePatient(id)` |
| **Used in** | `frontend/src/pages/klinik/Patienten.jsx` |
| **Component** | `KlinikPatienten` |
| **Purpose** | Delete a patient and all associated data |

---

## Twilio Endpoints

### POST `/twilio/outbound/call?person_id={id}`
| Attribute | Value |
|-----------|-------|
| **Function** | `initiateOutboundCall(personId)` |
| **Used in** | `frontend/src/pages/privat/PersonDetail.jsx`, `frontend/src/pages/klinik/PatientDetail.jsx` |
| **Components** | `PrivatPersonDetail`, `KlinikPatientDetail` |
| **Purpose** | Initiate an outbound call to a person |
| **Expected Response** | `{ call_sid, status }` or `{ error }` |

---

## Frontend Routes (for reference)

| Route | Component | Portal |
|-------|-----------|--------|
| `/` | Redirect to `/privat/dashboard` | - |
| `/privat` | Layout | Private |
| `/privat/dashboard` | `PrivatDashboard` | Private |
| `/privat/personen` | `PrivatPersonen` | Private |
| `/privat/personen/:id` | `PrivatPersonDetail` | Private |
| `/privat/einstellungen` | `PrivatEinstellungen` | Private |
| `/klinik` | Layout | Clinical |
| `/klinik/` | `KlinikOverview` | Clinical |
| `/klinik/patienten` | `KlinikPatienten` | Clinical |
| `/klinik/patienten/:id` | `KlinikPatientDetail` | Clinical |

---

## Environment Variables (Old Frontend)

| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE_URL` | API base URL (empty string = same origin) |

---

## Summary

**Total Unique Endpoints: 11**

| Category | Count | Endpoints |
|----------|-------|-----------|
| Dashboard | 4 | GET /api/dashboard/private, GET /api/dashboard/clinical, GET /api/dashboard/settings/private, POST /api/dashboard/cleanup |
| People | 6 | GET /api/people/seniors, GET /api/people/patients, GET /api/people/{id}, GET /api/people/{id}/analytics, POST /api/people/seniors, POST /api/people/patients, PUT /api/people/{id}, DELETE /api/people/{id} |
| Twilio | 1 | POST /twilio/outbound/call |

---

*This document serves as a reference for wiring up the new Lovable frontend to the existing backend.*

