import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { TourProvider } from "@/components/tour";
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
import BudgetPage from "./pages/BudgetPage";
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
          
          <Route path="/dashboard" element={<ProtectedRoute><TourProvider><Dashboard /></TourProvider></ProtectedRoute>} />
          <Route path="/empresa" element={<ProtectedRoute><TourProvider><CompanyDashboard /></TourProvider></ProtectedRoute>} />
          <Route path="/chatbot" element={<ProtectedRoute><TourProvider><Chatbot /></TourProvider></ProtectedRoute>} />
          <Route path="/ceo-chatbot" element={<ProtectedRoute><TourProvider><CEOChatbotPage /></TourProvider></ProtectedRoute>} />
          <Route path="/ceo-knowledge" element={<ProtectedRoute><TourProvider><CEOKnowledgeManager /></TourProvider></ProtectedRoute>} />
          <Route path="/gestor-documentos" element={<ProtectedRoute><TourProvider><GestorDocumentos /></TourProvider></ProtectedRoute>} />
          <Route path="/organizacion" element={<ProtectedRoute><TourProvider><OrganizationStructure /></TourProvider></ProtectedRoute>} />
          <Route path="/reuniones" element={<ProtectedRoute><TourProvider><MeetingsPage /></TourProvider></ProtectedRoute>} />
          <Route path="/videollamada/:roomId" element={<ProtectedRoute><VideoCallPage /></ProtectedRoute>} />
          <Route path="/tickets" element={<ProtectedRoute><TourProvider><TicketsPage /></TourProvider></ProtectedRoute>} />
          <Route path="/tareas" element={<ProtectedRoute><TourProvider><TasksPage /></TourProvider></ProtectedRoute>} />
          <Route path="/presupuestos" element={<ProtectedRoute><TourProvider><BudgetPage /></TourProvider></ProtectedRoute>} />
          <Route path="/mensajeria" element={<ProtectedRoute><TourProvider><MessagingPage /></TourProvider></ProtectedRoute>} />
          <Route path="/chatbot-empresa" element={<ProtectedRoute><TourProvider><CompanyChatbotPage /></TourProvider></ProtectedRoute>} />
          <Route path="/admin/face-setup" element={<ProtectedRoute><AdminFaceSetup /></ProtectedRoute>} />
          <Route path="/usuarios" element={<ProtectedRoute><TourProvider><UserManagement /></TourProvider></ProtectedRoute>} />
          <Route path="/superadmin" element={<ProtectedRoute><TourProvider><SuperadminDashboard /></TourProvider></ProtectedRoute>} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
