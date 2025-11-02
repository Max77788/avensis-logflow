import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import DriverSignUp from "./pages/DriverSignUp";
import DriverProfile from "./pages/DriverProfile";
import CreateTicket from "./pages/CreateTicket";
import TicketDetails from "./pages/TicketDetails";
import DeliverTicket from "./pages/DeliverTicket";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import { initDatabase } from "./lib/initDatabase";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    initDatabase();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/driver/signup" element={<DriverSignUp />} />

              {/* Protected routes - require authentication */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/driver/profile"
                element={
                  <ProtectedRoute requiredRole="driver">
                    <DriverProfile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tickets/create"
                element={
                  <ProtectedRoute requiredRole="driver">
                    <CreateTicket />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tickets/:id"
                element={
                  <ProtectedRoute>
                    <TicketDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tickets/:id/deliver"
                element={
                  <ProtectedRoute>
                    <DeliverTicket />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <Admin />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
