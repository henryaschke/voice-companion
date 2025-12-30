import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Phone, Clock, Calendar, TrendingUp, MessageSquare, Activity } from 'lucide-react'
import { getPatientAnalytics, initiateOutboundCall } from '../../api'
import './PatientDetail.css'

function KlinikPatientDetail() {
  const { id } = useParams()
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [calling, setCalling] = useState(false)
  const [selectedCall, setSelectedCall] = useState(null)
  
  useEffect(() => {
    async function loadData() {
      try {
        const data = await getPatientAnalytics(id)
        setAnalytics(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [id])
  
  async function handleCall() {
    setCalling(true)
    try {
      const result = await initiateOutboundCall(id)
      if (result.error) {
        alert(`Fehler: ${result.error}`)
      } else {
        alert('Anruf gestartet!')
      }
    } catch (err) {
      alert(`Fehler: ${err.message}`)
    } finally {
      setCalling(false)
    }
  }
  
  const formatDuration = (seconds) => {
    if (!seconds) return '–'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  const formatDate = (dateStr) => {
    if (!dateStr) return '–'
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  const formatSentiment = (score) => {
    if (score === null || score === undefined) return '–'
    const percentage = ((score + 1) / 2 * 100).toFixed(0)
    return `${percentage}%`
  }
  
  const getSentimentLabel = (label) => {
    const labels = {
      'positiv': 'Positiv',
      'neutral': 'Neutral',
      'negativ': 'Negativ'
    }
    return labels[label] || label
  }
  
  const getSentimentClass = (label) => {
    return `sentiment-${label || 'neutral'}`
  }
  
  if (loading) {
    return <div className="loading">Laden...</div>
  }
  
  if (error) {
    return (
      <div className="error-page">
        <p>Fehler: {error}</p>
        <Link to="/klinik/patienten" className="btn btn-secondary">
          Zurück zur Liste
        </Link>
      </div>
    )
  }
  
  const { person, calls, total_calls, avg_duration_sec, avg_sentiment_score, sentiment_history, memory_state } = analytics
  
  return (
    <div className="patient-detail">
      <header className="detail-header">
        <Link to="/klinik/patienten" className="back-link">
          <ArrowLeft size={20} />
          Zurück
        </Link>
        
        <div className="patient-info">
          <h1>{person.display_name}</h1>
          <p className="phone">{person.phone_e164}</p>
        </div>
        
        <button 
          className="btn btn-primary"
          onClick={handleCall}
          disabled={calling}
        >
          <Phone size={18} />
          {calling ? 'Ruft an...' : 'Jetzt anrufen'}
        </button>
      </header>
      
      <div className="stats-grid mb-xl">
        <div className="stat-card">
          <div className="stat-icon clinical"><Phone size={20} /></div>
          <div className="stat-content">
            <span className="stat-label">Gesamte Anrufe</span>
            <span className="stat-value">{total_calls}</span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon clinical"><Clock size={20} /></div>
          <div className="stat-content">
            <span className="stat-label">Ø Dauer</span>
            <span className="stat-value">{formatDuration(avg_duration_sec)}</span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon clinical"><TrendingUp size={20} /></div>
          <div className="stat-content">
            <span className="stat-label">Ø Stimmung</span>
            <span className="stat-value">{formatSentiment(avg_sentiment_score)}</span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon clinical"><Calendar size={20} /></div>
          <div className="stat-content">
            <span className="stat-label">Aufbewahrung</span>
            <span className="stat-value">{person.retention_days} Tage</span>
          </div>
        </div>
      </div>
      
      {/* Sentiment History Chart (Placeholder) */}
      <section className="card mb-lg">
        <div className="card-header">
          <h2 className="card-title">Stimmungsverlauf</h2>
        </div>
        {sentiment_history && sentiment_history.length > 0 ? (
          <div className="sentiment-timeline">
            {sentiment_history.slice(0, 10).map((entry, index) => (
              <div key={index} className="timeline-entry">
                <span className="timeline-date">
                  {new Date(entry.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                </span>
                <div className={`timeline-bar ${getSentimentClass(entry.label)}`}>
                  <div 
                    className="timeline-fill"
                    style={{ width: `${((entry.score + 1) / 2) * 100}%` }}
                  />
                </div>
                <span className={`sentiment-badge ${getSentimentClass(entry.label)}`}>
                  {getSentimentLabel(entry.label)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Activity size={32} />
            <p>Keine Stimmungsdaten vorhanden</p>
          </div>
        )}
      </section>
      
      <div className="detail-grid">
        <section className="card calls-section">
          <div className="card-header">
            <h2 className="card-title">Anrufverlauf</h2>
          </div>
          
          {calls.length === 0 ? (
            <div className="empty-state">
              <Phone className="empty-state-icon" size={32} />
              <p>Noch keine Anrufe</p>
            </div>
          ) : (
            <div className="calls-list">
              {calls.map(call => (
                <div 
                  key={call.id} 
                  className={`call-item ${selectedCall?.id === call.id ? 'selected' : ''}`}
                  onClick={() => setSelectedCall(call)}
                >
                  <div className="call-info">
                    <span className="call-date">{formatDate(call.created_at)}</span>
                    <span className="call-duration">{formatDuration(call.duration_sec)}</span>
                  </div>
                  <div className="call-meta">
                    <span className={`sentiment-badge ${getSentimentClass(call.sentiment_label)}`}>
                      {getSentimentLabel(call.sentiment_label)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        
        <section className="card detail-section">
          {selectedCall ? (
            <>
              <div className="card-header">
                <h2 className="card-title">Anrufdetails</h2>
              </div>
              
              <div className="call-details">
                <div className="detail-row">
                  <span className="detail-label">Zeitpunkt</span>
                  <span className="detail-value">{formatDate(selectedCall.created_at)}</span>
                </div>
                
                <div className="detail-row">
                  <span className="detail-label">Dauer</span>
                  <span className="detail-value">{formatDuration(selectedCall.duration_sec)}</span>
                </div>
                
                <div className="detail-row">
                  <span className="detail-label">Stimmung</span>
                  <span className={`sentiment-badge ${getSentimentClass(selectedCall.sentiment_label)}`}>
                    {getSentimentLabel(selectedCall.sentiment_label)}
                    {selectedCall.sentiment_score !== null && (
                      <span> ({formatSentiment(selectedCall.sentiment_score)})</span>
                    )}
                  </span>
                </div>
                
                {selectedCall.sentiment_reason && (
                  <div className="detail-row">
                    <span className="detail-label">Begründung</span>
                    <span className="detail-value">{selectedCall.sentiment_reason}</span>
                  </div>
                )}
                
                {selectedCall.summary_de && (
                  <div className="detail-block">
                    <span className="detail-label">Zusammenfassung</span>
                    <div className="summary-text">
                      {selectedCall.summary_de}
                    </div>
                  </div>
                )}
                
                {selectedCall.transcript_text && person.consent_recording && (
                  <div className="detail-block">
                    <span className="detail-label">
                      <MessageSquare size={14} /> Transkript
                    </span>
                    <div className="transcript-text">
                      {selectedCall.transcript_text}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <p>Wählen Sie einen Anruf aus, um Details zu sehen</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default KlinikPatientDetail

