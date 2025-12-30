import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Phone, Clock, TrendingUp, Users, ArrowRight } from 'lucide-react'
import { getPrivateDashboard, getSeniors } from '../../api'
import './Dashboard.css'

function PrivateDashboard() {
  const [stats, setStats] = useState(null)
  const [seniors, setSeniors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  useEffect(() => {
    async function loadData() {
      try {
        const [dashboardData, seniorsData] = await Promise.all([
          getPrivateDashboard(),
          getSeniors()
        ])
        setStats(dashboardData)
        setSeniors(seniorsData.slice(0, 5)) // Show top 5
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])
  
  if (loading) {
    return <div className="loading">Laden...</div>
  }
  
  if (error) {
    return <div className="error">Fehler: {error}</div>
  }
  
  const formatDuration = (seconds) => {
    if (!seconds) return '–'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  const formatSentiment = (score) => {
    if (score === null || score === undefined) return '–'
    // Convert -1 to 1 scale to 0-100 for display
    const percentage = ((score + 1) / 2 * 100).toFixed(0)
    return `${percentage}%`
  }
  
  const getSentimentColor = (score) => {
    if (score === null || score === undefined) return 'neutral'
    if (score > 0.2) return 'positive'
    if (score < -0.2) return 'negative'
    return 'neutral'
  }
  
  return (
    <div className="dashboard">
      <header className="page-header">
        <h1 className="page-title">Übersicht</h1>
        <p className="page-subtitle">Willkommen im Privatbereich des Voice Companion</p>
      </header>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <Users size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Personen</span>
            <span className="stat-value">{stats?.total_people || 0}</span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">
            <Phone size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Anrufe diese Woche</span>
            <span className="stat-value">{stats?.calls_this_week || 0}</span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Ø Gesprächsdauer</span>
            <span className="stat-value">{formatDuration(stats?.avg_duration_sec)}</span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon sentiment">
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Stimmungsindex (Schätzung)</span>
            <span className={`stat-value sentiment-${getSentimentColor(stats?.avg_sentiment_score)}`}>
              {formatSentiment(stats?.avg_sentiment_score)}
            </span>
          </div>
        </div>
      </div>
      
      <div className="dashboard-sections">
        <section className="card">
          <div className="card-header">
            <h2 className="card-title">Kürzliche Aktivität</h2>
            <Link to="/privat/personen" className="btn btn-ghost">
              Alle anzeigen <ArrowRight size={16} />
            </Link>
          </div>
          
          {seniors.length === 0 ? (
            <div className="empty-state">
              <Users className="empty-state-icon" size={48} />
              <h3 className="empty-state-title">Keine Personen vorhanden</h3>
              <p>Fügen Sie eine Person hinzu, um loszulegen.</p>
              <Link to="/privat/personen" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                Person hinzufügen
              </Link>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Telefon</th>
                  <th>Anrufe</th>
                  <th>Letzte Stimmung</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {seniors.map(senior => (
                  <tr key={senior.id}>
                    <td>
                      <strong>{senior.display_name}</strong>
                    </td>
                    <td className="text-muted">{senior.phone_e164}</td>
                    <td>{senior.total_calls}</td>
                    <td>
                      {senior.avg_sentiment_score !== null ? (
                        <span className={`sentiment-badge sentiment-${getSentimentColor(senior.avg_sentiment_score)}`}>
                          {formatSentiment(senior.avg_sentiment_score)}
                        </span>
                      ) : (
                        <span className="text-muted">–</span>
                      )}
                    </td>
                    <td>
                      <Link to={`/privat/personen/${senior.id}`} className="btn btn-ghost">
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        
        {stats?.sentiment_trend && stats.sentiment_trend.length > 0 && (
          <section className="card sentiment-trend-card">
            <div className="card-header">
              <h2 className="card-title">Stimmungsverlauf (7 Tage)</h2>
            </div>
            <div className="sentiment-chart">
              {stats.sentiment_trend.map((day, index) => (
                <div key={index} className="chart-bar-container">
                  <div 
                    className={`chart-bar sentiment-${getSentimentColor(day.score)}`}
                    style={{ 
                      height: day.score !== null 
                        ? `${((day.score + 1) / 2) * 100}%` 
                        : '0%' 
                    }}
                  />
                  <span className="chart-label">
                    {new Date(day.date).toLocaleDateString('de-DE', { weekday: 'short' })}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

export default PrivateDashboard

