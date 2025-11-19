import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { Header } from "@/components/Header";
import { LogoutModal } from "@/components/LogoutModal";
import {
  Search,
  Download,
  Filter,
  Calendar,
  Truck,
  MapPin,
  FileText,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { Ticket } from "@/lib/types";
import { ticketService } from "@/lib/ticketService";
import { carrierService } from "@/lib/carrierService";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DateRangePreset =
  | "today"
  | "this-week"
  | "this-month"
  | "last-6-months"
  | "this-year"
  | "custom";

const CarrierPortal = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [carrierName, setCarrierName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [showLogoutWarning, setShowLogoutWarning] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRangePreset>("this-month");
  const [selectedTruck, setSelectedTruck] = useState<string>("all");
  const [selectedDropoff, setSelectedDropoff] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Load carrier data and tickets
  useEffect(() => {
    const loadData = async () => {
      if (!user || user.role !== "carrier") {
        navigate("/carrier/login");
        return;
      }

      setIsLoading(true);
      try {
        // Get carrier name
        const carrier = await carrierService.getCarrierById(user.id);
        if (carrier) {
          setCarrierName(carrier.name);
        }

        // Get all tickets
        const allTickets = await ticketService.getAllTickets();
        // Filter tickets for this carrier
        const carrierTickets = allTickets.filter(
          (ticket) => ticket.carrier_id === user.id
        );
        setTickets(carrierTickets);
      } catch (error) {
        console.error("Error loading carrier data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user, navigate]);

  // Get unique trucks and dropoff locations for filters
  const uniqueTrucks = useMemo(() => {
    const trucks = new Set(tickets.map((t) => t.truck_id).filter(Boolean));
    return Array.from(trucks).sort();
  }, [tickets]);

  const uniqueDropoffs = useMemo(() => {
    const dropoffs = new Set(
      tickets.map((t) => t.destination_site).filter(Boolean)
    );
    return Array.from(dropoffs).sort();
  }, [tickets]);

  // Date range calculation
  const getDateRangeFilter = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (dateRange) {
      case "today":
        return { start: today, end: new Date() };
      case "this-week": {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return { start: weekStart, end: new Date() };
      }
      case "this-month": {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return { start: monthStart, end: new Date() };
      }
      case "last-6-months": {
        const sixMonthsAgo = new Date(today);
        sixMonthsAgo.setMonth(today.getMonth() - 6);
        return { start: sixMonthsAgo, end: new Date() };
      }
      case "this-year": {
        const yearStart = new Date(today.getFullYear(), 0, 1);
        return { start: yearStart, end: new Date() };
      }
      case "custom": {
        if (customStartDate && customEndDate) {
          return {
            start: new Date(customStartDate),
            end: new Date(customEndDate + "T23:59:59"),
          };
        }
        return null;
      }
      default:
        return null;
    }
  };

  // Filter tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const searchableText = [
          ticket.ticket_id,
          ticket.truck_id,
          ticket.driver_name,
          ticket.origin_site,
          ticket.destination_site,
          ticket.confirmer_name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!searchableText.includes(query)) return false;
      }

      // Date range filter
      const dateFilter = getDateRangeFilter();
      if (dateFilter) {
        const ticketDate = new Date(ticket.created_at);
        if (ticketDate < dateFilter.start || ticketDate > dateFilter.end) {
          return false;
        }
      }

      // Truck filter
      if (selectedTruck !== "all" && ticket.truck_id !== selectedTruck) {
        return false;
      }

      // Dropoff location filter
      if (
        selectedDropoff !== "all" &&
        ticket.destination_site !== selectedDropoff
      ) {
        return false;
      }

      // Status filter
      if (selectedStatus !== "all" && ticket.status !== selectedStatus) {
        return false;
      }

      return true;
    });
  }, [
    tickets,
    searchQuery,
    dateRange,
    selectedTruck,
    selectedDropoff,
    selectedStatus,
    customStartDate,
    customEndDate,
  ]);

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      "Ticket Date",
      "Client Name",
      "Transaction/Ticket ID",
      "Truck ID",
      "Driver Name",
      "Pickup Location",
      "Drop-off Location",
      "Net Weight",
      "Ticket Close Time",
      "Destination Attendant Name",
      "Status",
    ];

    const rows = filteredTickets.map((ticket) => [
      new Date(ticket.created_at).toLocaleDateString(),
      "Avensis Energy",
      ticket.ticket_id,
      ticket.truck_id,
      ticket.driver_name || "-",
      ticket.origin_site,
      ticket.destination_site,
      ticket.net_weight ? ticket.net_weight.toFixed(2) : "-",
      ticket.delivered_at
        ? new Date(ticket.delivered_at).toLocaleString()
        : "-",
      ticket.confirmer_name || "-",
      ticket.status,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `carrier-activity-${carrierName}-${
        new Date().toISOString().split("T")[0]
      }.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to PDF (simplified - creates a printable view)
  const exportToPDF = () => {
    window.print();
  };

  if (!user || user.role !== "carrier") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <Header
        showLogoutButton
        onLogoutClick={() => setShowLogoutWarning(true)}
      />

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Title and Description */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">
              Carrier Activity Portal
            </h1>
            <p className="text-muted-foreground">
              View all loads your trucks have completed on the Avensis eTicket
              platform. Use the filters to see your activity by day, week,
              month, or year, and open any ticket for full details and proof of
              delivery.
            </p>
            {carrierName && (
              <p className="text-sm font-medium text-primary">
                Logged in as: {carrierName}
              </p>
            )}
          </div>

          {/* Filters */}
          <Card className="shadow-md">
            <div className="p-4 space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search tickets, trucks, drivers, locations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filter Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* Date Range */}
                <Select
                  value={dateRange}
                  onValueChange={(value) =>
                    setDateRange(value as DateRangePreset)
                  }
                >
                  <SelectTrigger>
                    <Calendar className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="this-week">This Week</SelectItem>
                    <SelectItem value="this-month">This Month</SelectItem>
                    <SelectItem value="last-6-months">Last 6 Months</SelectItem>
                    <SelectItem value="this-year">This Year</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>

                {/* Truck Filter */}
                <Select value={selectedTruck} onValueChange={setSelectedTruck}>
                  <SelectTrigger>
                    <Truck className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="All Trucks" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Trucks</SelectItem>
                    {uniqueTrucks.map((truck) => (
                      <SelectItem key={truck} value={truck}>
                        {truck}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Dropoff Location Filter */}
                <Select
                  value={selectedDropoff}
                  onValueChange={setSelectedDropoff}
                >
                  <SelectTrigger>
                    <MapPin className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="All Locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {uniqueDropoffs.map((location) => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Status Filter */}
                <Select
                  value={selectedStatus}
                  onValueChange={setSelectedStatus}
                >
                  <SelectTrigger>
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="CREATED">Created</SelectItem>
                    <SelectItem value="VERIFIED">Verified</SelectItem>
                    <SelectItem value="DELIVERED">Delivered</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                  </SelectContent>
                </Select>

                {/* Export Button */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={exportToCSV}
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                  <Button
                    variant="outline"
                    onClick={exportToPDF}
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                </div>
              </div>

              {/* Custom Date Range */}
              {dateRange === "custom" && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Start Date
                    </label>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      End Date
                    </label>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Results Count */}
              <div className="text-sm text-muted-foreground">
                Showing {filteredTickets.length} of {tickets.length} tickets
              </div>
            </div>
          </Card>

          {/* Tickets Table */}
          {isLoading ? (
            <Card className="p-12 text-center shadow-md">
              <div className="flex justify-center mb-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
              <p className="text-muted-foreground">Loading tickets...</p>
            </Card>
          ) : filteredTickets.length === 0 ? (
            <Card className="p-12 text-center shadow-md">
              <FileText className="mx-auto mb-4 h-16 w-16 text-muted-foreground/50" />
              <p className="text-lg font-medium text-foreground">
                No tickets found
              </p>
              <p className="text-sm text-muted-foreground">
                Try adjusting your filters to see more results
              </p>
            </Card>
          ) : (
            <Card className="shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Ticket Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Client Name
                          </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Transaction ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Ticket ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Truck ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Driver Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Pickup Location
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Drop-off Location
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Net Weight
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Close Time
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Attendant
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredTickets.map((ticket) => (
                      <tr
                        key={ticket.ticket_id}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">
                          {new Date(ticket.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          Avensis Energy
                        </td>
                        <td>
                          {ticket.transaction_id}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-foreground">
                          {ticket.ticket_id}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {ticket.truck_id}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {ticket.driver_name || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {ticket.origin_site}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {ticket.destination_site}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">
                          {ticket.net_weight
                            ? `${ticket.net_weight.toFixed(2)} tons`
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">
                          {ticket.delivered_at
                            ? new Date(ticket.delivered_at).toLocaleString()
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {ticket.confirmer_name || "-"}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={ticket.status} />
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              navigate(`/tickets/${ticket.ticket_id}`)
                            }
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </main>

      {/* Logout Modal */}
      <LogoutModal
        open={showLogoutWarning}
        onOpenChange={setShowLogoutWarning}
        redirectPath="/carrier/login"
      />
    </div>
  );
};

export default CarrierPortal;
