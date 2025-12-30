import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Phone, Edit, Trash2, Check, X } from 'lucide-react'
import { getSeniors, createSenior, updateSenior, deleteSenior } from '../../api'
import './Personen.css'

function PrivatPersonen() {
  const [seniors, setSeniors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    display_name: '',
    phone_e164: '',
    consent_recording: false,
    retention_days: 30
  })
  
  useEffect(() => {
    loadSeniors()
  }, [])
  
  async function loadSeniors() {
    try {
      const data = await getSeniors()
      setSeniors(data)
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
      consent_recording: false,
      retention_days: 30
    })
    setShowForm(false)
    setEditingId(null)
  }
  
  function startEdit(senior) {
    setFormData({
      display_name: senior.display_name,
      phone_e164: senior.phone_e164,
      consent_recording: senior.consent_recording,
      retention_days: senior.retention_days
    })
    setEditingId(senior.id)
    setShowForm(true)
  }
  
  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    
    try {
      if (editingId) {
        await updateSenior(editingId, formData)
      } else {
        await createSenior(formData)
      }
      resetForm()
      loadSeniors()
    } catch (err) {
      setError(err.message)
    }
  }
  
  async function handleDelete(id) {
    if (!confirm('Möchten Sie diese Person wirklich löschen? Alle Anrufdaten werden ebenfalls gelöscht.')) {
      return
    }
    
    try {
      await deleteSenior(id)
      loadSeniors()
    } catch (err) {
      setError(err.message)
    }
  }
  
  const formatSentiment = (score) => {
    if (score === null || score === undefined) return '–'
    const percentage = ((score + 1) / 2 * 100).toFixed(0)
    return `${percentage}%`
  }
  
  const getSentimentClass = (score) => {
    if (score === null || score === undefined) return ''
    if (score > 0.2) return 'sentiment-positiv'
    if (score < -0.2) return 'sentiment-negativ'
    return 'sentiment-neutral'
  }
  
  if (loading) {
    return <div className="loading">Laden...</div>
  }
  
  return (
    <div className="personen-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Personen</h1>
          <p className="page-subtitle">Verwalten Sie die Personen im Privatbereich</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setShowForm(true)}
        >
          <Plus size={20} />
          Person hinzufügen
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
          <h3>{editingId ? 'Person bearbeiten' : 'Neue Person'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.display_name}
                  onChange={e => setFormData({ ...formData, display_name: e.target.value })}
                  placeholder="z.B. Maria Schmidt"
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
                <span className="form-hint">
                  Nur bei Einwilligung werden Transkripte gespeichert (DSGVO)
                </span>
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
        {seniors.length === 0 ? (
          <div className="empty-state">
            <Phone className="empty-state-icon" size={48} />
            <h3 className="empty-state-title">Keine Personen vorhanden</h3>
            <p>Fügen Sie eine Person hinzu, um loszulegen.</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Telefonnummer</th>
                <th>Anrufe</th>
                <th>Ø Dauer</th>
                <th>Stimmung</th>
                <th>Einwilligung</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {seniors.map(senior => (
                <tr key={senior.id}>
                  <td>
                    <Link to={`/privat/personen/${senior.id}`} className="person-link">
                      <strong>{senior.display_name}</strong>
                    </Link>
                  </td>
                  <td className="text-muted">{senior.phone_e164}</td>
                  <td>{senior.total_calls}</td>
                  <td>
                    {senior.avg_duration_sec 
                      ? `${Math.floor(senior.avg_duration_sec / 60)}:${(senior.avg_duration_sec % 60).toString().padStart(2, '0')}`
                      : '–'
                    }
                  </td>
                  <td>
                    <span className={`sentiment-badge ${getSentimentClass(senior.avg_sentiment_score)}`}>
                      {formatSentiment(senior.avg_sentiment_score)}
                    </span>
                  </td>
                  <td>
                    {senior.consent_recording 
                      ? <Check size={16} className="text-success" />
                      : <X size={16} className="text-muted" />
                    }
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="btn btn-ghost"
                        onClick={() => startEdit(senior)}
                        title="Bearbeiten"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        className="btn btn-ghost text-error"
                        onClick={() => handleDelete(senior.id)}
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

export default PrivatPersonen

