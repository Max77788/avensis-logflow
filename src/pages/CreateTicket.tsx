import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { SignaturePad } from "@/components/SignaturePad";
import { TicketImageUpload } from "@/components/TicketImageUpload";
import { ArrowLeft, Save, Truck as TruckIcon, Weight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type { Ticket } from "@/lib/types";
import { ticketService } from "@/lib/ticketService";
import { carrierService, type Carrier } from "@/lib/carrierService";
import { TRUCKS, CARRIERS } from "@/lib/trucksAndCarriers";

// Sample data for dropdowns
const DESTINATION_SITES = [
  "Quarry A - North",
  "Quarry B - South",
  "Quarry C - East",
];

const CreateTicket = () => {
  const navigate = useNavigate();
  const { user, driverProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const truckFromQR = searchParams.get("truck");

  const [formData, setFormData] = useState({
    carrier: "",
    carrier_id: "",
    truck_id: truckFromQR || "",
    driver_id: "",
    driver_name: "",
    destination_site: "",
    net_weight: "",
  });

  const [signature, setSignature] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [
    hasShownActiveTicketNotification,
    setHasShownActiveTicketNotification,
  ] = useState(false);
  const [hasActiveTicket, setHasActiveTicket] = useState(false);

  // Fetch carriers on component mount

  useEffect(() => {
    const fetchCarriers = async () => {
      const data = await carrierService.getAllCarriers();
      setCarriers(data);
    };
    fetchCarriers();
  }, []);

  // Load driver data on mount
  useEffect(() => {
    const loadData = async () => {
      // If driver is logged in, auto-fill their data
      if (user?.role === "driver" && driverProfile) {
        // Get the carrier name from the carrier ID
        let carrierName = "";
        let carrierId = "";
        if (driverProfile.carrier_id) {
          const carrier = carriers.find(
            (c) => c.id === driverProfile.carrier_id
          );
          carrierName = carrier?.name || "";
          carrierId = driverProfile.carrier_id;
        }

        // Get the truck name from the truck UUID
        let truckName = truckFromQR || "";
        if (driverProfile.default_truck_id && !truckFromQR) {
          const truck = await carrierService.getTruckById(
            driverProfile.default_truck_id
          );
          truckName = truck?.truck_id || "";
        }

        setFormData((prev) => ({
          ...prev,
          carrier: carrierName,
          carrier_id: carrierId,
          truck_id: truckName,
          driver_id: driverProfile.id,
          driver_name: driverProfile.name,
        }));
      }
    };
    loadData();
  }, [user, driverProfile, carriers, truckFromQR]);

  // Check for active tickets only once when driver profile is loaded
  useEffect(() => {
    const checkActiveTickets = async () => {
      if (
        user?.role === "driver" &&
        driverProfile?.id &&
        !hasShownActiveTicketNotification
      ) {
        const activeTickets = await ticketService.getActiveTicketsByDriver(
          driverProfile.id
        );
        if (activeTickets.length > 0) {
          setHasActiveTicket(true);
          toast({
            title: "Active Ticket",
            description:
              "You have an active ticket. Complete it before creating a new one.",
            variant: "destructive",
          });
        }
        setHasShownActiveTicketNotification(true);
      }
    };
    checkActiveTickets();
  }, [driverProfile?.id, hasShownActiveTicketNotification]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check for active tickets if driver is logged in
    if (user?.role === "driver" && driverProfile?.id) {
      const activeTickets = await ticketService.getActiveTicketsByDriver(
        driverProfile.id
      );
      if (activeTickets.length > 0) {
        toast({
          title: "Uh-oh!",
          description:
            "You already have another active delivery ticket. Please complete it before starting a new one.",
          variant: "destructive",
        });
        return;
      }
    }

    // Validation
    if (!formData.carrier) {
      toast({
        title: "Carrier Required",
        description: "Please select a carrier",
        variant: "destructive",
      });
      return;
    }

    if (!formData.truck_id) {
      toast({
        title: "Truck Required",
        description: "Please select a truck",
        variant: "destructive",
      });
      return;
    }

    if (!formData.driver_name) {
      toast({
        title: "Driver Required",
        description: "Please enter a driver name",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    const ticket: Ticket = {
      ticket_id: `TKT-${Date.now()}`,
      truck_qr_id: `TRUCK-${formData.truck_id}`,
      truck_id: formData.truck_id,
      product: "", // Optional field, left empty
      origin_site: "", // Will be filled during delivery
      destination_site: formData.destination_site,
      net_weight: parseFloat(formData.net_weight) || 0,
      scale_operator_signature: signature,
      status: "VERIFIED_AT_SCALE",
      created_at: new Date().toISOString(),
      verified_at_scale: new Date().toISOString(),
      carrier: formData.carrier,
      carrier_id: formData.carrier_id,
      driver_name: formData.driver_name,
      driver_id: formData.driver_id,
    };

    const result = await ticketService.createTicket(ticket);

    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: "Ticket Created",
        description: `Ticket ${ticket.ticket_id} created successfully`,
      });
      navigate(`/tickets/${ticket.ticket_id}`, { state: { ticket } });
    } else {
      toast({
        title: "Error Creating Ticket",
        description:
          result.error || "Failed to create ticket. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Create Ticket
              </h1>
              <p className="text-sm text-muted-foreground">
                Scale verification
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate("/")}>
            Home
          </Button>
        </div>
      </header>

      {/* Form */}
      <main className="container mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
          {/* Truck Info - Compact for Mobile */}
          <Card className="overflow-hidden shadow-md">
            <div className="bg-primary/5 p-4">
              <div className="flex items-center gap-2 text-primary">
                <TruckIcon className="h-5 w-5" />
                <h2 className="font-semibold">Truck Information</h2>
              </div>
            </div>
            <div className="space-y-3 p-4">
              {/* Always in row layout for Carrier, Truck, Driver */}
              <div className="grid grid-cols-3 gap-2">
                {/* Carrier - Read-only for drivers */}
                <div className="min-w-0">
                  <Label htmlFor="carrier" className="text-xs">
                    Carrier
                  </Label>
                  {user?.role === "driver" ? (
                    <div className="mt-1 rounded border border-border bg-muted p-1 text-xs text-foreground truncate">
                      {formData.carrier || "Not assigned"}
                    </div>
                  ) : (
                    <SearchableSelect
                      value={formData.carrier}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          carrier: value,
                        })
                      }
                      placeholder="Select"
                      items={[
                        // Database carriers
                        ...carriers.map((carrier) => ({
                          value: carrier.name,
                          label: carrier.name,
                        })),
                        // Static carriers not in database
                        ...CARRIERS.filter(
                          (staticCarrier) =>
                            !carriers.some(
                              (dbCarrier) => dbCarrier.name === staticCarrier
                            )
                        ).map((carrier) => ({
                          value: carrier,
                          label: carrier,
                        })),
                      ]}
                    />
                  )}
                </div>

                {/* Truck ID - Read-only for drivers */}
                <div className="min-w-0">
                  <Label htmlFor="truck_id" className="text-xs">
                    Truck ID
                  </Label>
                  {user?.role === "driver" ? (
                    <div className="mt-1 rounded border border-border bg-muted p-1 text-xs text-foreground truncate">
                      {formData.truck_id || "Not assigned"}
                    </div>
                  ) : (
                    <SearchableSelect
                      value={formData.truck_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, truck_id: value })
                      }
                      placeholder="Select"
                      items={TRUCKS.map((truck) => ({
                        value: truck,
                        label: truck,
                      }))}
                    />
                  )}
                </div>

                {/* Driver Name - Read-only for drivers */}
                <div className="min-w-0">
                  <Label htmlFor="driver_name" className="text-xs">
                    Driver
                  </Label>
                  <Input
                    id="driver_name"
                    name="driver_name"
                    type="text"
                    value={formData.driver_name}
                    onChange={handleChange}
                    placeholder="Driver"
                    className="mt-1 text-xs"
                    readOnly={user?.role === "driver"}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Ticket Image Upload - For drivers to store ticket images */}
          {user?.role === "driver" && <TicketImageUpload />}

          {/* Destination Site */}
          <Card className="shadow-md">
            <div className="space-y-4 p-4">
              <div>
                <Label htmlFor="destination_site">Destination Site *</Label>
                <SearchableSelect
                  value={formData.destination_site}
                  onValueChange={(value) =>
                    setFormData({ ...formData, destination_site: value })
                  }
                  placeholder="Select destination site"
                  items={DESTINATION_SITES.map((site) => ({
                    value: site,
                    label: site,
                  }))}
                />
              </div>
            </div>
          </Card>

          {/* Weight Info */}
          <Card className="overflow-hidden shadow-md">
            <div className="bg-success/5 p-4">
              <div className="flex items-center gap-2 text-success">
                <Weight className="h-5 w-5" />
                <h2 className="font-semibold">Weight</h2>
              </div>
            </div>
            <div className="space-y-4 p-4">
              <div>
                <Label htmlFor="net_weight">Net Weight (tons) *</Label>
                <Input
                  id="net_weight"
                  name="net_weight"
                  type="number"
                  step="0.01"
                  value={formData.net_weight}
                  onChange={handleChange}
                  required
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>
            </div>
          </Card>

          {/* Signature - Optional */}
          <SignaturePad
            onSave={setSignature}
            label="Scale Operator Signature (Optional)"
          />

          {signature && (
            <Card className="overflow-hidden shadow-md">
              <div className="p-4">
                <Label className="mb-2 block">Signature Preview</Label>
                <img
                  src={signature}
                  alt="Operator signature"
                  className="h-32 w-full rounded border border-border object-contain bg-white"
                />
              </div>
            </Card>
          )}

          {/* Submit */}
          <Button
            type="submit"
            size="lg"
            className="w-full shadow-lg"
            disabled={isSubmitting || hasActiveTicket}
            title={
              hasActiveTicket
                ? "You have an active ticket. Complete it before creating a new one."
                : ""
            }
          >
            <Save className="mr-2 h-5 w-5" />
            {isSubmitting
              ? "Creating..."
              : hasActiveTicket
              ? "Complete Active Ticket First"
              : "Create & Verify Ticket"}
          </Button>
        </form>
      </main>
    </div>
  );
};

export default CreateTicket;
