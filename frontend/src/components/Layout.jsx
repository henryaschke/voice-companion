import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  Phone,
  Activity,
  Heart
} from 'lucide-react'
import './Layout.css'

function Layout({ portal }) {
  const location = useLocation()
  
  const isPrivate = portal === 'private'
  const basePath = isPrivate ? '/privat' : '/klinik'
  
  const privateNav = [
    { path: '/privat/dashboard', label: 'Übersicht', icon: LayoutDashboard },
    { path: '/privat/personen', label: 'Personen', icon: Users },
    { path: '/privat/einstellungen', label: 'Einstellungen', icon: Settings }
  ]
  
  const clinicalNav = [
    { path: '/klinik', label: 'Übersicht', icon: Activity, exact: true },
    { path: '/klinik/patienten', label: 'Patienten', icon: Users }
  ]
  
  const navItems = isPrivate ? privateNav : clinicalNav
  
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <Heart className="logo-icon" />
            <div className="logo-text">
              <span className="logo-title">Voice Companion</span>
              <span className="logo-subtitle">
                {isPrivate ? 'Privatbereich' : 'Klinikbereich'}
              </span>
            </div>
          </div>
        </div>
        
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive }) => 
                `nav-item ${isActive ? 'active' : ''}`
              }
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        
        <div className="sidebar-footer">
          <div className="portal-switcher">
            <NavLink 
              to="/privat/dashboard" 
              className={`portal-btn ${isPrivate ? 'active' : ''}`}
            >
              Privat
            </NavLink>
            <NavLink 
              to="/klinik" 
              className={`portal-btn ${!isPrivate ? 'active' : ''}`}
            >
              Klinik
            </NavLink>
          </div>
          <div className="gdpr-badge">
            <span>🇪🇺 DSGVO-konform</span>
          </div>
        </div>
      </aside>
      
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout

