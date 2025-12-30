import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Edit, Trash2, Check, X, BarChart2 } from 'lucide-react'
import { getPatients, createPatient, updatePatient, deletePatient } from '../../api'
import './Patienten.css'

function KlinikPatienten() {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    display_name: '',
    phone_e164: '',
    consent_recording: true,
    retention_days: 90
  })
  
  useEffect(() => {
    loadPatients()
  }, [])
  
  async function loadPatients() {
    try {
      const data = await getPatients()
      setPatients(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  
  function resetForm() {
    setFormData({
      display_name: '',
      phone_e164: '',
      consent_recording: true,
      retention_days: 90
    })
    setShowForm(false)
    setEditingId(null)
  }
  
  function startEdit(patient) {
    setFormData({
      display_name: patient.display_name,
      phone_e164: patient.phone_e164,
      consent_recording: patient.consent_recording,
      retention_days: patient.retention_days
    })
    setEditingId(patient.id)
    setShowForm(true)
  }
  
  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    
    try {
      if (editingId) {
        await updatePatient(editingId, formData)
      } else {
        await createPatient(formData)
      }
      resetForm()
      loadPatients()
    } catch (err) {
      setError(err.message)
    }
  }
  
  async function handleDelete(id) {
    if (!confirm('Möchten Sie diesen Patienten wirklich löschen? Alle Anrufdaten werden ebenfalls gelöscht.')) {
      return
    }
    
    try {
      await deletePatient(id)
      loadPatients()
    } catch (err) {
      setError(err.message)
    }
  }
  
  const formatSentiment = (score) => {
    if (score === null || score === undefined) return '–'
    const percentage = ((score + 1) / 2 * 100).toFixed(0)
    return `${percentage}%`
  }
  
  if (loading) {
    return <div className="loading">Laden...</div>
  }
  
  return (
    <div className="patienten-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Patientenverwaltung</h1>
          <p className="page-subtitle">Patienten hinzufügen und verwalten</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setShowForm(true)}
        >
          <Plus size={20} />
          Patient hinzufügen
        </button>
      </header>
      
      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError(null)}><X size={16} /></button>
        </div>
      )}
      
      {showForm && (
        <div className="form-card card">
          <h3>{editingId ? 'Patient bearbeiten' : 'Neuer Patient'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.display_name}
                  onChange={e => setFormData({ ...formData, display_name: e.target.value })}
                  placeholder="z.B. Max Mustermann"
                  required
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Telefonnummer</label>
                <input
                  type="tel"
                  className="form-input"
                  value={formData.phone_e164}
                  onChange={e => setFormData({ ...formData, phone_e164: e.target.value })}
                  placeholder="+49..."
                  required
                />
                <span className="form-hint">Format: +49XXXXXXXXXX</span>
              </div>
              
              <div className="form-group">
                <label className="form-label">Aufbewahrungsfrist (Tage)</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.retention_days}
                  onChange={e => setFormData({ ...formData, retention_days: parseInt(e.target.value) })}
                  min="1"
                  max="365"
                />
              </div>
              
              <div className="form-group">
                <label className="form-checkbox">
                  <input
                    type="checkbox"
                    checked={formData.consent_recording}
                    onChange={e => setFormData({ ...formData, consent_recording: e.target.checked })}
                  />
                  <span>Einwilligung zur Aufzeichnung</span>
                </label>
              </div>
            </div>
            
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                Abbrechen
              </button>
              <button type="submit" className="btn btn-primary">
                <Check size={16} />
                {editingId ? 'Speichern' : 'Hinzufügen'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      <div className="card">
        {patients.length === 0 ? (
          <div className="empty-state">
            <BarChart2 className="empty-state-icon" size={48} />
            <h3 className="empty-state-title">Keine Patienten vorhanden</h3>
            <p>Fügen Sie einen Patienten hinzu, um Analytics zu sehen.</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Telefonnummer</th>
                <th>Anrufe</th>
                <th>Ø Stimmung</th>
                <th>Aufbewahrung</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {patients.map(patient => (
                <tr key={patient.id}>
                  <td>
                    <Link to={`/klinik/patienten/${patient.id}`} className="patient-link">
                      <strong>{patient.display_name}</strong>
                    </Link>
                  </td>
                  <td className="text-muted">{patient.phone_e164}</td>
                  <td>{patient.total_calls}</td>
                  <td>{formatSentiment(patient.avg_sentiment_score)}</td>
                  <td>{patient.retention_days} Tage</td>
                  <td>
                    <div className="action-buttons">
                      <Link 
                        to={`/klinik/patienten/${patient.id}`}
                        className="btn btn-ghost"
                        title="Analytics"
                      >
                        <BarChart2 size={16} />
                      </Link>
                      <button 
                        className="btn btn-ghost"
                        onClick={() => startEdit(patient)}
                        title="Bearbeiten"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        className="btn btn-ghost text-error"
                        onClick={() => handleDelete(patient.id)}
                        title="Löschen"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default KlinikPatienten

