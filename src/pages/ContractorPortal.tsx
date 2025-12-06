import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import {
  Loader2,
  LogOut,
  FileText,
  Search,
  MapPin,
  ExternalLink,
  CheckCircle,
  Clock,
} from "lucide-react";
import { ticketService } from "@/lib/ticketService";
import type { Ticket } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ContractorPortal = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [contractorName, setContractorName] = useState("");
  const [destinationSites, setDestinationSites] = useState<string[]>([]);
  const [destinationSiteIds, setDestinationSiteIds] = useState<string[]>([]); // Store site IDs for filtering

  // Tickets state
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSite, setSelectedSite] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Redirect if not authenticated as attendant (only after loading is complete)
  useEffect(() => {
    if (loading) return; // Wait for auth state to load

    if (!user || user.role !== "attendant") {
      navigate("/contractor/login");
      return;
    }
  }, [user, navigate, loading]);

  // Load contractor data and destination sites
  useEffect(() => {
    const loadData = async () => {
      if (!user || user.role !== "attendant") {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Get contractor company data
        const { data: company, error: companyError } = await supabase
          .from("companies")
          .select("*")
          .eq("id", user.id)
          .single();

        if (companyError) throw companyError;
        setContractorName(company.name);

        // Get destination sites for this contractor
        const { data: sites, error: sitesError } = await supabase
          .from("destination_sites")
          .select("id, name")
          .eq("company_id", user.id);

        if (sitesError) throw sitesError;

        const siteNames = sites.map((site) => site.name);
        const siteIds = sites.map((site) => site.id);
        setDestinationSites(siteNames);
        setDestinationSiteIds(siteIds);

        // Load tickets with Supabase filtering
        await loadTickets(siteIds);
      } catch (error) {
        console.error("Error loading contractor data:", error);
        toast({
          title: "Error",
          description: "Failed to load contractor data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  const loadTickets = async (siteIds: string[]) => {
    setIsLoadingTickets(true);
    try {
      if (siteIds.length === 0) {
        setTickets([]);
        setIsLoadingTickets(false);
        return;
      }

      // Get today's date at midnight (for CLOSED tickets filter)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      // Query tickets directly from Supabase with proper filtering
      // Filter: destination_site_id IN (siteIds) AND (status = 'VERIFIED' OR (status = 'CLOSED' AND created_at >= today))
      const { data, error } = await supabase
        .from("tickets")
        .select(
          `
          *,
          truck:trucks!tickets_truck_id_fkey (
            id,
            truck_id,
            carrier:companies (
              id,
              name
            )
          ),
          driver:drivers (
            id,
            name,
            driver_qr_code
          ),
          pickup_site:pickup_sites!tickets_origin_site_id_fkey (
            id,
            name,
            address
          ),
          destination_site_data:destination_sites!tickets_destination_site_id_fkey (
            id,
            name,
            location,
            address
          )
        `
        )
        .in("destination_site_id", siteIds)
        .or(
          `status.eq.VERIFIED,and(status.eq.CLOSED,created_at.gte.${todayISO})`
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading tickets from Supabase:", error);
        throw error;
      }

      // Map the tickets with joined data
      const mappedTickets = (data || []).map((row: any) => {
        const ticket: any = {
          ...row,
          // Map truck data
          truck_name: row.truck?.truck_id || row.truck_id || "Unknown",
          carrier: row.truck?.carrier?.name || row.carrier || "Unknown",
          carrier_id: row.truck?.carrier?.id || row.carrier_id,
          // Map driver data
          driver_name: row.driver?.name || row.driver_name || "Not assigned",
          driver_qr_code: row.driver?.driver_qr_code || row.driver_qr_code,
          // Map site data (use joined data if available, fallback to text fields)
          origin_site: row.pickup_site?.name || row.origin_site || "Unknown",
          destination_site:
            row.destination_site_data?.name ||
            row.destination_site ||
            "Unknown",
        };

        // Clean up the nested objects to avoid confusion
        delete ticket.truck;
        delete ticket.driver;
        delete ticket.pickup_site;
        delete ticket.destination_site_data;

        return ticket;
      });

      setTickets(mappedTickets);
    } catch (error) {
      console.error("Error loading tickets:", error);
      toast({
        title: "Error",
        description: "Failed to load tickets",
        variant: "destructive",
      });
    } finally {
      setIsLoadingTickets(false);
    }
  };

  // Filter tickets based on search and filters
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const matchesSearch =
        searchQuery === "" ||
        ticket.ticket_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.transaction_id
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        ticket.truck_name?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSite =
        selectedSite === "all" || ticket.destination_site === selectedSite;

      const matchesStatus =
        selectedStatus === "all" || ticket.status === selectedStatus;

      return matchesSearch && matchesSite && matchesStatus;
    });
  }, [tickets, searchQuery, selectedSite, selectedStatus]);

  const handleLogout = () => {
    logout();
    navigate("/contractor/login");
  };

  const handleApproveTicket = async (ticketId: string) => {
    try {
      // Update ticket status to APPROVED or similar
      // This would need to be implemented based on your workflow
      toast({
        title: "Success",
        description: "Ticket approved successfully",
      });

      // Reload tickets
      if (destinationSiteIds.length > 0) {
        await loadTickets(destinationSiteIds);
      }
    } catch (error) {
      console.error("Error approving ticket:", error);
      toast({
        title: "Error",
        description: "Failed to approve ticket",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background">
      <Header />

      <div className="container mx-auto p-6 space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Destination Attendant Portal
            </h1>
            <p className="text-muted-foreground mt-1">
              {contractorName} - Manage incoming tickets
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Pending Verification
                </p>
                <p className="text-2xl font-bold">
                  {tickets.filter((t) => t.status === "VERIFIED").length}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Closed Today</p>
                <p className="text-2xl font-bold">
                  {tickets.filter((t) => t.status === "CLOSED").length}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <MapPin className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Destination Sites
                </p>
                <p className="text-2xl font-bold">{destinationSites.length}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters Section */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by ticket ID, transaction ID, or truck..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={selectedSite} onValueChange={setSelectedSite}>
              <SelectTrigger>
                <SelectValue placeholder="All Sites" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sites</SelectItem>
                {destinationSites.map((site) => (
                  <SelectItem key={site} value={site}>
                    {site}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="VERIFIED">Verified</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Tickets Table */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Incoming Tickets</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              {filteredTickets.length} ticket
              {filteredTickets.length !== 1 ? "s" : ""}
            </p>
          </div>

          {isLoadingTickets ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No tickets found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                      Ticket ID
                    </th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                      Transaction ID
                    </th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                      Date
                    </th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                      Truck
                    </th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                      Driver
                    </th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                      Destination Site
                    </th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                      Net Weight
                    </th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((ticket) => (
                    <tr
                      key={ticket.id}
                      className="border-b border-border hover:bg-accent/5 transition-colors"
                    >
                      <td className="p-3 text-sm font-medium">
                        {ticket.ticket_id}
                      </td>
                      <td className="p-3 text-sm">
                        {ticket.transaction_id || "-"}
                      </td>
                      <td className="p-3 text-sm">
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-sm">
                        {ticket.truck_name || "-"}
                      </td>
                      <td className="p-3 text-sm">
                        {ticket.driver_name || "-"}
                      </td>
                      <td className="p-3 text-sm">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {ticket.destination_site}
                        </div>
                      </td>
                      <td className="p-3 text-sm">
                        {ticket.net_weight ? `${ticket.net_weight} lbs` : "-"}
                      </td>
                      <td className="p-3">
                        <StatusBadge status={ticket.status} />
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              navigate(`/tickets/${ticket.ticket_id}/confirm-delivery`)
                            }
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          {/*
                          {ticket.status === "VERIFIED" && (
                            <Button
                              size="sm"
                              onClick={() =>
                                handleApproveTicket(ticket.ticket_id)
                              }
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Approve
                            </Button>
                          )}
                          */}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ContractorPortal;
