import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Chatbot from "./pages/Chatbot";
import GestorDocumentos from "./pages/GestorDocumentos";
import AdminFaceSetup from "./pages/AdminFaceSetup";
import UserManagement from "./pages/UserManagement";
import SuperadminDashboard from "./pages/SuperadminDashboard";
import NotFound from "./pages/NotFound";
import { FacialVerificationGuard } from "./components/FacialVerificationGuard";

const queryClient = new QueryClient();

// Wrapper component for protected routes that require facial verification
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
          
          {/* Protected routes - require facial verification */}
          <Route path="/dashboard" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/chatbot" element={
            <ProtectedRoute><Chatbot /></ProtectedRoute>
          } />
          <Route path="/gestor-documentos" element={
            <ProtectedRoute><GestorDocumentos /></ProtectedRoute>
          } />
          <Route path="/admin/face-setup" element={
            <ProtectedRoute><AdminFaceSetup /></ProtectedRoute>
          } />
          <Route path="/usuarios" element={
            <ProtectedRoute><UserManagement /></ProtectedRoute>
          } />
          <Route path="/superadmin" element={
            <ProtectedRoute><SuperadminDashboard /></ProtectedRoute>
          } />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
