import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { ArrowLeft, Search, Download, Package, Filter } from "lucide-react";
import type { Ticket } from "@/lib/types";
import { ticketService } from "@/lib/ticketService";

const Admin = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    const loadTickets = async () => {
      const allTickets = await ticketService.getAllTickets();
      setTickets(allTickets);
    };
    loadTickets();
  }, []);

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.ticket_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.truck_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.product.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      filterStatus === "all" || ticket.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const exportCSV = () => {
    if (tickets.length === 0) {
      return;
    }

    const headers = [
      "Ticket ID",
      "Truck ID",
      "Product",
      "Origin",
      "Destination",
      "Status",
      "Created",
      "Delivered",
    ];

    const rows = tickets.map((t) => [
      t.ticket_id,
      t.truck_id,
      t.product,
      t.origin_site,
      t.destination_site,
      t.status,
      new Date(t.created_at).toLocaleString(),
      t.delivered_at ? new Date(t.delivered_at).toLocaleString() : "N/A",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tickets-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">
                Admin Dashboard
              </h1>
              <p className="text-sm text-muted-foreground">
                {tickets.length} total tickets
              </p>
            </div>
            <Button onClick={exportCSV} variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Filters */}
          <Card className="shadow-md">
            <div className="space-y-4 p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by ticket ID, truck, or product..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={filterStatus === "all" ? "default" : "outline"}
                  onClick={() => setFilterStatus("all")}
                >
                  <Filter className="mr-2 h-3 w-3" />
                  All
                </Button>
                <Button
                  size="sm"
                  variant={filterStatus === "CREATED" ? "default" : "outline"}
                  onClick={() => setFilterStatus("CREATED")}
                >
                  Created
                </Button>
                <Button
                  size="sm"
                  variant={filterStatus === "VERIFIED" ? "default" : "outline"}
                  onClick={() => setFilterStatus("VERIFIED")}
                >
                  Verified
                </Button>
                <Button
                  size="sm"
                  variant={filterStatus === "DELIVERED" ? "default" : "outline"}
                  onClick={() => setFilterStatus("DELIVERED")}
                >
                  Delivered
                </Button>
                <Button
                  size="sm"
                  variant={filterStatus === "CLOSED" ? "default" : "outline"}
                  onClick={() => setFilterStatus("CLOSED")}
                >
                  Closed
                </Button>
              </div>
            </div>
          </Card>

          {/* Tickets List */}
          {filteredTickets.length === 0 ? (
            <Card className="shadow-md">
              <div className="p-12 text-center">
                <Package className="mx-auto mb-4 h-16 w-16 text-muted-foreground/50" />
                <p className="text-lg font-medium text-foreground">
                  No Tickets Found
                </p>
                <p className="text-sm text-muted-foreground">
                  {searchQuery || filterStatus !== "all"
                    ? "Try adjusting your filters"
                    : "Create your first ticket to get started"}
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredTickets.map((ticket) => (
                <Card
                  key={ticket.ticket_id}
                  className="cursor-pointer shadow-md transition-all hover:shadow-lg"
                  onClick={() => navigate(`/tickets/${ticket.ticket_id}`)}
                >
                  <div className="p-4">
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-foreground">
                          {ticket.ticket_id}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Truck {ticket.truck_id} • {ticket.product}
                        </p>
                      </div>
                      <StatusBadge status={ticket.status} />
                    </div>

                    <div className="grid gap-2 text-sm sm:grid-cols-2">
                      <div>
                        <span className="text-muted-foreground">From:</span>{" "}
                        <span className="font-medium text-foreground">
                          {ticket.origin_site}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">To:</span>{" "}
                        <span className="font-medium text-foreground">
                          {ticket.destination_site}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Created:</span>{" "}
                        <span className="font-medium text-foreground">
                          {new Date(ticket.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {ticket.net_weight && (
                        <div>
                          <span className="text-muted-foreground">
                            Net Weight:
                          </span>{" "}
                          <span className="font-medium text-foreground">
                            {ticket.net_weight.toFixed(0)} kg
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Admin;
