import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { QRScanner } from "@/components/QRScanner";
import { DriverOnboardingModal } from "@/components/DriverOnboardingModal";
import { Header } from "@/components/Header";
import {
  QrCode,
  ClipboardList,
  Inbox,
  MapPin,
  Search,
  Power,
  AlertCircle,
  BookOpen,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ticketService } from "@/lib/ticketService";
import { carrierService } from "@/lib/carrierService";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "@/components/ui/use-toast";
import type { Ticket } from "@/lib/types";

const Index = () => {
  const [showScanner, setShowScanner] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
  const [ticketIdInput, setTicketIdInput] = useState("");
  const [showEndShiftWarning, setShowEndShiftWarning] = useState(false);
  const [hasActiveTicket, setHasActiveTicket] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [showLogoutWarning, setShowLogoutWarning] = useState(false);
  const navigate = useNavigate();
  const { user, driverProfile, logout, updateDriverStatus } = useAuth();
  const { t } = useLanguage();

  const handleTicketIdSearch = () => {
    if (ticketIdInput.trim()) {
      // Remove "TKT-" prefix if present and navigate
      const ticketId = ticketIdInput.trim().toUpperCase();
      navigate(`/tickets/${ticketId}/confirm-delivery`);
      setTicketIdInput("");
    }
  };

  useEffect(() => {
    const loadRecentTickets = async () => {
      let tickets: Ticket[] = [];

      if (user?.role === "driver" && driverProfile?.id) {
        // For drivers, show only their tickets
        tickets = await ticketService.getTicketsByDriver(driverProfile.id);

        // Check for active tickets
        const activeTickets = tickets.filter(
          (t) => t.status === "CREATED" || t.status === "VERIFIED"
        );
        setHasActiveTicket(activeTickets.length > 0);
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

  const handleToggleShift = () => {
    if (driverProfile?.status === "active" && hasActiveTicket) {
      setShowEndShiftWarning(true);
    } else {
      confirmToggleShift();
    }
  };

  const confirmToggleShift = async () => {
    if (!driverProfile) return;

    setIsTogglingStatus(true);
    try {
      const newStatus =
        driverProfile.status === "inactive" ? "active" : "inactive";
      const result = await carrierService.updateDriverStatus(
        driverProfile.id,
        newStatus
      );

      if (result.success) {
        updateDriverStatus(newStatus);
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error("Error updating status:", error);
    } finally {
      setIsTogglingStatus(false);
    }
  };

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
            navigate(`/tickets/${activeTickets[0].ticket_id}/confirm-delivery`);
          } else {
            // Show notification when no active tickets found
            toast({
              title: "No Active Tickets",
              description: `Driver ${driver.name} has no active tickets at this time.`,
              variant: "default",
            });
          }
        }
      } catch (error) {
        console.error("Error scanning driver QR:", error);
        toast({
          title: "Error",
          description: "Failed to scan driver QR code",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background flex flex-col">
      {/* Header */}
      <Header
        showSettingsButton={user?.role === "driver"}
        onSettingsClick={() => navigate("/driver/profile")}
        showLogoutButton={!!user}
        onLogoutClick={() => setShowLogoutWarning(true)}
      />

      {/* Main Content */}
      <main className="container mx-auto px-3 py-4 md:px-4 md:py-8 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl space-y-4 md:space-y-6 pb-4">
          {/* Action Cards */}
          {user?.role !== "driver" && (
            <div className="grid gap-4 sm:grid-cols-1">
              <Card
                className="group cursor-pointer overflow-hidden transition-all hover:shadow-glow"
                onClick={() => setShowScanner(true)}
              >
                <div className="flex flex-col items-center justify-center space-y-3 p-8">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                    <QrCode className="h-7 w-7 text-primary" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-foreground">
                      {t("index.scanQRCode")}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {user?.role === "attendant"
                        ? t("index.scanDriverQRCode")
                        : t("index.scanTruckOrTicket")}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Ticket ID Search - For Attendants */}
              {user?.role === "attendant" && (
                <Card
                  className="group cursor-pointer overflow-hidden transition-all hover:shadow-glow"
                  onClick={() => {
                    const input = document.getElementById(
                      "ticket-id-search-input"
                    ) as HTMLInputElement;
                    if (input) input.focus();
                  }}
                >
                  <div className="flex flex-col items-center justify-center space-y-3 p-8">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100 transition-colors group-hover:bg-blue-200">
                      <Search className="h-7 w-7 text-blue-600" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-lg font-bold text-foreground">
                        {t("index.enterTicketID")}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t("index.typeTicketID")}
                      </p>
                    </div>
                    <div
                      className="flex gap-2 w-full px-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Input
                        id="ticket-id-search-input"
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
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTicketIdSearch();
                        }}
                        disabled={!ticketIdInput.trim()}
                        size="sm"
                      >
                        {t("index.search")}
                      </Button>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}

          {user?.role === "driver" && (
            <div className="flex flex-col gap-4">
              {/* Row that ALWAYS stays horizontal */}
              <div className="flex flex-row gap-4 w-full">
                {/* Start/End Shift */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between px-4 py-2 bg-muted rounded-lg">
                    <span className="text-sm font-medium text-muted-foreground">
                      {t("index.shiftStatus")}
                    </span>
                    <Badge
                      variant={
                        driverProfile?.status === "active"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {driverProfile?.status?.toUpperCase() || "INACTIVE"}
                    </Badge>
                  </div>
                  <Button
                    onClick={handleToggleShift}
                    disabled={isTogglingStatus}
                    variant={
                      driverProfile?.status === "active"
                        ? "destructive"
                        : "default"
                    }
                    className="w-full h-12 gap-2"
                    size="lg"
                  >
                    <Power className="h-5 w-5" />
                    {driverProfile?.status === "active"
                      ? t("index.endShift")
                      : t("index.startShift")}
                  </Button>
                </div>

                {/* Create Ticket Card */}
                <Card
                  className="flex-1 group cursor-pointer overflow-hidden transition-all hover:shadow-glow"
                  onClick={() => navigate("/tickets/create")}
                >
                  <div className="flex flex-col items-center space-y-4 p-6 text-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-success/10 transition-colors group-hover:bg-success/20">
                      <ClipboardList className="h-10 w-10 text-success" />
                    </div>

                    <div>
                      <h3 className="mb-1 text-lg font-bold text-foreground">
                        {t("index.createTicket")}
                      </h3>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card className="mt-4 shadow-md">
                <div className="border-b border-border p-4">
                  <h3 className="font-semibold text-foreground">
                    {t("index.recentActivity")}
                  </h3>
                </div>

                {recentTickets.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="flex justify-center mb-4">
                      <div className="rounded-full bg-muted p-4">
                        <Inbox className="h-8 w-8 text-muted-foreground" />
                      </div>
                    </div>
                    <p className="font-medium text-foreground mb-1">
                      {t("index.noRecentActivity")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {user?.role === "driver"
                        ? t("index.createTicketOrScan")
                        : t("index.scanDriverQRCodeToViewTickets")}
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

              {/* Driver Onboarding Button */}
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowOnboarding(true)}
                  className="gap-2"
                  size="sm"
                >
                  <BookOpen className="h-4 w-4" />
                  Driver Onboarding
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* End Shift Warning Dialog */}
      <AlertDialog
        open={showEndShiftWarning}
        onOpenChange={setShowEndShiftWarning}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <AlertDialogTitle>Active Ticket Found</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              You have an active ticket. Are you sure you want to end your
              shift? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 text-sm text-destructive">
            ⚠️ Ending your shift with an active ticket may cause issues with
            ticket delivery tracking.
          </div>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmToggleShift}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              End Shift Anyway
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Logout Warning Dialog */}
      <AlertDialog open={showLogoutWarning} onOpenChange={setShowLogoutWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            {hasActiveTicket && (
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <AlertDialogTitle>Active Ticket Found</AlertDialogTitle>
              </div>
            )}
            {!hasActiveTicket && (
              <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
            )}
            <AlertDialogDescription>
              {hasActiveTicket
                ? "You have an active ticket. Are you sure you want to log out? This may affect ticket delivery tracking."
                : "Are you sure you want to log out?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {hasActiveTicket && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 text-sm text-destructive">
              ⚠️ You have an active ticket. Logging out may cause issues with
              ticket delivery tracking.
            </div>
          )}
          <div className="flex gap-3 justify-center">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className={
                hasActiveTicket
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              }
            >
              {hasActiveTicket ? "Logout Anyway" : "Logout"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* QR Scanner Modal */}
      {showScanner && (
        <QRScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
      )}

      {/* Driver Onboarding Modal */}
      <DriverOnboardingModal
        open={showOnboarding}
        onOpenChange={setShowOnboarding}
      />
    </div>
  );
};

export default Index;
