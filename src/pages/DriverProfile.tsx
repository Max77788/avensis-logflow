import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  QrCode,
  LogOut,
  Plus,
  User,
  Truck,
  Building2,
  Download,
  Power,
  Home,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { carrierService } from "@/lib/carrierService";
import { ticketService } from "@/lib/ticketService";
import type { Ticket } from "@/lib/types";

const DriverProfile = () => {
  const navigate = useNavigate();
  const { user, driverProfile, logout, updateDriverStatus } = useAuth();
  const [activeTickets, setActiveTickets] = useState<Ticket[]>([]);
  const [completedTickets, setCompletedTickets] = useState<Ticket[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "driver") {
      navigate("/");
      return;
    }

    const loadActiveTickets = async () => {
      setIsLoadingTickets(true);
      try {
        const allTickets = await ticketService.getAllTickets();

        const active = allTickets.filter(
          (t) =>
            t.driver_id === driverProfile?.id &&
            (t.status === "CREATED" ||
              t.status === "VERIFIED_AT_SCALE" ||
              t.status === "IN_TRANSIT")
        );

        const completed = allTickets.filter(
          (t) => t.driver_id === driverProfile?.id && t.status === "DELIVERED"
        );

        setActiveTickets(active);
        setCompletedTickets(completed); 
      } catch (error) {
        console.error("Error loading tickets:", error);
      } finally {
        setIsLoadingTickets(false);
      }
    };

    loadActiveTickets();
    const interval = setInterval(loadActiveTickets, 5000);
    return () => clearInterval(interval);
  }, [user, navigate]);

  const handleToggleStatus = async () => {
    if (!driverProfile) return;

    setIsTogglingStatus(true);
    try {
      const newStatus =
        driverProfile.status === "active" ? "inactive" : "active";
      const result = await carrierService.updateDriverStatus(
        driverProfile.id,
        newStatus
      );

      if (result.success) {
        updateDriverStatus(newStatus);
        toast({
          title: "Status Updated",
          description: `You are now ${newStatus}`,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const handleDownloadQR = async () => {
    if (!driverProfile) return;

    try {
      // Get the QR code SVG element by ID
      const svgElement = document.getElementById(
        "driver-qr-code"
      ) as SVGElement;
      if (!svgElement) {
        toast({
          title: "Error",
          description: "Could not find QR code to download",
          variant: "destructive",
        });
        return;
      }

      // Create canvas
      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 500;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // White background
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Title
      ctx.fillStyle = "black";
      ctx.font = "bold 24px Arial";
      ctx.textAlign = "center";
      ctx.fillText("Driver QR Code", canvas.width / 2, 40);

      // Driver name
      ctx.font = "18px Arial";
      ctx.fillText(driverProfile.name, canvas.width / 2, 80);

      // Convert SVG to image
      const svgString = new XMLSerializer().serializeToString(svgElement);
      const img = new Image();
      img.onload = () => {
        // Draw QR code centered
        const qrSize = 250;
        const x = (canvas.width - qrSize) / 2;
        const y = 120;
        ctx.drawImage(img, x, y, qrSize, qrSize);

        // QR code text
        ctx.font = "12px monospace";
        ctx.fillStyle = "#666";
        ctx.textAlign = "center";
        ctx.fillText(driverProfile.driver_qr_code, canvas.width / 2, 420);

        // Download
        const link = document.createElement("a");
        link.href = canvas.toDataURL("image/png");
        link.download = `driver-qr-${driverProfile.id}.png`;
        link.click();

        toast({
          title: "Downloaded",
          description: "QR code saved to your downloads",
        });
      };
      img.src = "data:image/svg+xml;base64," + btoa(svgString);
    } catch (error) {
      console.error("Error downloading QR code:", error);
      toast({
        title: "Error",
        description: "Failed to download QR code",
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged Out",
      description: "See you next time!",
    });
    navigate("/login");
  };

  if (!user || user.role !== "driver") {
    return null;
  }

  if (!driverProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Loading profile...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <User className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Driver Profile
              </h1>
              <p className="text-xs text-muted-foreground">
                {driverProfile.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/")}
              className="gap-2"
            >
              <Home className="h-4 w-4" />
              Home
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="rounded-full"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Status Card */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Status</h2>
              <Badge
                variant={
                  driverProfile.status === "active" ? "default" : "secondary"
                }
              >
                {driverProfile.status.toUpperCase()}
              </Badge>
            </div>
            <Button
              onClick={handleToggleStatus}
              disabled={isTogglingStatus}
              className="w-full"
              variant={
                driverProfile.status === "active" ? "destructive" : "default"
              }
            >
              <Power className="mr-2 h-4 w-4" />
              {driverProfile.status === "active" ? "Go Offline" : "Go Online"}
            </Button>
          </Card>

          {/* Driver Info Card */}
          <Card className="p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">
              Driver Information
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="font-medium text-foreground">
                    {driverProfile.name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Carrier</p>
                  <p className="font-medium text-foreground">
                    {driverProfile.carrier_id}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Truck className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Default Truck</p>
                  <p className="font-medium text-foreground">
                    {driverProfile.default_truck_id}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* QR Code Card */}
          <Card className="p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">
              My QR Code
            </h2>
            <div className="bg-white p-6 rounded-lg text-center mb-4 flex justify-center">
              <QRCodeSVG
                id="driver-qr-code"
                value={driverProfile.driver_qr_code}
                size={200}
                level="H"
                includeMargin={true}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center mb-4 break-all">
              {driverProfile.driver_qr_code}
            </p>
            <Button
              onClick={handleDownloadQR}
              className="w-full"
              variant="outline"
            >
              <Download className="mr-2 h-4 w-4" />
              Download QR Code
            </Button>
          </Card>

          {/* Active Tickets */}
          <Card className="p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">
              Active Tickets ({activeTickets.length})
            </h2>
            {isLoadingTickets ? (
              <p className="text-muted-foreground">Loading tickets...</p>
            ) : activeTickets.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No active tickets</p>
                <Button onClick={() => navigate("/tickets/create")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Ticket
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {activeTickets.map((ticket) => (
                  <div
                    key={ticket.ticket_id}
                    className="p-3 border border-border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => navigate(`/tickets/${ticket.ticket_id}`)}
                  >
                    <p className="font-medium text-foreground">
                      {ticket.ticket_id}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {ticket.product} • {ticket.origin_site} →{" "}
                      {ticket.destination_site}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">
              Completed Tickets ({completedTickets.length})
            </h2>
            {isLoadingTickets ? (
              <p className="text-muted-foreground">Loading tickets...</p>
            ) : completedTickets.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No active tickets</p>
                <Button onClick={() => navigate("/tickets/create")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Ticket
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {completedTickets.map((ticket) => (
                  <div
                    key={ticket.ticket_id}
                    className="p-3 border border-border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => navigate(`/tickets/${ticket.ticket_id}`)}
                  >
                    <p className="font-medium text-foreground">
                      {ticket.ticket_id}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {ticket.product} • {ticket.origin_site} →{" "}
                      {ticket.destination_site}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Create Ticket Button */}
          <Button
            onClick={() => navigate("/tickets/create")}
            className="w-full"
            size="lg"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create New Ticket
          </Button>
        </div>
      </main>
    </div>
  );
};

export default DriverProfile;
