/**
 * API client for People (Seniors/Patients) endpoints.
 * Phase 2: Create User functionality only.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// === Types ===

export interface PersonalContext {
  short_description?: string;
  interests?: string;
  important_people?: string;
  preferred_topics?: string;
  daily_routines?: string;
  sensitivities?: string;
  // Care home specific
  diagnoses?: string;
  medications?: string;
  allergies?: string;
  mobility?: string;
  nutrition?: string;
}

export interface Address {
  street_house_number?: string;
  postal_code?: string;
  city?: string;
}

export interface CreatePersonPayload {
  display_name: string;
  phone_e164: string;
  age?: number | null;
  language?: string;
  consent_recording?: boolean;
  retention_days?: number;
  personal_context?: PersonalContext;
  address?: Address;
}

export interface PersonResponse {
  id: number;
  account_id: number;
  kind: string;
  display_name: string;
  phone_e164: string;
  language: string;
  consent_recording: boolean;
  retention_days: number;
  age?: number | null;
  personal_context_json?: PersonalContext | null;
  address_json?: Address | null;
  created_at: string;
  updated_at?: string | null;
}

export interface ApiError {
  detail: string;
}

// === API Functions ===

/**
 * Create a new senior (private/family portal).
 * @throws Error with message if request fails
 */
export async function createSenior(payload: CreatePersonPayload): Promise<PersonResponse> {
  const response = await fetch(`${API_BASE_URL}/api/people/seniors`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData: ApiError = await response.json().catch(() => ({ detail: 'Unbekannter Fehler' }));
    
    if (response.status === 409) {
      throw new Error(errorData.detail || 'Diese Telefonnummer existiert bereits.');
    }
    if (response.status === 422) {
      throw new Error('Ungültige Eingabedaten. Bitte überprüfen Sie Ihre Angaben.');
    }
    throw new Error(errorData.detail || `Fehler: ${response.status}`);
  }

  return response.json();
}

/**
 * Create a new patient (clinical portal).
 * @throws Error with message if request fails
 */
export async function createPatient(payload: CreatePersonPayload): Promise<PersonResponse> {
  const response = await fetch(`${API_BASE_URL}/api/people/patients`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData: ApiError = await response.json().catch(() => ({ detail: 'Unbekannter Fehler' }));
    
    if (response.status === 409) {
      throw new Error(errorData.detail || 'Diese Telefonnummer existiert bereits.');
    }
    if (response.status === 422) {
      throw new Error('Ungültige Eingabedaten. Bitte überprüfen Sie Ihre Angaben.');
    }
    throw new Error(errorData.detail || `Fehler: ${response.status}`);
  }

  return response.json();
}

// === List/Read Functions ===

export interface PersonWithStats extends PersonResponse {
  total_calls: number;
  calls_this_week: number;
  avg_duration_sec?: number | null;
  last_call_at?: string | null;
  avg_sentiment_score?: number | null;
}

/**
 * Fetch all seniors with call statistics.
 * @throws Error with message if request fails
 */
export async function fetchSeniors(): Promise<PersonWithStats[]> {
  const response = await fetch(`${API_BASE_URL}/api/people/seniors`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData: ApiError = await response.json().catch(() => ({ detail: 'Unbekannter Fehler' }));
    throw new Error(errorData.detail || `Fehler beim Laden: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch all patients with call statistics.
 * @throws Error with message if request fails
 */
export async function fetchPatients(): Promise<PersonWithStats[]> {
  const response = await fetch(`${API_BASE_URL}/api/people/patients`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData: ApiError = await response.json().catch(() => ({ detail: 'Unbekannter Fehler' }));
    throw new Error(errorData.detail || `Fehler beim Laden: ${response.status}`);
  }

  return response.json();
}

