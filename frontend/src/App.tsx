import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PortalProvider } from "@/contexts/PortalContext";
import Dashboard from "./pages/Dashboard";
import Conversations from "./pages/Conversations";
import Services from "./pages/Services";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import PersonalContext from "./pages/PersonalContext";
import NotFound from "./pages/NotFound";
// Care Home Portal Pages
import CareHomeResidents from "./pages/care/CareHomeResidents";
import ResidentDetail from "./pages/care/ResidentDetail";
import CareHomeInsights from "./pages/care/CareHomeInsights";
import FamilySharing from "./pages/care/FamilySharing";
import CareHomeSettings from "./pages/care/CareHomeSettings";
// Doctor Portal Pages
import PatientsList from "./pages/doctor/PatientsList";
import PatientSummary from "./pages/doctor/PatientSummary";
import DoctorSettings from "./pages/doctor/DoctorSettings";
// Shared Pages
import AddUser from "./pages/AddUser";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <PortalProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Family Portal Routes */}
            <Route path="/" element={<Dashboard />} />
            <Route path="/conversations" element={<Conversations />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/personal-context" element={<PersonalContext />} />
            <Route path="/services" element={<Services />} />
            <Route path="/settings" element={<Settings />} />
            
            {/* Care Home Portal Routes */}
            <Route path="/care/residents" element={<CareHomeResidents />} />
            <Route path="/care/residents/:id" element={<ResidentDetail />} />
            <Route path="/care/insights" element={<CareHomeInsights />} />
            <Route path="/care/family-sharing" element={<FamilySharing />} />
            <Route path="/care/settings" element={<CareHomeSettings />} />
            <Route path="/care/add-resident" element={<AddUser />} />
            
            {/* Doctor Portal Routes */}
            <Route path="/doctor/patients" element={<PatientsList />} />
            <Route path="/doctor/patients/:id" element={<PatientSummary />} />
            <Route path="/doctor/settings" element={<DoctorSettings />} />
            <Route path="/doctor/add-patient" element={<AddUser />} />
            
            {/* Family Portal Routes - Add User */}
            <Route path="/add-user" element={<AddUser />} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </PortalProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
