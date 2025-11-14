import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Truck, Users, Package, User, Filter } from "lucide-react";
import { Header } from "@/components/Header";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { ticketService } from "@/lib/ticketService";
import { driverService } from "@/lib/driverService";
import type { Ticket } from "@/lib/types";
import type { Driver } from "@/lib/driverService";
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

type UIDriver = Driver & {
  _search: string;
};

const STATUSES = ["CREATED", "VERIFIED", "CLOSED"] as const;

const TICKETS_PAGE_SIZE = 50;
const DRIVERS_PAGE_SIZE = 50;

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

  // Drivers state
  const [allDrivers, setAllDrivers] = useState<UIDriver[]>([]);
  const [driversLoading, setDriversLoading] = useState(false);
  const [driversLoaded, setDriversLoaded] = useState(false);
  const [driversPage, setDriversPage] = useState(1);
  const [driversTotal, setDriversTotal] = useState(0);
  const [driversHasMore, setDriversHasMore] = useState(true);

  // Filters / UI
  const [ticketSearch, setTicketSearch] = useState("");
  const [driverSearch, setDriverSearch] = useState("");
  const [debouncedTicketSearch, setDebouncedTicketSearch] = useState("");
  const [debouncedDriverSearch, setDebouncedDriverSearch] = useState("");

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

  // Debounce ticket search
  useEffect(() => {
    const id = window.setTimeout(
      () => setDebouncedTicketSearch(ticketSearch),
      250
    );
    return () => window.clearTimeout(id);
  }, [ticketSearch]);

  // Debounce driver search
  useEffect(() => {
    const id = window.setTimeout(
      () => setDebouncedDriverSearch(driverSearch),
      250
    );
    return () => window.clearTimeout(id);
  }, [driverSearch]);

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

  // Helper: normalize drivers (precompute search)
  const normalizeDrivers = (drivers: Driver[]): UIDriver[] => {
    return drivers.map((d) => {
      const name = d.name || "";
      const email = d.email || "";
      const searchKey = `${name} ${email}`.toLowerCase();

      return {
        ...d,
        closed_tickets_today: d.closed_tickets_today ?? 0,
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
          // fail gracefully
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
  }, [dateFilter]); // intentionally only depends on dateFilter

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

  // Lazy-load drivers (page 1) when Drivers tab is opened
  useEffect(() => {
    if (activeTab !== "drivers") return;
    if (driversLoaded || driversLoading) return;

    let isMounted = true;

    const loadDriversPage = async (page: number) => {
      setDriversLoading(true);
      try {
        const res = await driverService.getDriversOverview({
          limit: DRIVERS_PAGE_SIZE,
          page,
        });

        if (!isMounted) return;

        const normalized = normalizeDrivers(res.drivers);

        if (page === 1) {
          setAllDrivers(normalized);
        } else {
          setAllDrivers((prev) => [...prev, ...normalized]);
        }

        setDriversTotal(res.total ?? 0);
        setDriversPage(res.page);
        const totalPages = Math.ceil((res.total ?? 0) / res.pageSize);
        setDriversHasMore(res.page < totalPages);
        setDriversLoaded(true);
      } catch (error) {
        console.error("Error loading drivers overview:", error);
        if (isMounted) setDriversHasMore(false);
      } finally {
        if (isMounted) setDriversLoading(false);
      }
    };

    loadDriversPage(1);

    return () => {
      isMounted = false;
    };
  }, [activeTab, driversLoaded, driversLoading]);

  const loadMoreDrivers = async () => {
    if (driversLoading || !driversHasMore) return;
    const nextPage = driversPage + 1;
    try {
      setDriversLoading(true);
      const res = await driverService.getDriversOverview({
        limit: DRIVERS_PAGE_SIZE,
        page: nextPage,
      });

      const normalized = normalizeDrivers(res.drivers);

      setAllDrivers((prev) => [...prev, ...normalized]);
      setDriversPage(res.page);
      setDriversTotal(res.total ?? 0);
      const totalPages = Math.ceil((res.total ?? 0) / res.pageSize);
      setDriversHasMore(res.page < totalPages);
    } catch (error) {
      console.error("Error loading more drivers:", error);
      setDriversHasMore(false);
    } finally {
      setDriversLoading(false);
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

  // Memoized filtered drivers
  const filteredDrivers = useMemo(() => {
    const search = debouncedDriverSearch.trim().toLowerCase();

    return allDrivers.filter((driver) => {
      const searchKey = (driver._search || "").toLowerCase();
      const matchesSearch = !search || searchKey.includes(search);
      const matchesStatus =
        !driverStatusFilter || driver.status === driverStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [allDrivers, debouncedDriverSearch, driverStatusFilter]);

  // Unique carriers for filter
  const uniqueCarriers = useMemo(() => {
    return Array.from(
      new Set(allTickets.map((t) => t.carrier).filter(Boolean))
    ).sort();
  }, [allTickets]);

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
            {driversLoading && allDrivers.length === 0 ? (
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
              <>
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

                {driversHasMore && (
                  <div className="flex justify-center mt-4">
                    <Button
                      variant="outline"
                      onClick={loadMoreDrivers}
                      disabled={driversLoading}
                    >
                      {driversLoading
                        ? t("overview.loadingMore")
                        : t("overview.loadMoreDrivers")}
                    </Button>
                  </div>
                )}
              </>
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