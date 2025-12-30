import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Users, Phone, TrendingUp, Activity, ArrowRight } from 'lucide-react'
import { getClinicalDashboard, getPatients } from '../../api'
import './Overview.css'

function KlinikOverview() {
  const [stats, setStats] = useState(null)
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    async function loadData() {
      try {
        const [dashboardData, patientsData] = await Promise.all([
          getClinicalDashboard(),
          getPatients()
        ])
        setStats(dashboardData)
        setPatients(patientsData.slice(0, 5))
      } catch (err) {
        console.error('Failed to load data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])
  
  const formatSentiment = (score) => {
    if (score === null || score === undefined) return '–'
    const percentage = ((score + 1) / 2 * 100).toFixed(0)
    return `${percentage}%`
  }
  
  if (loading) {
    return <div className="loading">Laden...</div>
  }
  
  return (
    <div className="klinik-overview">
      <header className="page-header">
        <h1 className="page-title">Klinik-Übersicht</h1>
        <p className="page-subtitle">Analytics und Patientenverwaltung</p>
      </header>
      
      <div className="stats-grid mb-xl">
        <div className="stat-card">
          <div className="stat-icon clinical">
            <Users size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Patienten</span>
            <span className="stat-value">{stats?.total_people || 0}</span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon clinical">
            <Phone size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Anrufe gesamt</span>
            <span className="stat-value">{stats?.total_calls || 0}</span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon clinical">
            <Activity size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Diese Woche</span>
            <span className="stat-value">{stats?.calls_this_week || 0}</span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon clinical">
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Ø Stimmung</span>
            <span className="stat-value">{formatSentiment(stats?.avg_sentiment_score)}</span>
          </div>
        </div>
      </div>
      
      <div className="overview-grid">
        <section className="card">
          <div className="card-header">
            <h2 className="card-title">Patienten</h2>
            <Link to="/klinik/patienten" className="btn btn-ghost">
              Alle anzeigen <ArrowRight size={16} />
            </Link>
          </div>
          
          {patients.length === 0 ? (
            <div className="empty-state">
              <Users className="empty-state-icon" size={48} />
              <h3 className="empty-state-title">Keine Patienten vorhanden</h3>
              <p>Fügen Sie Patienten hinzu, um loszulegen.</p>
              <Link to="/klinik/patienten" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                Patient hinzufügen
              </Link>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Anrufe</th>
                  <th>Stimmung</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {patients.map(patient => (
                  <tr key={patient.id}>
                    <td><strong>{patient.display_name}</strong></td>
                    <td>{patient.total_calls}</td>
                    <td>{formatSentiment(patient.avg_sentiment_score)}</td>
                    <td>
                      <Link to={`/klinik/patienten/${patient.id}`} className="btn btn-ghost">
                        Analytics
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        
        <section className="card dummy-chart">
          <div className="card-header">
            <h2 className="card-title">Stimmungsverlauf (Beispiel)</h2>
          </div>
          <div className="placeholder-chart">
            <div className="chart-placeholder">
              <Activity size={48} />
              <p>Diagramm-Platzhalter</p>
              <span className="text-sm text-muted">
                Detaillierte Analysen werden hier angezeigt
              </span>
            </div>
          </div>
        </section>
        
        <section className="card dummy-chart">
          <div className="card-header">
            <h2 className="card-title">Anrufverteilung (Beispiel)</h2>
          </div>
          <div className="placeholder-chart">
            <div className="chart-placeholder">
              <Phone size={48} />
              <p>Diagramm-Platzhalter</p>
              <span className="text-sm text-muted">
                Anrufstatistiken werden hier angezeigt
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default KlinikOverview

