import { useState, useEffect } from 'react'
import { Phone, Shield, Database, RefreshCw } from 'lucide-react'
import { getPrivateSettings, runCleanup } from '../../api'
import './Einstellungen.css'

function PrivatEinstellungen() {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cleaning, setCleaning] = useState(false)
  const [cleanupResult, setCleanupResult] = useState(null)
  
  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await getPrivateSettings()
        setSettings(data)
      } catch (err) {
        console.error('Failed to load settings:', err)
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
  }, [])
  
  async function handleCleanup() {
    setCleaning(true)
    setCleanupResult(null)
    try {
      const result = await runCleanup()
      setCleanupResult(result)
    } catch (err) {
      setCleanupResult({ error: err.message })
    } finally {
      setCleaning(false)
    }
  }
  
  if (loading) {
    return <div className="loading">Laden...</div>
  }
  
  return (
    <div className="einstellungen-page">
      <header className="page-header">
        <h1 className="page-title">Einstellungen</h1>
        <p className="page-subtitle">Konfiguration und DSGVO-Einstellungen</p>
      </header>
      
      <div className="settings-grid">
        <section className="card">
          <div className="card-header">
            <div className="section-icon">
              <Phone size={20} />
            </div>
            <h2 className="card-title">Twilio Telefonnummern</h2>
          </div>
          
          {settings?.twilio_numbers?.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Nummer</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {settings.twilio_numbers.map(num => (
                  <tr key={num.id}>
                    <td>{num.phone_e164}</td>
                    <td>
                      <span className={`status-badge ${num.is_active ? 'active' : 'inactive'}`}>
                        {num.is_active ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <p>Keine Twilio-Nummern konfiguriert</p>
              <p className="text-sm text-muted">
                Konfigurieren Sie Twilio im Backend über Umgebungsvariablen.
              </p>
            </div>
          )}
        </section>
        
        <section className="card">
          <div className="card-header">
            <div className="section-icon">
              <Shield size={20} />
            </div>
            <h2 className="card-title">DSGVO-Einstellungen</h2>
          </div>
          
          <div className="settings-list">
            <div className="setting-item">
              <div className="setting-info">
                <span className="setting-label">Standard-Einwilligung</span>
                <span className="setting-desc">
                  Neue Personen haben standardmäßig {settings?.default_consent ? 'Einwilligung erteilt' : 'keine Einwilligung'}
                </span>
              </div>
              <span className={`status-badge ${settings?.default_consent ? 'active' : 'inactive'}`}>
                {settings?.default_consent ? 'Erteilt' : 'Nicht erteilt'}
              </span>
            </div>
            
            <div className="setting-item">
              <div className="setting-info">
                <span className="setting-label">Standard-Aufbewahrungsfrist</span>
                <span className="setting-desc">
                  Transkripte und Analysen werden nach dieser Frist automatisch gelöscht
                </span>
              </div>
              <span className="setting-value">{settings?.default_retention_days} Tage</span>
            </div>
          </div>
        </section>
        
        <section className="card">
          <div className="card-header">
            <div className="section-icon">
              <Database size={20} />
            </div>
            <h2 className="card-title">Datenbereinigung</h2>
          </div>
          
          <p className="text-muted mb-md">
            Führen Sie die Bereinigung manuell aus, um abgelaufene Transkripte und Analysen 
            gemäß der Aufbewahrungsfristen zu löschen.
          </p>
          
          <button 
            className="btn btn-secondary"
            onClick={handleCleanup}
            disabled={cleaning}
          >
            <RefreshCw size={16} className={cleaning ? 'spinning' : ''} />
            {cleaning ? 'Bereinigung läuft...' : 'Jetzt bereinigen'}
          </button>
          
          {cleanupResult && (
            <div className={`cleanup-result ${cleanupResult.error ? 'error' : 'success'}`}>
              {cleanupResult.error ? (
                <p>Fehler: {cleanupResult.error}</p>
              ) : (
                <>
                  <p>{cleanupResult.message}</p>
                  <p className="text-sm">
                    {cleanupResult.deleted_transcripts} Transkripte gelöscht, {' '}
                    {cleanupResult.deleted_analyses} Analysen gelöscht
                  </p>
                </>
              )}
            </div>
          )}
        </section>
        
        <section className="card info-card">
          <div className="card-header">
            <h2 className="card-title">🇪🇺 DSGVO-Hinweise</h2>
          </div>
          
          <div className="info-content">
            <h4>Datenverarbeitung</h4>
            <ul>
              <li>Alle Daten werden auf EU-Servern gespeichert</li>
              <li>Transkripte werden verschlüsselt gespeichert (wenn FERNET_KEY konfiguriert)</li>
              <li>Nur bei erteilter Einwilligung werden Transkripte gespeichert</li>
              <li>Automatische Löschung nach Ablauf der Aufbewahrungsfrist</li>
            </ul>
            
            <h4>Twilio-Konfiguration</h4>
            <ul>
              <li>Nutzen Sie die Twilio EU-Region (IE1) für DSGVO-Konformität</li>
              <li>Konfigurieren Sie dies in der Twilio-Konsole unter "Region"</li>
            </ul>
            
            <h4>OpenAI-Nutzung</h4>
            <ul>
              <li>Transkripte werden nicht für Training verwendet</li>
              <li>API-Daten werden gemäß OpenAI Enterprise-Richtlinien behandelt</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  )
}

export default PrivatEinstellungen

