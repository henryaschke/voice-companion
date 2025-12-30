import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'

// Private Portal Pages
import PrivateDashboard from './pages/privat/Dashboard'
import PrivatPersonen from './pages/privat/Personen'
import PrivatPersonDetail from './pages/privat/PersonDetail'
import PrivatEinstellungen from './pages/privat/Einstellungen'

// Clinical Portal Pages
import KlinikOverview from './pages/klinik/Overview'
import KlinikPatienten from './pages/klinik/Patienten'
import KlinikPatientDetail from './pages/klinik/PatientDetail'

function App() {
  return (
    <Routes>
      {/* Redirect root to private dashboard */}
      <Route path="/" element={<Navigate to="/privat/dashboard" replace />} />
      
      {/* Private Portal */}
      <Route path="/privat" element={<Layout portal="private" />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<PrivateDashboard />} />
        <Route path="personen" element={<PrivatPersonen />} />
        <Route path="personen/:id" element={<PrivatPersonDetail />} />
        <Route path="einstellungen" element={<PrivatEinstellungen />} />
      </Route>
      
      {/* Clinical Portal */}
      <Route path="/klinik" element={<Layout portal="clinical" />}>
        <Route index element={<KlinikOverview />} />
        <Route path="patienten" element={<KlinikPatienten />} />
        <Route path="patienten/:id" element={<KlinikPatientDetail />} />
      </Route>
    </Routes>
  )
}

export default App

