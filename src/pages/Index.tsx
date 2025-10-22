import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { QRScanner } from "@/components/QRScanner";
import {
  QrCode,
  Truck,
  ClipboardList,
  User,
  MapPin,
  Package,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ticketService } from "@/lib/ticketService";
import { StatusBadge } from "@/components/StatusBadge";
import type { Ticket } from "@/lib/types";

// Helper function to format date and time
const formatDateTime = (dateString: string | undefined) => {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  } catch {
    return null;
  }
};

const Index = () => {
  const [showScanner, setShowScanner] = useState(false);
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const loadRecentTickets = async () => {
      const allTickets = await ticketService.getAllTickets();
      // Get the 5 most recent tickets
      setRecentTickets(allTickets.slice(0, 5));
    };
    loadRecentTickets();

    // Refresh tickets every 5 seconds to show newly created tickets
    const interval = setInterval(loadRecentTickets, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleScan = (data: string) => {
    console.log("Scanned QR:", data);

    setShowScanner(false);

    if (data.startsWith("TRUCK-")) {
      const truckId = data.replace("TRUCK-", "");
      toast({
        title: "Truck QR Scanned",
        description: `Creating ticket for Truck ${truckId}`,
      });
      navigate(`/tickets/create?truck=${truckId}`);
    } else if (data.startsWith("TICKET-")) {
      const ticketId = data.replace("TICKET-", "");
      navigate(`/tickets/${ticketId}`);
    } else {
      toast({
        title: "Invalid QR Code",
        description: "Please scan a valid Avensis QR code",
        variant: "destructive",
      });
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
              <h1 className="text-xl font-bold text-foreground">
                Avensis Digital
              </h1>
              <p className="text-xs text-muted-foreground">Ticketing System</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin")}
            className="rounded-full"
          >
            <User className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl">
          {/* Welcome Card */}
          <Card className="mb-8 overflow-hidden shadow-lg">
            <div className="bg-gradient-to-r from-primary to-primary-hover p-8 text-center text-primary-foreground">
              <Truck className="mx-auto mb-4 h-16 w-16" />
              <h2 className="mb-2 text-3xl font-bold">Welcome</h2>
              <p className="text-primary-foreground/90">
                Digital Ticketing for Modern Logistics
              </p>
            </div>
            <div className="space-y-4 p-6">
              <div className="rounded-lg bg-accent/50 p-4">
                <h3 className="mb-2 font-semibold text-accent-foreground">
                  Quick Start
                </h3>
                <p className="text-sm text-muted-foreground">
                  Scan a truck QR code to create a new delivery ticket, or scan
                  a ticket QR to view delivery details.
                </p>
              </div>
            </div>
          </Card>

          {/* Action Cards */}
          <div className="grid gap-4 sm:grid-cols-2">
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
                    Scan truck or ticket QR code
                  </p>
                </div>
                <Button className="w-full" size="lg">
                  Open Scanner
                </Button>
              </div>
            </Card>

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
                <Button variant="outline" className="w-full" size="lg">
                  Create New
                </Button>
              </div>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card className="mt-8 shadow-md">
            <div className="border-b border-border p-4">
              <h3 className="font-semibold text-foreground">Recent Activity</h3>
            </div>
            {recentTickets.length === 0 ? (
              <div className="p-8 text-center">
                <ClipboardList className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  No recent tickets. Scan a QR code or create a new ticket to
                  get started.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentTickets.map((ticket) => {
                  const createdTime = formatDateTime(ticket.created_at);
                  const confirmedTime = formatDateTime(ticket.delivered_at);
                  const verifiedTime = formatDateTime(ticket.verified_at_scale);

                  return (
                    <div
                      key={ticket.ticket_id}
                      className="cursor-pointer p-4 transition-colors hover:bg-accent/50"
                      onClick={() => navigate(`/tickets/${ticket.ticket_id}`)}
                    >
                      <div className="mb-3 flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-foreground">
                            {ticket.ticket_id}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Truck {ticket.truck_id} • {ticket.product}
                          </p>
                        </div>
                        <StatusBadge status={ticket.status} />
                      </div>

                      {/* Location and Weight */}
                      <div className="mb-3 flex gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span>{ticket.origin_site}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          <span>
                            {ticket.net_weight
                              ? `${ticket.net_weight.toFixed(2)} kg`
                              : "N/A"}
                          </span>
                        </div>
                      </div>

                      {/* Timeline */}
                      <div className="space-y-2 border-t border-border/50 pt-3">
                        {/* Created */}
                        <div className="flex items-start gap-2 text-xs">
                          <div className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary/20">
                            <div className="h-2 w-2 rounded-full bg-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-foreground">
                              Created
                            </p>
                            <p className="text-muted-foreground">
                              {createdTime}
                            </p>
                          </div>
                        </div>

                        {/* Verified at Scale */}
                        {verifiedTime && (
                          <div className="flex items-start gap-2 text-xs">
                            <div className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-success/20">
                              <CheckCircle2 className="h-2.5 w-2.5 text-success" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-foreground">
                                Verified at Scale
                              </p>
                              <p className="text-muted-foreground">
                                {verifiedTime}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Delivered */}
                        {confirmedTime && (
                          <div className="flex items-start gap-2 text-xs">
                            <div className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-success/20">
                              <CheckCircle2 className="h-2.5 w-2.5 text-success" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-foreground">
                                Delivered
                              </p>
                              <p className="text-muted-foreground">
                                {confirmedTime}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
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
