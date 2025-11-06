import { useState, useEffect } from "react";
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
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { ticketService } from "@/lib/ticketService";
import { carrierService } from "@/lib/carrierService";
import type { Ticket } from "@/lib/types";

const Overview = () => {
  const navigate = useNavigate();
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [allDrivers, setAllDrivers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [ticketSearch, setTicketSearch] = useState("");
  const [driverSearch, setDriverSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load all tickets
        const tickets = await ticketService.getAllTickets();
        setAllTickets(tickets);

        // Load all drivers from all carriers
        const carriers = await carrierService.getAllCarriers();
        const allDriversList: any[] = [];
        for (const carrier of carriers) {
          const drivers = await carrierService.getDriversByCarrier(carrier.id);
          allDriversList.push(...drivers);
        }
        setAllDrivers(allDriversList);
      } catch (error) {
        console.error("Error loading overview data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Filter tickets
  const filteredTickets = allTickets.filter((ticket) => {
    const matchesSearch =
      ticket.ticket_id.toLowerCase().includes(ticketSearch.toLowerCase()) ||
      ticket.truck_id.toLowerCase().includes(ticketSearch.toLowerCase()) ||
      (ticket.carrier || "").toLowerCase().includes(ticketSearch.toLowerCase());

    const matchesStatus = !statusFilter || ticket.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Filter drivers
  const filteredDrivers = allDrivers.filter(
    (driver) =>
      driver.name.toLowerCase().includes(driverSearch.toLowerCase()) ||
      driver.email.toLowerCase().includes(driverSearch.toLowerCase())
  );

  const statuses = ["CREATED", "VERIFIED", "DELIVERED", "CLOSED"];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Overview</h1>
                <p className="text-sm text-muted-foreground">
                  All tickets and drivers
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Package className="h-4 w-4" />
              <span>{allTickets.length} Tickets</span>
              <span className="mx-2">•</span>
              <Users className="h-4 w-4" />
              <span>{allDrivers.length} Drivers</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Tickets Section - Takes 2 columns on large screens */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                All Tickets ({filteredTickets.length})
              </h2>
            </div>

            {/* Search and Filters */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by ticket ID, truck, or carrier..."
                  value={ticketSearch}
                  onChange={(e) => setTicketSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status Filter */}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={statusFilter === null ? "default" : "outline"}
                  onClick={() => setStatusFilter(null)}
                  className="gap-2"
                >
                  <Filter className="h-3 w-3" />
                  All
                </Button>
                {statuses.map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={statusFilter === status ? "default" : "outline"}
                    onClick={() => setStatusFilter(status)}
                  >
                    {status.replace(/_/g, " ")}
                  </Button>
                ))}
              </div>
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
                <p className="text-muted-foreground">No tickets found</p>
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
                                Truck
                              </p>
                              <p className="font-medium text-foreground">
                                {ticket.truck_id}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground/70">
                                Carrier
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
                          <p className="text-xs text-muted-foreground">tons</p>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Drivers Section - Takes 1 column on large screens */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              All Drivers ({filteredDrivers.length})
            </h2>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search drivers..."
                value={driverSearch}
                onChange={(e) => setDriverSearch(e.target.value)}
                className="pl-10"
              />
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
                  No drivers found
                </p>
              </Card>
            ) : (
              <div className="space-y-2">
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
        </div>
      </main>
    </div>
  );
};

export default Overview;
