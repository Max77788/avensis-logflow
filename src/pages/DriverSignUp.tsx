import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { ArrowLeft, UserPlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { carrierService, type Carrier, type Truck } from "@/lib/carrierService";
import { CARRIERS, getTrucksByCarrier } from "@/lib/trucksAndCarriers";

const DriverSignUp = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, setDriverProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    email: (location.state as any)?.email || "",
    carrier_id: "",
    default_truck_id: "",
  });

  // Fetch carriers on component mount
  useEffect(() => {
    const fetchCarriers = async () => {
      const data = await carrierService.getAllCarriers();
      setCarriers(data);
    };
    fetchCarriers();
  }, []);

  // Fetch trucks when carrier is selected
  useEffect(() => {
    if (formData.carrier_id) {
      const fetchTrucks = async () => {
        const data = await carrierService.getTrucksByCarrier(
          formData.carrier_id
        );
        setTrucks(data);
        // Reset truck selection when carrier changes
        setFormData((prev) => ({ ...prev, default_truck_id: "" }));
      };
      fetchTrucks();
    } else {
      setTrucks([]);
    }
  }, [formData.carrier_id]);

  // Combine database carriers with static list - sorted alphabetically
  const carriersList = [
    // First add database carriers
    ...carriers.map((carrier) => ({
      value: carrier.id,
      label: carrier.name,
    })),
    // Then add static carriers that aren't already in the database
    ...CARRIERS.filter(
      (staticCarrier) =>
        !carriers.some((dbCarrier) => dbCarrier.name === staticCarrier)
    ).map((carrier) => ({
      value: carrier,
      label: carrier,
    })),
  ].sort((a, b) =>
    a.label.localeCompare(b.label, undefined, {
      numeric: true,
      sensitivity: "base",
    })
  );

  // Fallback to static trucks if database trucks are empty - sorted alphabetically
  const trucksList = (
    trucks.length > 0
      ? trucks.map((truck) => ({
          value: truck.id,
          label: truck.truck_id,
        }))
      : getTrucksByCarrier(
          carriers.find((c) => c.id === formData.carrier_id)?.name || ""
        ).map((truck) => ({
          value: truck,
          label: truck,
        }))
  ).sort((a, b) =>
    a.label.localeCompare(b.label, undefined, {
      numeric: true,
      sensitivity: "base",
    })
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Check if driver already exists
      const existingDriver = await carrierService.getDriverByEmail(
        formData.email
      );

      if (existingDriver) {
        setIsLoading(false);
        return;
      }

      // Get or create carrier
      let carrierId = formData.carrier_id;

      // If carrier_id looks like a string name (not a UUID), get or create it
      if (!carrierId.includes("-")) {
        const carrierResult = await carrierService.getOrCreateCarrier(
          carrierId
        );
        if (!carrierResult.success || !carrierResult.data) {
          throw new Error(
            carrierResult.error || "Failed to get or create carrier"
          );
        }
        carrierId = carrierResult.data.id;
      }

      // Get or create truck
      let truckId = formData.default_truck_id;

      // If truck_id looks like a string name (not a UUID), get or create it
      if (!truckId.includes("-")) {
        const truckResult = await carrierService.getOrCreateTruck(
          truckId,
          carrierId
        );
        if (!truckResult.success || !truckResult.data) {
          throw new Error(truckResult.error || "Failed to get or create truck");
        }
        truckId = truckResult.data.id;
      }

      // Create new driver with the resolved IDs
      const result = await carrierService.createDriver(
        formData.name,
        carrierId,
        formData.email,
        truckId
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to create driver");
      }

      // Log in the driver
      login("driver", result.data.id);

      // Set driver profile
      setDriverProfile({
        id: result.data.id,
        name: result.data.name,
        carrier_id: result.data.carrier_id,
        default_truck_id: result.data.default_truck_id,
        driver_qr_code: result.data.driver_qr_code,
        status: result.data.status,
        created_at: result.data.created_at,
        updated_at: result.data.updated_at,
      });

      // Redirect based on driver status
      if (result.data.status === "active") {
        navigate("/");
      } else {
        navigate("/driver/profile");
      }
    } catch (error: any) {
      console.error("Sign up error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background p-4">
      <div className="mx-auto max-w-md">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/login")}
            className="mb-4"
          >
            ← Back
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Driver Sign Up</h1>
          <p className="text-muted-foreground mt-2">
            Create your driver account
          </p>
        </div>

        {/* Sign Up Form */}
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Full Name*</Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address*</Label>
              <Input
                id="email"
                type="email"
                placeholder="driver@example.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
            </div>

            {/* Carrier */}
            <div className="space-y-2">
              <Label htmlFor="carrier">Carrier*</Label>
              <SearchableSelect
                value={formData.carrier_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, carrier_id: value })
                }
                placeholder="Select a carrier"
                items={carriersList}
              />
            </div>

            {/* Default Truck */}
            <div className="space-y-2">
              <Label htmlFor="truck">Default Truck*</Label>
              <SearchableSelect
                value={formData.default_truck_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, default_truck_id: value })
                }
                placeholder="Select a truck"
                items={trucksList}
                disabled={!formData.carrier_id}
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={
                isLoading ||
                !formData.name ||
                !formData.email ||
                !formData.carrier_id ||
                !formData.default_truck_id
              }
            >
              {isLoading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Creating Account...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create Account
                </>
              )}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-4">
            Your unique driver QR code will be generated automatically.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default DriverSignUp;
