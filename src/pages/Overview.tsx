import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Search,
  Truck as TruckIcon,
  Package,
  Filter,
  User,
  Building2,
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
} from "lucide-react";
import { Header } from "@/components/Header";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { ticketService } from "@/lib/ticketService";
import { truckService } from "@/lib/truckService";
import type { Ticket } from "@/lib/types";
import type { Truck } from "@/lib/truckService";
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

type UITicket = Ticket & {
  _search: string;
  _isToday: boolean;
};

type UITruck = Truck & {
  _search: string;
};

const STATUSES = ["CREATED", "VERIFIED", "CLOSED"] as const;

const TICKETS_PAGE_SIZE = 50;
const TRUCKS_PAGE_SIZE = 50;

const Overview = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { logout } = useAuth();

  // Tickets state
  const [allTickets, setAllTickets] = useState<UITicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [ticketsPage, setTicketsPage] = useState(1);
  const [ticketsTotal, setTicketsTotal] = useState(0);
  const [ticketsHasMore, setTicketsHasMore] = useState(true);

  // Trucks state
  const [allTrucks, setAllTrucks] = useState<UITruck[]>([]);
  const [trucksLoading, setTrucksLoading] = useState(false);
  const [trucksLoaded, setTrucksLoaded] = useState(false);
  const [trucksPage, setTrucksPage] = useState(1);
  const [trucksTotal, setTrucksTotal] = useState(0);
  const [trucksHasMore, setTrucksHasMore] = useState(true);

  // Filters / UI
  const [ticketSearch, setTicketSearch] = useState("");
  const [truckSearch, setTruckSearch] = useState("");
  const [debouncedTicketSearch, setDebouncedTicketSearch] = useState("");
  const [debouncedTruckSearch, setDebouncedTruckSearch] = useState("");

  const [activeTab, setActiveTab] = useState<"tickets" | "trucks">("tickets");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [carrierFilter, setCarrierFilter] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<string>("today");
  const [showTruckFilters, setShowTruckFilters] = useState(false);
  const [showLogoutWarning, setShowLogoutWarning] = useState(false);

  // Debounce ticket search
  useEffect(() => {
    const id = window.setTimeout(
      () => setDebouncedTicketSearch(ticketSearch),
      250
    );
    return () => window.clearTimeout(id);
  }, [ticketSearch]);

  // Debounce truck search
  useEffect(() => {
    const id = window.setTimeout(
      () => setDebouncedTruckSearch(truckSearch),
      250
    );
    return () => window.clearTimeout(id);
  }, [truckSearch]);

  // Helper: normalize tickets (precompute search + isToday)
  const normalizeTickets = (tickets: Ticket[]): UITicket[] => {
    const todayStr = new Date().toDateString();

    return tickets.map((t) => {
      let isToday = false;
      if (t.created_at) {
        const createdAtStr = new Date(t.created_at).toDateString();
        isToday = createdAtStr === todayStr;
      }

      const searchKey = [
        t.ticket_id ?? "",
        t.truck_id ?? "",
        t.carrier ?? "",
        t.destination_site ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return {
        ...t,
        _search: searchKey,
        _isToday: isToday,
      };
    });
  };

  /**
   * Normalize trucks for UI display
   * Extracts nested data from Supabase joins and adds search key
   * - Extracts carrier name from carriers object
   * - Extracts driver name from active_driver object
   * - Adds lowercase search key for filtering
   */
  const normalizeTrucks = (trucks: Truck[]): UITruck[] => {
    return trucks.map((t: any) => {
      const truckId = t.truck_id || "";
      const searchKey = truckId.toLowerCase();

      console.log("Truck:", t);

      // Extract carrier name from nested carriers object
      const carrierName =
        t.carriers?.name || t.carrier_name || t.companies.name || "Unknown";

      // Extract driver name from nested active_driver object
      const driverName =
        t.active_driver?.name || t.driver_name || "Not assigned";

      return {
        ...t,
        carrier_name: carrierName,
        driver_name: driverName,
        _search: searchKey,
      };
    });
  };

  // Initial tickets load (page 1)
  useEffect(() => {
    let isMounted = true;

    const loadTicketsPage = async (page: number) => {
      setTicketsLoading(true);
      try {
        const fromDate =
          dateFilter === "today"
            ? new Date().toISOString().slice(0, 10) // YYYY-MM-DD
            : undefined;

        const res = await ticketService.getTicketsOverview({
          limit: TICKETS_PAGE_SIZE,
          fromDate,
          page,
        });

        if (!isMounted) return;

        const normalized = normalizeTickets(res.tickets);

        if (page === 1) {
          setAllTickets(normalized);
        } else {
          setAllTickets((prev) => [...prev, ...normalized]);
        }

        setTicketsTotal(res.total ?? 0);
        setTicketsPage(res.page);
        const totalPages = Math.ceil((res.total ?? 0) / res.pageSize);
        setTicketsHasMore(res.page < totalPages);
      } catch (error) {
        console.error("Error loading tickets overview:", error);
        if (isMounted) {
          setTicketsHasMore(false);
        }
      } finally {
        if (isMounted) setTicketsLoading(false);
      }
    };

    // Always (re)load page 1 when dateFilter changes
    loadTicketsPage(1);

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter]);

  const loadMoreTickets = async () => {
    if (ticketsLoading || !ticketsHasMore) return;
    const nextPage = ticketsPage + 1;
    try {
      setTicketsLoading(true);
      const fromDate =
        dateFilter === "today"
          ? new Date().toISOString().slice(0, 10)
          : undefined;

      const res = await ticketService.getTicketsOverview({
        limit: TICKETS_PAGE_SIZE,
        fromDate,
        page: nextPage,
      });

      const normalized = normalizeTickets(res.tickets);

      setAllTickets((prev) => [...prev, ...normalized]);
      setTicketsPage(res.page);
      setTicketsTotal(res.total ?? 0);
      const totalPages = Math.ceil((res.total ?? 0) / res.pageSize);
      setTicketsHasMore(res.page < totalPages);
    } catch (error) {
      console.error("Error loading more tickets:", error);
      setTicketsHasMore(false);
    } finally {
      setTicketsLoading(false);
    }
  };

  // Lazy-load trucks (page 1) when Trucks tab is opened
  useEffect(() => {
    if (activeTab !== "trucks") return;
    if (trucksLoaded) return;

    let isMounted = true;

    const loadTrucksPage = async (page: number) => {
      setTrucksLoading(true);
      try {
        const res = await truckService.getActiveTrucksOverview({
          limit: TRUCKS_PAGE_SIZE,
          page,
        });

        if (!isMounted) return;

        const normalized = normalizeTrucks(res.trucks);

        if (page === 1) {
          setAllTrucks(normalized);
        } else {
          setAllTrucks((prev) => [...prev, ...normalized]);
        }

        setTrucksTotal(res.total ?? 0);
        setTrucksPage(res.page);
        const totalPages = Math.ceil((res.total ?? 0) / res.pageSize);
        setTrucksHasMore(res.page < totalPages);
        setTrucksLoaded(true);
      } catch (error) {
        console.error("Error loading trucks overview:", error);
        if (isMounted) setTrucksHasMore(false);
      } finally {
        if (isMounted) setTrucksLoading(false);
      }
    };

    loadTrucksPage(1);

    return () => {
      isMounted = false;
    };
  }, [activeTab, trucksLoaded]);

  const loadMoreTrucks = async () => {
    if (trucksLoading || !trucksHasMore) return;
    const nextPage = trucksPage + 1;
    try {
      setTrucksLoading(true);
      const res = await truckService.getActiveTrucksOverview({
        limit: TRUCKS_PAGE_SIZE,
        page: nextPage,
      });

      const normalized = normalizeTrucks(res.trucks);

      setAllTrucks((prev) => [...prev, ...normalized]);
      setTrucksPage(res.page);
      setTrucksTotal(res.total ?? 0);
      const totalPages = Math.ceil((res.total ?? 0) / res.pageSize);
      setTrucksHasMore(res.page < totalPages);
    } catch (error) {
      console.error("Error loading more trucks:", error);
      setTrucksHasMore(false);
    } finally {
      setTrucksLoading(false);
    }
  };

  // Memoized filtered tickets
  const filteredTickets = useMemo(() => {
    const search = debouncedTicketSearch.trim().toLowerCase();

    return allTickets.filter((ticket) => {
      const matchesSearch = !search || ticket._search.includes(search);
      const matchesStatus = !statusFilter || ticket.status === statusFilter;
      const matchesCarrier = !carrierFilter || ticket.carrier === carrierFilter;
      const matchesDate = dateFilter === "today" ? ticket._isToday : true;

      return matchesSearch && matchesStatus && matchesCarrier && matchesDate;
    });
  }, [
    allTickets,
    debouncedTicketSearch,
    statusFilter,
    carrierFilter,
    dateFilter,
  ]);

  // Memoized filtered trucks - show only active trucks (trucks that are assigned to drivers)
  const filteredTrucks = useMemo(() => {
    const search = debouncedTruckSearch.trim().toLowerCase();

    return allTrucks.filter((truck: UITruck) => {
      const searchKey = truck._search || "";
      const matchesSearch = !search || searchKey.includes(search);
      // Only show trucks that have status = 'active' (assigned to a driver)
      const isAssigned = truck.status === "active";

      return matchesSearch && isAssigned;
    });
  }, [allTrucks, debouncedTruckSearch]);

  // Unique carriers for filter
  const uniqueCarriers = useMemo(() => {
    return Array.from(
      new Set(allTickets.map((t) => t.carrier).filter(Boolean))
    ).sort();
  }, [allTickets]);

  // Use backend totals for counts if available, otherwise fallback
  const ticketsCountLabel =
    ticketsTotal > 0 ? ticketsTotal : filteredTickets.length;
  const trucksCountLabel =
    trucksTotal > 0 ? trucksTotal : filteredTrucks.length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <Header
        showHomeButton
        onHomeClick={() => navigate("/home")}
        showLogoutButton
        onLogoutClick={() => setShowLogoutWarning(true)}
      />
      {/* Tabs Section */}
      <div className="border-b border-border bg-card/50">
        <div className="container mx-auto px-3 md:px-4 py-0">
          <div className="flex gap-1 md:gap-2 overflow-x-auto">
            <Button
              variant={activeTab === "tickets" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("tickets")}
              className="rounded-b-none whitespace-nowrap text-xs md:text-sm"
            >
              <Package className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">{t("overview.tickets")}</span>
              <span className="sm:hidden">Tickets</span>{" "}
              {/* ({ticketsCountLabel}) */}
            </Button>

            <Button
              variant={activeTab === "trucks" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("trucks")}
              className="rounded-b-none whitespace-nowrap text-xs md:text-sm"
            >
              <TruckIcon className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">{t("overview.trucks")}</span>
              <span className="sm:hidden">Trucks</span>{" "}
              {/* ({trucksCountLabel}) */}
            </Button>
          </div>
        </div>
      </div>
      {/* Main Content */}
      <main className="container mx-auto px-3 py-4 md:px-4 md:py-8 flex-1 overflow-y-auto">
        {/* Tickets Tab */}
        {activeTab === "tickets" && (
          <div className="space-y-4">
            {/* Search + Filters */}
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
                          {STATUSES.map((status) => (
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
            {ticketsLoading && allTickets.length === 0 ? (
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
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTickets.map((ticket) => {
                    // Format created date
                    const createdDate = ticket.created_at
                      ? new Date(ticket.created_at)
                      : null;
                    const formattedDate = createdDate
                      ? createdDate.toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "N/A";
                    const formattedTime = createdDate
                      ? createdDate.toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "";

                    // Status badge color
                    const statusColors = {
                      CREATED:
                        "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
                      VERIFIED:
                        "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20",
                      CLOSED:
                        "bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/20",
                    };
                    const statusColor =
                      statusColors[
                        ticket.status as keyof typeof statusColors
                      ] || statusColors.CREATED;

                    return (
                      <Card
                        key={ticket.ticket_id}
                        className="group cursor-pointer overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-primary/50 border-border/50"
                        onClick={() => navigate(`/tickets/${ticket.ticket_id}`)}
                      >
                        <div className="p-5">
                          <div className="flex flex-col gap-4">
                            {/* Header Section */}
                            <div className="flex items-start gap-3">
                              {/* Icon */}
                              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex-shrink-0 group-hover:from-primary/30 group-hover:to-primary/20 transition-colors">
                                <Package className="h-6 w-6 text-primary" />
                              </div>

                              {/* Ticket ID and Destination */}
                              <div className="flex-1 min-w-0 space-y-1">
                                <h3 className="font-bold text-lg text-foreground truncate">
                                  {ticket.carrier}
                                </h3>

                                <div className="flex items-start gap-1">
                                  <MapPin className="h-3 w-3" />
                                  <div className="flex-1">
                                    <p className="text-xs text-muted-foreground">
                                      {ticket.destination_site}
                                    </p>
                                  </div>
                                  <TruckIcon className="h-3 w-3" />
                                  <div className="flex-1">
                                    <p className="text-xs text-muted-foreground">
                                      {ticket.truck_name}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Divider */}
                            <div className="border-b border-border/50" />

                            {/* Status Badge */}
                            <div className="flex justify-start gap-4">
                              <div
                                className={`px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${statusColor}`}
                              >
                                {ticket.status}
                              </div>
                              {/* Date and Time */}
                              <div className="flex flex-row gap-2 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="h-3.5 w-3.5" />
                                  <span>{formattedDate}</span>
                                </div>
                                {formattedTime && (
                                  <div className="flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5" />
                                    <span>{formattedTime}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Hover Effect Indicator */}
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/0 via-primary to-primary/0 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                        </div>
                      </Card>
                    );
                  })}
                </div>

                {ticketsHasMore && (
                  <div className="flex justify-center mt-4">
                    <Button
                      variant="outline"
                      onClick={loadMoreTickets}
                      disabled={ticketsLoading}
                    >
                      {ticketsLoading
                        ? t("overview.loadingMore")
                        : t("overview.loadMoreTickets")}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Trucks Tab */}
        {activeTab === "trucks" && (
          <div className="space-y-4">
            {/* Search */}
            <div className="flex gap-2">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t("overview.searchTrucks")}
                  value={truckSearch}
                  onChange={(e) => setTruckSearch(e.target.value)}
                  className="pl-10 text-xs md:text-sm"
                />
              </div>
            </div>

            {/* Trucks List */}
            {trucksLoading && allTrucks.length === 0 ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Card key={i} className="h-16 animate-pulse bg-muted" />
                ))}
              </div>
            ) : filteredTrucks.length === 0 ? (
              <Card className="p-6 text-center">
                <TruckIcon className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  {t("overview.noTrucksFound")}
                </p>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTrucks.map((truck) => (
                    <Card
                      key={truck.id}
                      className="group relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-primary/50 cursor-pointer border-border/50 bg-card"
                      onClick={() => {
                        navigate(
                          `/tickets/create?truck_id=${encodeURIComponent(
                            truck.truck_id
                          )}&carrier_id=${encodeURIComponent(
                            truck.carrier_id
                          )}&truck_uuid=${encodeURIComponent(truck.id)}`
                        );
                      }}
                    >
                      {/* Active Status Indicator */}
                      {truck.active && (
                        <div className="absolute top-3 right-3 z-10">
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                            <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />
                            <span className="text-xs font-medium text-green-700 dark:text-green-300">
                              Active
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="p-5">
                        {/* Header Section */}
                        <div className="flex items-start gap-4 mb-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex-shrink-0 group-hover:from-primary/30 group-hover:to-primary/20 transition-colors">
                            <TruckIcon className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0 pt-1">
                            <h3 className="font-bold text-lg text-foreground truncate mb-0.5">
                              {truck.truck_id}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              Truck ID
                            </p>
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-border/50 mb-4" />

                        {/* Information Grid - Row Layout */}
                        <div className="grid grid-cols-2 gap-3">
                          {/* Carrier */}
                          <div className="flex items-start gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50 flex-shrink-0">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-muted-foreground mb-0.5">
                                {t("common.carrier")}
                              </p>
                              <p className="text-sm font-medium text-foreground truncate">
                                {truck.carrier_name || "Unknown"}
                              </p>
                            </div>
                          </div>

                          {/* Driver */}
                          <div className="flex items-start gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50 flex-shrink-0">
                              <User className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-muted-foreground mb-0.5">
                                {t("common.driver")}
                              </p>
                              <p className="text-sm font-medium text-foreground truncate">
                                {truck.driver_name || "Not assigned"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Hover Effect Indicator */}
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/0 via-primary to-primary/0 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                      </div>
                    </Card>
                  ))}
                </div>

                {trucksHasMore && (
                  <div className="flex justify-center mt-4">
                    <Button
                      variant="outline"
                      onClick={loadMoreTrucks}
                      disabled={trucksLoading}
                    >
                      {trucksLoading
                        ? t("overview.loadingMore")
                        : t("overview.loadMoreTrucks")}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>

      {/* Logout Warning Dialog */}
      <AlertDialog open={showLogoutWarning} onOpenChange={setShowLogoutWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to log out?
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
            <AlertDialogCancel className="w-full sm:w-auto">
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Logout
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Overview;
