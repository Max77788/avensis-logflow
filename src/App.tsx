import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ShiftProvider } from "./contexts/ShiftContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { LanguageSelector } from "./components/LanguageSelector";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import DriverSignUp from "./pages/DriverSignUp";
import DriverProfile from "./pages/DriverProfile";
import CreateTicket from "./pages/CreateTicket";
import ScaleHouse from "./pages/ScaleHouse";
import TicketDetails from "./pages/TicketDetails";
import DeliverTicket from "./pages/DeliverTicket";
import DestinationAttendant from "./pages/DestinationAttendant";
import DestinationAttendantConfirm from "./pages/DestinationAttendantConfirm";
import Admin from "./pages/Admin";
import Overview from "./pages/Overview";
import NotFound from "./pages/NotFound";
import { initDatabase } from "./lib/initDatabase";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    initDatabase();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <ThemeProvider>
          <AuthProvider>
            <ShiftProvider>
              <TooltipProvider>
                <Toaster />
                <LanguageSelector isModal={true} />
                <BrowserRouter>
                  <Routes>
                    {/* Public routes */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/driver/signup" element={<DriverSignUp />} />
                    <Route path="/overview" element={<Overview />} />

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
                      path="/scale-house"
                      element={
                        <ProtectedRoute requiredRole="driver">
                          <ScaleHouse />
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
                      path="/tickets/:id/confirm"
                      element={
                        <ProtectedRoute requiredRole="attendant">
                          <DestinationAttendant />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/tickets/:id/confirm-delivery"
                      element={
                        <ProtectedRoute requiredRole={["driver", "attendant"]}>
                          <DestinationAttendantConfirm />
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
            </ShiftProvider>
          </AuthProvider>
        </ThemeProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
};

export default App;
