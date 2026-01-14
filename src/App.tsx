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
import MeetingsPage from "./pages/MeetingsPage";
import VideoCallPage from "./pages/VideoCallPage";
import TicketsPage from "./pages/TicketsPage";
import MessagingPage from "./pages/MessagingPage";
import TasksPage from "./pages/TasksPage";
import CompanyChatbotPage from "./pages/CompanyChatbotPage";
import NotFound from "./pages/NotFound";
import { FacialVerificationGuard } from "./components/FacialVerificationGuard";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => (
  <FacialVerificationGuard>{children}</FacialVerificationGuard>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/empresa" element={<ProtectedRoute><CompanyDashboard /></ProtectedRoute>} />
          <Route path="/chatbot" element={<ProtectedRoute><Chatbot /></ProtectedRoute>} />
          <Route path="/ceo-chatbot" element={<ProtectedRoute><CEOChatbotPage /></ProtectedRoute>} />
          <Route path="/ceo-knowledge" element={<ProtectedRoute><CEOKnowledgeManager /></ProtectedRoute>} />
          <Route path="/gestor-documentos" element={<ProtectedRoute><GestorDocumentos /></ProtectedRoute>} />
          <Route path="/organizacion" element={<ProtectedRoute><OrganizationStructure /></ProtectedRoute>} />
          <Route path="/reuniones" element={<ProtectedRoute><MeetingsPage /></ProtectedRoute>} />
          <Route path="/videollamada/:roomId" element={<ProtectedRoute><VideoCallPage /></ProtectedRoute>} />
          <Route path="/tickets" element={<ProtectedRoute><TicketsPage /></ProtectedRoute>} />
          <Route path="/tareas" element={<ProtectedRoute><TasksPage /></ProtectedRoute>} />
          <Route path="/mensajeria" element={<ProtectedRoute><MessagingPage /></ProtectedRoute>} />
          <Route path="/chatbot-empresa" element={<ProtectedRoute><CompanyChatbotPage /></ProtectedRoute>} />
          <Route path="/admin/face-setup" element={<ProtectedRoute><AdminFaceSetup /></ProtectedRoute>} />
          <Route path="/usuarios" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
          <Route path="/superadmin" element={<ProtectedRoute><SuperadminDashboard /></ProtectedRoute>} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
