import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SignaturePad } from "@/components/SignaturePad";
import {
  ArrowLeft,
  Save,
  Truck as TruckIcon,
  Weight,
  Plus,
  X,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { Ticket } from "@/lib/types";
import { ticketService } from "@/lib/ticketService";
import {
  carrierService,
  type Carrier,
  type Truck,
  type Driver,
} from "@/lib/carrierService";

// Sample data for dropdowns
const ORIGIN_SITES = [
  "Quarry A - North",
  "Quarry B - South",
  "Quarry C - East",
];

const DESTINATION_SITES = [
  "Construction Site 1",
  "Construction Site 2",
  "Construction Site 3",
];

const PRODUCTS = [
  "Aggregate 10mm",
  "Aggregate 20mm",
  "Concrete Mix",
  "Sand",
  "Gravel",
];

const CreateTicket = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const truckFromQR = searchParams.get("truck");

  // State for data from Supabase
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [formData, setFormData] = useState({
    carrier_id: "",
    truck_id: truckFromQR || "",
    driver_id: "",
    driver_name: "",
    product: "",
    origin_site: "",
    destination_site: "",
    gross_weight: "",
    tare_weight: "",
    customer_email: "",
  });

  const [signature, setSignature] = useState<string | null>(null);
  const [netWeight, setNetWeight] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // UI state for adding new trucks/drivers
  const [showAddTruck, setShowAddTruck] = useState(false);
  const [newTruckId, setNewTruckId] = useState("");
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [newDriverName, setNewDriverName] = useState("");
  const [isAddingTruck, setIsAddingTruck] = useState(false);
  const [isAddingDriver, setIsAddingDriver] = useState(false);

  // Load carriers on mount
  useEffect(() => {
    const loadCarriers = async () => {
      setIsLoadingData(true);
      const data = await carrierService.getAllCarriers();
      setCarriers(data);
      setIsLoadingData(false);
    };
    loadCarriers();
  }, []);

  // Load trucks and drivers when carrier changes
  useEffect(() => {
    const loadTrucksAndDrivers = async () => {
      if (formData.carrier_id) {
        const [trucksData, driversData] = await Promise.all([
          carrierService.getTrucksByCarrier(formData.carrier_id),
          carrierService.getDriversByCarrier(formData.carrier_id),
        ]);
        setTrucks(trucksData);
        setDrivers(driversData);
        // Reset truck and driver when carrier changes
        setFormData((prev) => ({
          ...prev,
          truck_id: "",
          driver_id: "",
          driver_name: "",
        }));
      } else {
        setTrucks([]);
        setDrivers([]);
      }
    };
    loadTrucksAndDrivers();
  }, [formData.carrier_id]);

  useEffect(() => {
    const gross = parseFloat(formData.gross_weight);
    const tare = parseFloat(formData.tare_weight);
    if (!isNaN(gross) && !isNaN(tare)) {
      setNetWeight(gross - tare);
    } else {
      setNetWeight(null);
    }
  }, [formData.gross_weight, formData.tare_weight]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddTruck = async () => {
    if (!newTruckId.trim() || !formData.carrier_id) {
      toast({
        title: "Invalid Input",
        description: "Please enter a truck ID",
        variant: "destructive",
      });
      return;
    }

    setIsAddingTruck(true);
    const result = await carrierService.createTruck(
      newTruckId.trim(),
      formData.carrier_id
    );
    setIsAddingTruck(false);

    if (result.success && result.data) {
      setTrucks([...trucks, result.data]);
      setFormData({ ...formData, truck_id: result.data.truck_id });
      setNewTruckId("");
      setShowAddTruck(false);
      toast({
        title: "Truck Added",
        description: `Truck ${result.data.truck_id} added successfully`,
      });
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to add truck",
        variant: "destructive",
      });
    }
  };

  const handleAddDriver = async () => {
    if (!newDriverName.trim() || !formData.carrier_id) {
      toast({
        title: "Invalid Input",
        description: "Please enter a driver name",
        variant: "destructive",
      });
      return;
    }

    setIsAddingDriver(true);
    const result = await carrierService.createDriver(
      newDriverName.trim(),
      formData.carrier_id
    );
    setIsAddingDriver(false);

    if (result.success && result.data) {
      setDrivers([...drivers, result.data]);
      setFormData({
        ...formData,
        driver_id: result.data.id,
        driver_name: result.data.name,
      });
      setNewDriverName("");
      setShowAddDriver(false);
      toast({
        title: "Driver Added",
        description: `Driver ${result.data.name} added successfully`,
      });
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to add driver",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.carrier_id) {
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
        description: "Please select or add a truck",
        variant: "destructive",
      });
      return;
    }

    if (!formData.driver_name) {
      toast({
        title: "Driver Required",
        description: "Please select or add a driver",
        variant: "destructive",
      });
      return;
    }

    if (!signature) {
      toast({
        title: "Signature Required",
        description: "Please provide operator signature",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    const selectedCarrier = carriers.find((c) => c.id === formData.carrier_id);
    const ticket: Ticket = {
      ticket_id: `TKT-${Date.now()}`,
      truck_qr_id: `TRUCK-${formData.truck_id}`,
      truck_id: formData.truck_id,
      product: formData.product,
      origin_site: formData.origin_site,
      destination_site: formData.destination_site,
      gross_weight: parseFloat(formData.gross_weight),
      tare_weight: parseFloat(formData.tare_weight),
      net_weight: netWeight || 0,
      scale_operator_signature: signature,
      status: "VERIFIED_AT_SCALE",
      created_at: new Date().toISOString(),
      verified_at_scale: new Date().toISOString(),
      customer_email: formData.customer_email || undefined,
      carrier: selectedCarrier?.name || "",
      driver_name: formData.driver_name,
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
        <div className="container mx-auto flex items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Create Ticket</h1>
            <p className="text-sm text-muted-foreground">Scale verification</p>
          </div>
        </div>
      </header>

      {/* Form */}
      <main className="container mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
          {/* Truck Info */}
          <Card className="overflow-hidden shadow-md">
            <div className="bg-primary/5 p-4">
              <div className="flex items-center gap-2 text-primary">
                <TruckIcon className="h-5 w-5" />
                <h2 className="font-semibold">Truck Information</h2>
              </div>
            </div>
            <div className="space-y-4 p-4">
              {isLoadingData ? (
                <div className="text-center text-muted-foreground">
                  Loading carriers...
                </div>
              ) : (
                <>
                  {/* Carrier Selection */}
                  <div>
                    <Label htmlFor="carrier_id">Carrier * (Unchangeable)</Label>
                    <Select
                      value={formData.carrier_id}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          carrier_id: value,
                          truck_id: "",
                          driver_id: "",
                          driver_name: "",
                        })
                      }
                    >
                      <SelectTrigger id="carrier_id" className="mt-1">
                        <SelectValue placeholder="Select a carrier" />
                      </SelectTrigger>
                      <SelectContent>
                        {carriers.map((carrier) => (
                          <SelectItem key={carrier.id} value={carrier.id}>
                            {carrier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Truck Selection */}
                  <div>
                    <Label htmlFor="truck_id">Truck ID * (Changeable)</Label>
                    <div className="flex gap-2">
                      <Select
                        value={formData.truck_id}
                        onValueChange={(value) =>
                          setFormData({ ...formData, truck_id: value })
                        }
                        disabled={!formData.carrier_id}
                      >
                        <SelectTrigger id="truck_id" className="mt-1 flex-1">
                          <SelectValue placeholder="Select a truck" />
                        </SelectTrigger>
                        <SelectContent>
                          {trucks.map((truck) => (
                            <SelectItem key={truck.id} value={truck.truck_id}>
                              {truck.truck_id}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowAddTruck(!showAddTruck)}
                        disabled={!formData.carrier_id}
                        className="mt-1"
                        size="icon"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {showAddTruck && (
                      <div className="mt-3 flex gap-2">
                        <Input
                          placeholder="Enter truck ID (e.g., T-010)"
                          value={newTruckId}
                          onChange={(e) => setNewTruckId(e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          onClick={handleAddTruck}
                          disabled={isAddingTruck}
                          size="sm"
                        >
                          {isAddingTruck ? "Adding..." : "Add"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setShowAddTruck(false);
                            setNewTruckId("");
                          }}
                          size="icon"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Driver Selection */}
                  <div>
                    <Label htmlFor="driver_name">Driver * (Changeable)</Label>
                    <div className="flex gap-2">
                      <Select
                        value={formData.driver_id}
                        onValueChange={(value) => {
                          const driver = drivers.find((d) => d.id === value);
                          if (driver) {
                            setFormData({
                              ...formData,
                              driver_id: value,
                              driver_name: driver.name,
                            });
                          }
                        }}
                        disabled={!formData.carrier_id}
                      >
                        <SelectTrigger id="driver_name" className="mt-1 flex-1">
                          <SelectValue placeholder="Select a driver" />
                        </SelectTrigger>
                        <SelectContent>
                          {drivers.map((driver) => (
                            <SelectItem key={driver.id} value={driver.id}>
                              {driver.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowAddDriver(!showAddDriver)}
                        disabled={!formData.carrier_id}
                        className="mt-1"
                        size="icon"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {showAddDriver && (
                      <div className="mt-3 flex gap-2">
                        <Input
                          placeholder="Enter driver name"
                          value={newDriverName}
                          onChange={(e) => setNewDriverName(e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          onClick={handleAddDriver}
                          disabled={isAddingDriver}
                          size="sm"
                        >
                          {isAddingDriver ? "Adding..." : "Add"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setShowAddDriver(false);
                            setNewDriverName("");
                          }}
                          size="icon"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Product Selection */}
              <div>
                <Label htmlFor="product">Product *</Label>
                <Select
                  value={formData.product}
                  onValueChange={(value) =>
                    setFormData({ ...formData, product: value })
                  }
                >
                  <SelectTrigger id="product" className="mt-1">
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCTS.map((product) => (
                      <SelectItem key={product} value={product}>
                        {product}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Site Info */}
          <Card className="shadow-md">
            <div className="space-y-4 p-4">
              <div>
                <Label htmlFor="origin_site">Origin Site *</Label>
                <Select
                  value={formData.origin_site}
                  onValueChange={(value) =>
                    setFormData({ ...formData, origin_site: value })
                  }
                >
                  <SelectTrigger id="origin_site" className="mt-1">
                    <SelectValue placeholder="Select origin site" />
                  </SelectTrigger>
                  <SelectContent>
                    {ORIGIN_SITES.map((site) => (
                      <SelectItem key={site} value={site}>
                        {site}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="destination_site">Destination Site *</Label>
                <Select
                  value={formData.destination_site}
                  onValueChange={(value) =>
                    setFormData({ ...formData, destination_site: value })
                  }
                >
                  <SelectTrigger id="destination_site" className="mt-1">
                    <SelectValue placeholder="Select destination site" />
                  </SelectTrigger>
                  <SelectContent>
                    {DESTINATION_SITES.map((site) => (
                      <SelectItem key={site} value={site}>
                        {site}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="customer_email">
                  Customer Email (optional)
                </Label>
                <Input
                  id="customer_email"
                  name="customer_email"
                  type="email"
                  value={formData.customer_email}
                  onChange={handleChange}
                  placeholder="customer@example.com"
                  className="mt-1"
                />
              </div>
            </div>
          </Card>

          {/* Weight Info */}
          <Card className="overflow-hidden shadow-md">
            <div className="bg-success/5 p-4">
              <div className="flex items-center gap-2 text-success">
                <Weight className="h-5 w-5" />
                <h2 className="font-semibold">Weight Measurements</h2>
              </div>
            </div>
            <div className="space-y-4 p-4">
              <div>
                <Label htmlFor="gross_weight">Gross Weight (kg) *</Label>
                <Input
                  id="gross_weight"
                  name="gross_weight"
                  type="number"
                  step="0.01"
                  value={formData.gross_weight}
                  onChange={handleChange}
                  required
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="tare_weight">Tare Weight (kg) *</Label>
                <Input
                  id="tare_weight"
                  name="tare_weight"
                  type="number"
                  step="0.01"
                  value={formData.tare_weight}
                  onChange={handleChange}
                  required
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>
              {netWeight !== null && (
                <div className="rounded-lg bg-success-light p-4">
                  <Label className="text-sm text-muted-foreground">
                    Net Weight
                  </Label>
                  <p className="text-2xl font-bold text-success">
                    {netWeight.toFixed(2)} kg
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Signature */}
          <SignaturePad
            onSave={setSignature}
            label="Scale Operator Signature"
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
            disabled={isSubmitting}
          >
            <Save className="mr-2 h-5 w-5" />
            {isSubmitting ? "Creating..." : "Create & Verify Ticket"}
          </Button>
        </form>
      </main>
    </div>
  );
};

export default CreateTicket;
