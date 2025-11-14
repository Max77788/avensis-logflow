import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Search,
  Truck,
  Users,
  Package,
  MapPin,
  User,
  Filter,
  X,
  ChevronDown,
  Home,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Header } from "@/components/Header";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { ticketService } from "@/lib/ticketService";
import { carrierService } from "@/lib/carrierService";
import type { Ticket } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

const Overview = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { logout } = useAuth();
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [allDrivers, setAllDrivers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [ticketSearch, setTicketSearch] = useState("");
  const [driverSearch, setDriverSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"tickets" | "drivers">("tickets");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [carrierFilter, setCarrierFilter] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<string>("today");
  const [driverStatusFilter, setDriverStatusFilter] = useState<string | null>(
    null
  );
  const [showDriverFilters, setShowDriverFilters] = useState(false);
  const [showLogoutWarning, setShowLogoutWarning] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load tickets and drivers in parallel for faster loading
        const [tickets, carriers] = await Promise.all([
          ticketService.getAllTickets(),
          carrierService.getAllCarriers(),
        ]);

        setAllTickets(tickets);

        // Load all drivers from all carriers in parallel
        const driverPromises = carriers.map((carrier) =>
          carrierService.getDriversByCarrier(carrier.id)
        );
        const driversArrays = await Promise.all(driverPromises);
        const allDriversList = driversArrays.flat();

        // Enrich drivers with closed ticket count for today
        const enrichedDrivers = await Promise.all(
          allDriversList.map(async (driver) => {
            try {
              const driverTickets = await ticketService.getTicketsByDriver(
                driver.id
              );
              const today = new Date().toDateString();
              const closedTicketsToday = driverTickets.filter((ticket) => {
                const ticketDate = new Date(ticket.created_at).toDateString();
                return ticket.status === "CLOSED" && ticketDate === today;
              }).length;
              return {
                ...driver,
                closed_tickets_today: closedTicketsToday,
              };
            } catch (error) {
              console.error(
                `Error loading tickets for driver ${driver.id}:`,
                error
              );
              return {
                ...driver,
                closed_tickets_today: 0,
              };
            }
          })
        );

        setAllDrivers(enrichedDrivers);
      } catch (error) {
        console.error("Error loading overview data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Helper function to check if ticket is from today
  const isTicketFromToday = (ticket: Ticket): boolean => {
    if (!ticket.created_at) return false;
    const ticketDate = new Date(ticket.created_at).toDateString();
    const today = new Date().toDateString();
    return ticketDate === today;
  };

  // Memoize filtered tickets for better performance
  const filteredTickets = useMemo(() => {
    return allTickets.filter((ticket) => {
      const matchesSearch =
        ticket.ticket_id.toLowerCase().includes(ticketSearch.toLowerCase()) ||
        ticket.truck_id.toLowerCase().includes(ticketSearch.toLowerCase()) ||
        (ticket.carrier || "")
          .toLowerCase()
          .includes(ticketSearch.toLowerCase());

      const matchesStatus = !statusFilter || ticket.status === statusFilter;
      const matchesCarrier = !carrierFilter || ticket.carrier === carrierFilter;
      const matchesDate =
        dateFilter === "today" ? isTicketFromToday(ticket) : true;

      return matchesSearch && matchesStatus && matchesCarrier && matchesDate;
    });
  }, [allTickets, ticketSearch, statusFilter, carrierFilter, dateFilter]);

  // Memoize filtered drivers for better performance
  const filteredDrivers = useMemo(() => {
    return allDrivers.filter((driver) => {
      const matchesSearch =
        driver.name.toLowerCase().includes(driverSearch.toLowerCase()) ||
        driver.email.toLowerCase().includes(driverSearch.toLowerCase());

      const matchesStatus =
        !driverStatusFilter || driver.status === driverStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [allDrivers, driverSearch, driverStatusFilter]);

  // Memoize unique carriers for filter
  const uniqueCarriers = useMemo(() => {
    return Array.from(
      new Set(allTickets.map((t) => t.carrier).filter(Boolean))
    ).sort();
  }, [allTickets]);

  const statuses = ["CREATED", "VERIFIED", "CLOSED"];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <Header
        showHomeButton
        onHomeClick={() => navigate("/")}
        showLogoutButton
        onLogoutClick={() => setShowLogoutWarning(true)}
      />

      {/* Tabs Section */}
      <div className="border-b border-border bg-card/50">
        <div className="container mx-auto px-3 md:px-4 py-0">
          {/* Tabs */}
          <div className="flex gap-1 md:gap-2 overflow-x-auto">
            <Button
              variant={activeTab === "tickets" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("tickets")}
              className="rounded-b-none whitespace-nowrap text-xs md:text-sm"
            >
              <Truck className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">{t("overview.tickets")}</span>
              <span className="sm:hidden">Tickets</span> (
              {filteredTickets.length})
            </Button>
            <Button
              variant={activeTab === "drivers" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("drivers")}
              className="rounded-b-none whitespace-nowrap text-xs md:text-sm"
            >
              <Users className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">{t("overview.drivers")}</span>
              <span className="sm:hidden">Drivers</span> (
              {filteredDrivers.length})
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-3 py-4 md:px-4 md:py-8 flex-1 overflow-y-auto">
        {/* Tickets Tab */}
        {activeTab === "tickets" && (
          <div className="space-y-4">
            {/* Search and Filters */}
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={t("overview.searchByTicketTruckCarrier")}
                    value={ticketSearch}
                    onChange={(e) => setTicketSearch(e.target.value)}
                    className="pl-10 text-xs md:text-sm"
                  />
                </div>
                <Button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  variant={showAdvancedFilters ? "default" : "outline"}
                  size="icon"
                  className="h-9 w-9 md:h-10 md:w-10"
                  title={t("overview.advancedFilters")}
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </div>

              {/* Advanced Filters */}
              {showAdvancedFilters && (
                <Card className="p-3 md:p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3">
                    {/* Status Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        {t("common.status")}
                      </label>
                      <Select
                        value={statusFilter || "all"}
                        onValueChange={(value) =>
                          setStatusFilter(value === "all" ? null : value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t("overview.allStatuses")}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">
                            {t("overview.allStatuses")}
                          </SelectItem>
                          {statuses.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Carrier Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        {t("common.carrier")}
                      </label>
                      <Select
                        value={carrierFilter || "all"}
                        onValueChange={(value) =>
                          setCarrierFilter(value === "all" ? null : value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t("overview.allCarriers")}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">
                            {t("overview.allCarriers")}
                          </SelectItem>
                          {uniqueCarriers.map((carrier) => (
                            <SelectItem key={carrier} value={carrier}>
                              {carrier}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Date Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        {t("overview.date")}
                      </label>
                      <Select value={dateFilter} onValueChange={setDateFilter}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="today">
                            {t("overview.today")}
                          </SelectItem>
                          <SelectItem value="all">
                            {t("overview.allDates")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </Card>
              )}
            </div>

            {/* Tickets Grid */}
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Card key={i} className="h-24 animate-pulse bg-muted" />
                ))}
              </div>
            ) : filteredTickets.length === 0 ? (
              <Card className="p-8 text-center">
                <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  {t("overview.noTicketsFound")}
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredTickets.map((ticket) => (
                  <Card
                    key={ticket.ticket_id}
                    className="cursor-pointer overflow-hidden transition-all hover:shadow-lg hover:border-primary/50"
                    onClick={() => navigate(`/tickets/${ticket.ticket_id}`)}
                  >
                    <div className="flex flex-col items-center justify-center space-y-2 p-6">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                        <Package className="h-6 w-6 text-primary" />
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-foreground">
                          {ticket.ticket_id}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {ticket.destination_site}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Drivers Tab */}
        {activeTab === "drivers" && (
          <div className="space-y-4">
            {/* Search and Filter */}
            <div className="flex gap-2">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t("overview.searchDrivers")}
                  value={driverSearch}
                  onChange={(e) => setDriverSearch(e.target.value)}
                  className="pl-10 text-xs md:text-sm"
                />
              </div>
              <Button
                onClick={() => setShowDriverFilters(!showDriverFilters)}
                variant={showDriverFilters ? "default" : "outline"}
                size="icon"
                className="h-9 w-9 md:h-10 md:w-10"
                title={t("overview.advancedFilters")}
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>

            {/* Driver Filters */}
            {showDriverFilters && (
              <Card className="p-3 md:p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <label className="text-xs md:text-sm font-medium text-muted-foreground mb-2 block">
                      {t("overview.status")}
                    </label>
                    <Select
                      value={driverStatusFilter || "all"}
                      onValueChange={(value) =>
                        setDriverStatusFilter(value === "all" ? null : value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("overview.allStatus")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          {t("overview.allStatus")}
                        </SelectItem>
                        <SelectItem value="active">
                          {t("overview.active")}
                        </SelectItem>
                        <SelectItem value="inactive">
                          {t("overview.inactive")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>
            )}

            {/* Drivers List */}
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Card key={i} className="h-16 animate-pulse bg-muted" />
                ))}
              </div>
            ) : filteredDrivers.length === 0 ? (
              <Card className="p-6 text-center">
                <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  {t("overview.noDriversFound")}
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredDrivers.map((driver) => (
                  <Card
                    key={driver.id}
                    className="overflow-hidden transition-all hover:shadow-md hover:border-primary/50"
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">
                            {driver.name}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {t("overview.status")}
                          </span>
                          <Badge
                            variant={
                              driver.status === "active"
                                ? "default"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {driver.status}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {t("overview.closedTicketsToday")}
                          </span>
                          <span className="text-sm font-semibold text-foreground">
                            {driver.closed_tickets_today || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutWarning} onOpenChange={setShowLogoutWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.confirmLogout")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("common.areYouSureLogout")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-center items-center">
            <AlertDialogCancel className="min-w-[120px] px-4 py-2">
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="min-w-[120px] px-4 py-2 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common.logout")}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Overview;
