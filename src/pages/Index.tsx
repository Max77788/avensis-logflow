import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { QRScanner } from "@/components/QRScanner";
import {
  QrCode,
  Truck,
  ClipboardList,
  LogOut,
  Settings,
  Moon,
  Sun,
  Inbox,
  MapPin,
  Search,
} from "lucide-react";
import { ticketService } from "@/lib/ticketService";
import { carrierService } from "@/lib/carrierService";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import type { Ticket } from "@/lib/types";

const Index = () => {
  const [showScanner, setShowScanner] = useState(false);
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
  const [ticketIdInput, setTicketIdInput] = useState("");
  const navigate = useNavigate();
  const { user, driverProfile, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const handleTicketIdSearch = () => {
    if (ticketIdInput.trim()) {
      // Remove "TKT-" prefix if present and navigate
      const ticketId = ticketIdInput.trim().toUpperCase();
      navigate(`/tickets/${ticketId}`);
      setTicketIdInput("");
    }
  };

  useEffect(() => {
    const loadRecentTickets = async () => {
      let tickets: Ticket[] = [];

      if (user?.role === "driver" && driverProfile?.id) {
        // For drivers, show only their tickets
        tickets = await ticketService.getTicketsByDriver(driverProfile.id);
      } else if (user?.role === "attendant") {
        // For attendants, don't show any tickets
        tickets = [];
      } else {
        // For other roles, show all tickets
        tickets = await ticketService.getAllTickets();
      }

      // Get the 5 most recent tickets
      setRecentTickets(tickets.slice(0, 5));
    };
    loadRecentTickets();

    // Refresh tickets every 5 seconds to show newly created tickets
    const interval = setInterval(loadRecentTickets, 5000);
    return () => clearInterval(interval);
  }, [user, driverProfile]);

  const handleScan = async (data: string) => {
    console.log("Scanned QR:", data);

    setShowScanner(false);

    if (data.startsWith("TRUCK-")) {
      const truckId = data.replace("TRUCK-", "");
      navigate(`/tickets/create?truck=${truckId}`);
    } else if (data.startsWith("TICKET-")) {
      const ticketId = data.replace("TICKET-", "");
      navigate(`/tickets/${ticketId}`);
    } else if (data.startsWith("DRIVER-")) {
      // Handle driver QR code scan
      try {
        const driver = await carrierService.getDriverByQRCode(data);
        if (driver) {
          // Fetch driver's active tickets
          const activeTickets = await ticketService.getActiveTicketsByDriver(
            driver.id
          );
          if (activeTickets.length > 0) {
            // Show the first active ticket
            navigate(`/tickets/${activeTickets[0].ticket_id}`);
          }
        }
      } catch (error) {
        console.error("Error scanning driver QR:", error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Truck className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Truck IT</h1>
              <p className="text-xs text-muted-foreground">Digital Ticketing</p>
            </div>
          </div>

          {/* User Section */}
          {user ? (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">
                  {driverProfile?.name || "User"}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {user.role}
                </p>
              </div>
              <div className="flex gap-2">
                {user.role === "driver" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate("/driver/profile")}
                    className="rounded-full"
                    title="Profile"
                  >
                    <Settings className="h-5 w-5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  className="rounded-full"
                  title={isDark ? "Light mode" : "Dark mode"}
                >
                  {isDark ? (
                    <Sun className="h-5 w-5" />
                  ) : (
                    <Moon className="h-5 w-5" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                  className="rounded-full"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate("/login")}>
                Login
              </Button>
              <Button onClick={() => navigate("/driver/signup")}>
                Sign Up
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Action Cards */}
          {user?.role !== "driver" && (
            <div className="grid gap-4 sm:grid-cols-1">
              <Card
                className="group cursor-pointer overflow-hidden transition-all hover:shadow-glow"
                onClick={() => setShowScanner(true)}
              >
                <div className="space-y-4 p-6">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                    <QrCode className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <h3 className="mb-1 text-lg font-bold text-foreground">
                      Scan QR Code
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {user?.role === "attendant"
                        ? "Scan driver QR code to view tickets"
                        : "Scan truck or ticket QR code"}
                    </p>
                  </div>
                  <Button className="w-full" size="lg">
                    Open Scanner
                  </Button>
                </div>
              </Card>

              {/* Ticket ID Search - For Attendants */}
              {user?.role === "attendant" && (
                <Card className="overflow-hidden shadow-md">
                  <div className="space-y-4 p-6">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100 transition-colors">
                      <Search className="h-7 w-7 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="mb-1 text-lg font-bold text-foreground">
                        Enter Ticket ID
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Type ticket ID (e.g., TKT-12345) to access a ticket
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="TKT-12345"
                        value={ticketIdInput}
                        onChange={(e) =>
                          setTicketIdInput(e.target.value.toUpperCase())
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleTicketIdSearch();
                          }
                        }}
                        className="flex-1"
                      />
                      <Button
                        onClick={handleTicketIdSearch}
                        disabled={!ticketIdInput.trim()}
                        size="lg"
                      >
                        Search
                      </Button>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}

          {user?.role === "driver" && (
            <div className="grid gap-4 sm:grid-cols-1">
              <Card
                className="group cursor-pointer overflow-hidden transition-all hover:shadow-glow"
                onClick={() => navigate("/tickets/create")}
              >
                <div className="space-y-4 p-6">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-success/10 transition-colors group-hover:bg-success/20">
                    <ClipboardList className="h-7 w-7 text-success" />
                  </div>
                  <div>
                    <h3 className="mb-1 text-lg font-bold text-foreground">
                      Create Ticket
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Manually create new ticket
                    </p>
                  </div>
                  <Button className="w-full" size="lg">
                    Create New Ticket +
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* Recent Activity */}
          <Card className="mt-8 shadow-md">
            <div className="border-b border-border p-4">
              <h3 className="font-semibold text-foreground">Recent Activity</h3>
            </div>
            {recentTickets.length === 0 ? (
              <div className="p-12 text-center">
                <div className="flex justify-center mb-4">
                  <div className="rounded-full bg-muted p-4">
                    <Inbox className="h-8 w-8 text-muted-foreground" />
                  </div>
                </div>
                <p className="font-medium text-foreground mb-1">
                  No recent activity
                </p>
                <p className="text-sm text-muted-foreground">
                  {user?.role === "driver"
                    ? "Create a new ticket or scan a QR code to get started"
                    : "Scan a driver QR code to view their tickets"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentTickets.map((ticket) => (
                  <div
                    key={ticket.ticket_id}
                    className="cursor-pointer p-4 transition-all duration-200 hover:bg-accent/50 active:scale-98 flex items-center justify-between gap-4"
                    onClick={() => navigate(`/tickets/${ticket.ticket_id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">
                        {ticket.ticket_id}
                      </p>
                      <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">
                          {ticket.destination_site || "N/A"}
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={ticket.status} />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </main>

      {/* QR Scanner Modal */}
      {showScanner && (
        <QRScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
      )}
    </div>
  );
};

export default Index;
