import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CompanyDashboard from "./pages/CompanyDashboard";
import Chatbot from "./pages/Chatbot";
import GestorDocumentos from "./pages/GestorDocumentos";
import AdminFaceSetup from "./pages/AdminFaceSetup";
import UserManagement from "./pages/UserManagement";
import SuperadminDashboard from "./pages/SuperadminDashboard";
import OrganizationStructure from "./pages/OrganizationStructure";
import CEOChatbotPage from "./pages/CEOChatbotPage";
import CEOKnowledgeManager from "./pages/CEOKnowledgeManager";
import CEOChatPage from "./pages/CEOChatPage";
import CEODashboardPage from "./pages/CEODashboardPage";
import MeetingsPage from "./pages/MeetingsPage";
import VideoCallPage from "./pages/VideoCallPage";
import TicketsPage from "./pages/TicketsPage";
import MessagingPage from "./pages/MessagingPage";
import TasksPage from "./pages/TasksPage";
import CompanyChatbotPage from "./pages/CompanyChatbotPage";
import BudgetPage from "./pages/BudgetPage";
import IwieChat from "./pages/IwieChat";
import MisionIwiePage from "./pages/MisionIwiePage";
import ConfiguracionPage from "./pages/ConfiguracionPage";
import BrainGalaxyPage from "./pages/BrainGalaxyPage";
import NotFound from "./pages/NotFound";
import { FacialVerificationGuard } from "./components/FacialVerificationGuard";
import { IncomingCallAlert } from "./components/meetings/IncomingCallAlert";
import { MobileBlocker } from "./components/MobileBlocker";
import { CameraProvider } from "./contexts/CameraContext";
import { useSupabaseAuth } from "./hooks/useSupabaseAuth";

// QueryClient for React Query data fetching
const queryClient = new QueryClient();

// Protected route with facial verification and mobile blocking for dashboard pages
const ProtectedRoute = ({ children, blockMobile = false }: { children: React.ReactNode; blockMobile?: boolean }) => (
  <FacialVerificationGuard>
    {blockMobile ? <MobileBlocker>{children}</MobileBlocker> : children}
  </FacialVerificationGuard>
);

function AppContent() {
  const { user } = useSupabaseAuth();

  return (
    <>
      {/* Global incoming call alert - shows on any page when user is logged in */}
      {user && <IncomingCallAlert userId={user.id} />}
      
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        
        {/* Dashboard pages blocked on mobile */}
        <Route path="/dashboard" element={<ProtectedRoute blockMobile><Dashboard /></ProtectedRoute>} />
        <Route path="/empresa" element={<ProtectedRoute blockMobile><CompanyDashboard /></ProtectedRoute>} />
        <Route path="/chatbot" element={<ProtectedRoute blockMobile><Chatbot /></ProtectedRoute>} />
        <Route path="/ceo-chatbot" element={<ProtectedRoute blockMobile><CEOChatbotPage /></ProtectedRoute>} />
        <Route path="/ceo-chat" element={<ProtectedRoute blockMobile><CEOChatPage /></ProtectedRoute>} />
        <Route path="/ceo-dashboard" element={<ProtectedRoute blockMobile><CEODashboardPage /></ProtectedRoute>} />
        <Route path="/ceo-knowledge" element={<ProtectedRoute blockMobile><CEOKnowledgeManager /></ProtectedRoute>} />
        <Route path="/gestor-documentos" element={<ProtectedRoute blockMobile><GestorDocumentos /></ProtectedRoute>} />
        <Route path="/organizacion" element={<ProtectedRoute blockMobile><OrganizationStructure /></ProtectedRoute>} />
        <Route path="/reuniones" element={<ProtectedRoute blockMobile><MeetingsPage /></ProtectedRoute>} />
        <Route path="/tickets" element={<ProtectedRoute blockMobile><TicketsPage /></ProtectedRoute>} />
        <Route path="/tareas" element={<ProtectedRoute blockMobile><TasksPage /></ProtectedRoute>} />
        <Route path="/presupuestos" element={<ProtectedRoute blockMobile><BudgetPage /></ProtectedRoute>} />
        <Route path="/mensajeria" element={<ProtectedRoute blockMobile><MessagingPage /></ProtectedRoute>} />
        <Route path="/chatbot-empresa" element={<ProtectedRoute blockMobile><CompanyChatbotPage /></ProtectedRoute>} />
        <Route path="/admin/face-setup" element={<ProtectedRoute blockMobile><AdminFaceSetup /></ProtectedRoute>} />
        <Route path="/usuarios" element={<ProtectedRoute blockMobile><UserManagement /></ProtectedRoute>} />
        <Route path="/superadmin" element={<ProtectedRoute blockMobile><SuperadminDashboard /></ProtectedRoute>} />
        
        {/* Mobile-friendly pages - no mobile blocking */}
        <Route path="/mision-iwie" element={<ProtectedRoute><MisionIwiePage /></ProtectedRoute>} />
        <Route path="/brain-galaxy" element={<ProtectedRoute><BrainGalaxyPage /></ProtectedRoute>} />
        <Route path="/iwiechat" element={<ProtectedRoute><IwieChat /></ProtectedRoute>} />
        <Route path="/videollamada/:roomId" element={<ProtectedRoute><VideoCallPage /></ProtectedRoute>} />
        <Route path="/configuracion" element={<ProtectedRoute><ConfiguracionPage /></ProtectedRoute>} />
        
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

// Wrapper that provides CameraContext (needs to be inside BrowserRouter)
function AppWithCameraProvider() {
  return (
    <CameraProvider>
      <AppContent />
    </CameraProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppWithCameraProvider />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
