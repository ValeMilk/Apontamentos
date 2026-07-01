import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Index from "./pages/Index";
import { LoginPage } from "./pages/LoginPage";
import AdminUsers from "./pages/AdminUsers";
import AuditLogs from "./pages/AuditLogs";
import ExportPage from "./pages/ExportPage";
import { HiringForm } from "./pages/HiringPage";
import HiringListPage from "./pages/HiringListPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/login" replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/usuarios"
            element={
              <ProtectedRoute>
                <AdminUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/logs"
            element={
              <ProtectedRoute>
                <AuditLogs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/exportacao"
            element={
              <ProtectedRoute>
                <ExportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/contratacao"
            element={
              <ProtectedRoute>
                {(() => {
                  const { user } = useAuth();
                  return user?.role === 'supervisor' ? <HiringForm /> : <Navigate to="/" />;
                })()}
              </ProtectedRoute>
            }
          />
          <Route
            path="/contratacoes"
            element={
              <ProtectedRoute>
                {(() => {
                  const { user } = useAuth();
                  return ['admin', 'gerente'].includes(user?.role || '') ? (
                    <HiringListPage />
                  ) : (
                    <Navigate to="/" />
                  );
                })()}
              </ProtectedRoute>
            }
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
