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
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Header } from "@/components/Header";
import { useLanguage } from "@/contexts/LanguageContext";
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

const Overview = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
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
        // Filter for active drivers only
        const activeDriversList = allDriversList.filter(
          (driver) => driver.status === "active"
        );
        setAllDrivers(activeDriversList);
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
        title={t("overview.title")}
        subtitle={t("overview.subtitle")}
        showBackButton
        onBackClick={() => navigate("/")}
        rightContent={
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Package className="h-4 w-4" />
            <span>
              {allTickets.length} {t("overview.tickets")}
            </span>
            <span className="mx-2">•</span>
            <Users className="h-4 w-4" />
            <span>
              {allDrivers.length} {t("overview.drivers")}
            </span>
          </div>
        }
      />

      {/* Tabs Section */}
      <div className="border-b border-border bg-card/50">
        <div className="container mx-auto px-4 py-0">
          {/* Tabs */}
          <div className="flex gap-2">
            <Button
              variant={activeTab === "tickets" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("tickets")}
              className="rounded-b-none"
            >
              <Truck className="h-4 w-4 mr-2" />
              {t("overview.tickets")} ({filteredTickets.length})
            </Button>
            <Button
              variant={activeTab === "drivers" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("drivers")}
              className="rounded-b-none"
            >
              <Users className="h-4 w-4 mr-2" />
              {t("overview.drivers")} ({filteredDrivers.length})
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Tickets Tab */}
        {activeTab === "tickets" && (
          <div className="space-y-4">
            {/* Search and Filters */}
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={t("overview.searchByTicketTruckCarrier")}
                    value={ticketSearch}
                    onChange={(e) => setTicketSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  variant={showAdvancedFilters ? "default" : "outline"}
                  size="icon"
                  title={t("overview.advancedFilters")}
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </div>

              {/* Advanced Filters */}
              {showAdvancedFilters && (
                <Card className="p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-bold text-foreground truncate">
                              {ticket.ticket_id}
                            </p>
                            <StatusBadge status={ticket.status} />
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground mb-2">
                            <div>
                              <p className="text-xs text-muted-foreground/70">
                                {t("common.truck")}
                              </p>
                              <p className="font-medium text-foreground">
                                {ticket.truck_id}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground/70">
                                {t("common.carrier")}
                              </p>
                              <p className="font-medium text-foreground">
                                {ticket.carrier || "N/A"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span>
                              {ticket.origin_site} → {ticket.destination_site}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary">
                            {ticket.net_weight
                              ? ticket.net_weight.toFixed(1)
                              : "—"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t("common.tons")}
                          </p>
                        </div>
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
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t("overview.searchDrivers")}
                  value={driverSearch}
                  onChange={(e) => setDriverSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status Filter */}
              <Select
                value={driverStatusFilter || "all"}
                onValueChange={(value) =>
                  setDriverStatusFilter(value === "all" ? null : value)
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={t("overview.allStatus")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("overview.allStatus")}</SelectItem>
                  <SelectItem value="active">{t("overview.active")}</SelectItem>
                  <SelectItem value="inactive">
                    {t("overview.inactive")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

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
                    <div className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">
                            {driver.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {driver.email}
                          </p>
                          <div className="mt-2">
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
    </div>
  );
};

export default Overview;
