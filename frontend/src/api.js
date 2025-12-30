/**
 * API client for EU Voice Companion backend
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  }
  
  // Add admin token if stored
  const adminToken = localStorage.getItem('admin_token')
  if (adminToken) {
    headers['X-Admin-Token'] = adminToken
  }
  
  const response = await fetch(url, {
    ...options,
    headers
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.detail || `API Error: ${response.status}`)
  }
  
  return response.json()
}

// ============= Dashboard =============
export async function getPrivateDashboard() {
  return fetchAPI('/api/dashboard/private')
}

export async function getClinicalDashboard() {
  return fetchAPI('/api/dashboard/clinical')
}

export async function getPrivateSettings() {
  return fetchAPI('/api/dashboard/settings/private')
}

// ============= People (Seniors) =============
export async function getSeniors() {
  return fetchAPI('/api/people/seniors')
}

export async function getSenior(id) {
  return fetchAPI(`/api/people/${id}`)
}

export async function getSeniorAnalytics(id) {
  return fetchAPI(`/api/people/${id}/analytics`)
}

export async function createSenior(data) {
  return fetchAPI('/api/people/seniors', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

export async function updateSenior(id, data) {
  return fetchAPI(`/api/people/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  })
}

export async function deleteSenior(id) {
  return fetchAPI(`/api/people/${id}`, {
    method: 'DELETE'
  })
}

// ============= People (Patients) =============
export async function getPatients() {
  return fetchAPI('/api/people/patients')
}

export async function getPatient(id) {
  return fetchAPI(`/api/people/${id}`)
}

export async function getPatientAnalytics(id) {
  return fetchAPI(`/api/people/${id}/analytics`)
}

export async function createPatient(data) {
  return fetchAPI('/api/people/patients', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

export async function updatePatient(id, data) {
  return fetchAPI(`/api/people/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  })
}

export async function deletePatient(id) {
  return fetchAPI(`/api/people/${id}`, {
    method: 'DELETE'
  })
}

// ============= Outbound Calls =============
export async function initiateOutboundCall(personId) {
  return fetchAPI(`/twilio/outbound/call?person_id=${personId}`, {
    method: 'POST'
  })
}

// ============= Cleanup =============
export async function runCleanup() {
  return fetchAPI('/api/dashboard/cleanup', {
    method: 'POST'
  })
}

