import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { QRScanner } from "@/components/QRScanner";
import { QrCode, Truck, ClipboardList, User } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const Index = () => {
  const [showScanner, setShowScanner] = useState(false);
  const navigate = useNavigate();

  const handleScan = (data: string) => {
    console.log("Scanned QR:", data);
    
    // Check if it's a truck QR (permanent) or ticket QR (temporary)
    if (data.startsWith("TRUCK-")) {
      // Navigate to create ticket with truck ID prefilled
      const truckId = data.replace("TRUCK-", "");
      navigate(`/tickets/create?truck=${truckId}`);
      toast({
        title: "Truck QR Scanned",
        description: `Creating ticket for Truck ${truckId}`,
      });
    } else if (data.startsWith("TICKET-")) {
      // Navigate to ticket details
      const ticketId = data.replace("TICKET-", "");
      navigate(`/tickets/${ticketId}`);
      toast({
        title: "Ticket QR Scanned",
        description: `Opening ticket ${ticketId}`,
      });
    } else {
      toast({
        title: "Invalid QR Code",
        description: "Please scan a valid Avensis QR code",
        variant: "destructive",
      });
    }
    
    setShowScanner(false);
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
              <h1 className="text-xl font-bold text-foreground">Avensis Digital</h1>
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
                <h3 className="mb-2 font-semibold text-accent-foreground">Quick Start</h3>
                <p className="text-sm text-muted-foreground">
                  Scan a truck QR code to create a new delivery ticket, or scan a ticket QR to view delivery details.
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
                  <h3 className="mb-1 text-lg font-bold text-foreground">Scan QR Code</h3>
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
                  <h3 className="mb-1 text-lg font-bold text-foreground">Create Ticket</h3>
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

          {/* Recent Activity (placeholder) */}
          <Card className="mt-8 shadow-md">
            <div className="border-b border-border p-4">
              <h3 className="font-semibold text-foreground">Recent Activity</h3>
            </div>
            <div className="p-8 text-center">
              <ClipboardList className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No recent tickets. Scan a QR code or create a new ticket to get started.
              </p>
            </div>
          </Card>
        </div>
      </main>

      {/* QR Scanner Modal */}
      {showScanner && (
        <QRScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
};

export default Index;
