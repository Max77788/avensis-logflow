import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { QRScanner } from "@/components/QRScanner";
import { LanguageSelector } from "@/components/LanguageSelector";
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
  Home,
  Power,
  AlertCircle,
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
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { APP_TITLE } from "@/lib/config";
import type { Ticket } from "@/lib/types";

const Index = () => {
  const [showScanner, setShowScanner] = useState(false);
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
  const [ticketIdInput, setTicketIdInput] = useState("");
  const [showEndShiftWarning, setShowEndShiftWarning] = useState(false);
  const [hasActiveTicket, setHasActiveTicket] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const navigate = useNavigate();
  const { user, driverProfile, logout, updateDriverStatus } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { t } = useLanguage();

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
          }
        }
      } catch (error) {
        console.error("Error scanning driver QR:", error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto flex items-center justify-between px-3 py-3 md:px-4 md:py-4 gap-2">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <div className="flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-lg bg-primary flex-shrink-0">
              <Truck className="h-5 w-5 md:h-6 md:w-6 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg md:text-xl font-bold text-foreground truncate">
                {APP_TITLE}
              </h1>
              <p className="text-xs text-muted-foreground truncate">
                {t("app.subtitle")}
              </p>
            </div>
          </div>

          {/* User Section */}
          {user ? (
            <div className="flex items-center gap-1 md:gap-3 flex-shrink-0">
              <div className="text-right hidden sm:block">
                <p className="text-xs md:text-sm font-medium text-foreground truncate">
                  {driverProfile?.name || t("common.user")}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {user.role}
                </p>
              </div>
              <div className="flex gap-1 md:gap-2">
                {user.role === "driver" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate("/driver/profile")}
                    className="rounded-full h-9 w-9 md:h-10 md:w-10"
                    title={t("common.profile")}
                  >
                    <Settings className="h-4 w-4 md:h-5 md:w-5" />
                  </Button>
                )}
                <LanguageSelector />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  className="rounded-full h-9 w-9 md:h-10 md:w-10"
                  title={isDark ? t("common.lightMode") : t("common.darkMode")}
                >
                  {isDark ? (
                    <Sun className="h-4 w-4 md:h-5 md:w-5" />
                  ) : (
                    <Moon className="h-4 w-4 md:h-5 md:w-5" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                  className="rounded-full h-9 w-9 md:h-10 md:w-10"
                  title={t("common.logout")}
                >
                  <LogOut className="h-4 w-4 md:h-5 md:w-5" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-1 md:gap-2 flex-shrink-0">
              <Button
                variant="outline"
                onClick={() => navigate("/login")}
                size="sm"
                className="text-xs md:text-sm"
              >
                {t("common.login")}
              </Button>
              <Button
                onClick={() => navigate("/driver/signup")}
                size="sm"
                className="text-xs md:text-sm"
              >
                {t("common.signUp")}
              </Button>
            </div>
          )}
        </div>
      </header>

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
                <div className="space-y-4 p-6">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                    <QrCode className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <h3 className="mb-1 text-lg font-bold text-foreground">
                      {t("index.scanQRCode")}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {user?.role === "attendant"
                        ? t("index.scanDriverQRCode")
                        : t("index.scanTruckOrTicket")}
                    </p>
                  </div>
                  <Button className="w-full" size="lg">
                    {t("index.openScanner")}
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
                        {t("index.enterTicketID")}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {t("index.typeTicketID")}
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
                        {t("index.search")}
                      </Button>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}

          {user?.role === "driver" && (
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
              {/* Start/End Shift Button with Dynamic Status */}
              <div className="space-y-2">
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
                      {t("index.createTicket")}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t("index.manuallyCreateNewTicket")}
                    </p>
                  </div>
                  <Button className="w-full" size="lg">
                    {t("index.createNewTicket")}
                  </Button>
                </div>
              </Card>

              {/* Recent Activity */}
              <Card className="mt-8 shadow-md md:col-span-2">
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

      {/* QR Scanner Modal */}
      {showScanner && (
        <QRScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
      )}
    </div>
  );
};

export default Index;
