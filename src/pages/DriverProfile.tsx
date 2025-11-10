import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  QrCode,
  LogOut,
  Plus,
  User,
  Truck,
  Building2,
  Download,
  Power,
  Home,
  AlertCircle,
  Moon,
  Sun,
  MapPin,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useShift } from "@/contexts/ShiftContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { carrierService } from "@/lib/carrierService";
import { ticketService } from "@/lib/ticketService";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { Ticket } from "@/lib/types";
import {
  CARRIERS,
  getTrucksByCarrier,
  PICKUP_LOCATIONS,
} from "@/lib/trucksAndCarriers";

const DriverProfile = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, driverProfile, logout, updateDriverStatus, setDriverProfile } =
    useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { shift, updateShift } = useShift();
  const [activeTickets, setActiveTickets] = useState<Ticket[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [carrierName, setCarrierName] = useState<string>("");
  const [editFormData, setEditFormData] = useState({
    truck_id: driverProfile?.default_truck_id || "",
    carrier_id: driverProfile?.carrier_id || "",
    pickup_location: shift?.pickupLocation || "",
  });

  // Load carrier name from UUID and sync truck_id
  useEffect(() => {
    const loadCarrierName = async () => {
      if (driverProfile?.carrier_id) {
        try {
          const carriers = await carrierService.getAllCarriers();
          const carrier = carriers.find(
            (c) => c.id === driverProfile.carrier_id
          );
          if (carrier) {
            setCarrierName(carrier.name);
            setEditFormData((prev) => ({
              ...prev,
              carrier_id: carrier.name,
              truck_id: driverProfile?.default_truck_id || "", // Sync truck_id from driverProfile
            }));
          }
        } catch (error) {
          console.error("Error loading carrier name:", error);
        }
      }
    };
    loadCarrierName();
  }, [driverProfile?.carrier_id, driverProfile?.default_truck_id]);

  useEffect(() => {
    if (!user || user.role !== "driver") {
      navigate("/");
      return;
    }

    const loadActiveTickets = async () => {
      setIsLoadingTickets(true);
      try {
        const allTickets = await ticketService.getAllTickets();

        const active = allTickets.filter(
          (t) =>
            t.driver_id === driverProfile?.id &&
            (t.status === "CREATED" ||
              t.status === "VERIFIED" ||
              t.status === "DELIVERED")
        );

        setActiveTickets(active);
      } catch (error) {
        console.error("Error loading tickets:", error);
      } finally {
        setIsLoadingTickets(false);
      }
    };

    loadActiveTickets();
  }, [user, driverProfile, navigate]);

  const handleToggleStatus = async () => {
    if (!driverProfile) return;

    setIsTogglingStatus(true);
    try {
      const newStatus =
        driverProfile.status === "inactive" ? "active" : "inactive";
      const result = await carrierService.updateDriverStatus(
        driverProfile.id,
        newStatus
      );

      if (result.success) {
        updateDriverStatus(newStatus);
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error("Error updating status:", error);
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const handleCarrierChange = async (carrierName: string) => {
    if (!driverProfile) return;

    setIsUpdatingProfile(true);
    try {
      // Reset truck_id when carrier changes since trucks are carrier-specific
      const updates: any = {
        default_truck_id: "", // Clear truck when carrier changes
      };

      let carrierIdForShift = driverProfile.carrier_id;
      let carrierNameForShift = carrierName;

      if (carrierName) {
        const carrierResult = await carrierService.getOrCreateCarrier(
          carrierName
        );
        if (carrierResult.success && carrierResult.data) {
          updates.carrier_id = carrierResult.data.id;
          carrierIdForShift = carrierResult.data.id;
          carrierNameForShift = carrierResult.data.name;
        } else {
          throw new Error(
            carrierResult.error || `Failed to get or create carrier`
          );
        }
      }

      const result = await carrierService.updateDriverProfile(
        driverProfile.id,
        updates
      );

      if (result.success && result.data) {
        setDriverProfile(result.data);
        setCarrierName(carrierNameForShift);

        // Reset truck_id in editFormData when carrier changes
        setEditFormData((prev) => ({
          ...prev,
          truck_id: "", // Clear truck selection
        }));

        // Sync with ShiftContext
        updateShift({
          carrier: carrierNameForShift,
          carrier_id: carrierIdForShift,
          truck_id: "", // Clear truck in shift context
          truck: "",
          pickupLocation: editFormData.pickup_location,
        });

        console.log("Carrier updated successfully, truck selection cleared");
      } else {
        throw new Error(result.error || "Failed to update carrier");
      }
    } catch (error: any) {
      console.error("Error updating carrier:", error);
      alert(`Error updating carrier: ${error.message}`);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleTruckChange = async (truckId: string) => {
    if (!driverProfile || !truckId) return;

    setIsUpdatingProfile(true);
    try {
      const updates = {
        default_truck_id: truckId,
      };

      const result = await carrierService.updateDriverProfile(
        driverProfile.id,
        updates
      );

      if (result.success && result.data) {
        setDriverProfile(result.data);

        // Sync with ShiftContext
        updateShift({
          carrier: editFormData.carrier_id,
          carrier_id: driverProfile.carrier_id,
          truck_id: truckId,
          truck: truckId,
          pickupLocation: editFormData.pickup_location,
        });

        console.log("Truck updated successfully");
      } else {
        throw new Error(result.error || "Failed to update truck");
      }
    } catch (error: any) {
      console.error("Error updating truck:", error);
      alert(`Error updating truck: ${error.message}`);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handlePickupLocationChange = (location: string) => {
    // Update ShiftContext immediately for pickup location
    updateShift({
      carrier: editFormData.carrier_id,
      carrier_id: driverProfile?.carrier_id,
      truck_id: editFormData.truck_id,
      truck: editFormData.truck_id,
      pickupLocation: location,
    });

    console.log("Pickup location updated successfully");
  };

  const handleSaveProfileChanges = async () => {
    if (!driverProfile || !editFormData.truck_id) {
      alert("Please select a truck");
      return;
    }

    setIsUpdatingProfile(true);
    try {
      // First, verify the driver exists in the database
      console.log("Verifying driver exists:", driverProfile.id);
      const dbDriver = await carrierService.getDriverById(driverProfile.id);

      if (!dbDriver) {
        throw new Error("Driver not found in database. Please log in again.");
      }

      console.log("Driver verified:", dbDriver);

      const updates: any = {
        default_truck_id: editFormData.truck_id,
      };

      // If carrier is selected, look up its ID or create it
      let carrierIdForShift = driverProfile.carrier_id;
      let carrierNameForShift = editFormData.carrier_id;

      if (editFormData.carrier_id) {
        const carrierResult = await carrierService.getOrCreateCarrier(
          editFormData.carrier_id
        );
        if (carrierResult.success && carrierResult.data) {
          updates.carrier_id = carrierResult.data.id;
          carrierIdForShift = carrierResult.data.id;
          carrierNameForShift = carrierResult.data.name;
        } else {
          throw new Error(
            carrierResult.error || `Failed to get or create carrier`
          );
        }
      }

      console.log("Updating driver profile with:", {
        driverId: driverProfile.id,
        updates,
      });

      const result = await carrierService.updateDriverProfile(
        driverProfile.id,
        updates
      );

      if (result.success && result.data) {
        setDriverProfile(result.data);

        // Sync with ShiftContext
        updateShift({
          carrier: carrierNameForShift,
          carrier_id: carrierIdForShift,
          truck_id: editFormData.truck_id,
          truck: editFormData.truck_id,
          pickupLocation: editFormData.pickup_location,
        });

        console.log("Profile updated successfully and synced with shift");
      } else {
        throw new Error(result.error || "Failed to update profile");
      }
    } catch (error: any) {
      console.error("Error updating profile:", error);
      alert(`Error updating profile: ${error.message}`);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleDownloadQR = async () => {
    if (!driverProfile) return;

    try {
      // Get the QR code SVG element by ID
      const svgElement = document.getElementById(
        "driver-qr-code"
      ) as SVGElement;
      if (!svgElement) {
        return;
      }

      // Create canvas
      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 500;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // White background
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Title
      ctx.fillStyle = "black";
      ctx.font = "bold 24px Arial";
      ctx.textAlign = "center";
      ctx.fillText("Driver QR Code", canvas.width / 2, 40);

      // Driver name
      ctx.font = "18px Arial";
      ctx.fillText(driverProfile.name, canvas.width / 2, 80);

      // Convert SVG to image
      const svgString = new XMLSerializer().serializeToString(svgElement);
      const img = new Image();
      img.onload = () => {
        // Draw QR code centered
        const qrSize = 250;
        const x = (canvas.width - qrSize) / 2;
        const y = 120;
        ctx.drawImage(img, x, y, qrSize, qrSize);

        // QR code text
        ctx.font = "12px monospace";
        ctx.fillStyle = "#666";
        ctx.textAlign = "center";
        ctx.fillText(driverProfile.driver_qr_code, canvas.width / 2, 420);

        // Download
        const link = document.createElement("a");
        link.href = canvas.toDataURL("image/png");
        link.download = `driver-qr-${driverProfile.id}.png`;
        link.click();
      };
      img.src = "data:image/svg+xml;base64," + btoa(svgString);
    } catch (error) {
      console.error("Error downloading QR code:", error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (!user || user.role !== "driver") {
    return null;
  }

  if (!driverProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Loading profile...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <User className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {t("driverProfile.title")}
              </h1>
              <p className="text-xs text-muted-foreground">
                {driverProfile.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-full"
            >
              {isDark ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/")}
              className="gap-2"
            >
              <Home className="h-4 w-4" />
              Home
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="rounded-full"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Status Card 
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Status</h2>
              <Badge
                variant={
                  driverProfile.status === "active" ? "default" : "secondary"
                }
              >
                {driverProfile.status.toUpperCase()}
              </Badge>
            </div>
            <Button
              onClick={handleToggleStatus}
              disabled={isTogglingStatus}
              className="w-full"
              variant={
                driverProfile.status === "active" ? "destructive" : "default"
              }
            >
              <Power className="mr-2 h-4 w-4" />
              {driverProfile.status === "active"
                ? "Finish the Shift"
                : "Start the Shift"}
            </Button>
          </Card>
          */}

          {/* Edit Profile Card */}
          <Card className="p-6 border-primary/50 bg-primary/5">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-foreground">
                My Truck & Carrier
              </h3>

              <div className="space-y-4">
                {/* Carrier Selection - Always Editable */}
                <div>
                  <Label className="text-sm font-medium">Select Carrier*</Label>
                  <SearchableSelect
                    value={editFormData.carrier_id}
                    onValueChange={(value) => {
                      setEditFormData({ ...editFormData, carrier_id: value });
                      handleCarrierChange(value);
                    }}
                    items={CARRIERS.map((carrier) => ({
                      value: carrier,
                      label: carrier,
                    })).sort((a, b) =>
                      a.label.localeCompare(b.label, undefined, {
                        numeric: true,
                        sensitivity: "base",
                      })
                    )}
                    placeholder="Choose a carrier"
                  />
                </div>

                {/* Truck Selection - Always Editable */}
                <div>
                  <Label className="text-sm font-medium">Select Truck *</Label>
                  <SearchableSelect
                    value={editFormData.truck_id}
                    onValueChange={(value) => {
                      setEditFormData({ ...editFormData, truck_id: value });
                      handleTruckChange(value);
                    }}
                    items={getTrucksByCarrier(editFormData.carrier_id)
                      .map((truck) => ({
                        value: truck,
                        label: truck,
                      }))
                      .sort((a, b) =>
                        a.label.localeCompare(b.label, undefined, {
                          numeric: true,
                          sensitivity: "base",
                        })
                      )}
                    placeholder="Choose a truck"
                  />
                </div>

                {/* Pickup Location Selection - Always Editable */}
                <div>
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Pickup Location*
                  </Label>
                  <SearchableSelect
                    value={editFormData.pickup_location}
                    onValueChange={(value) => {
                      setEditFormData({
                        ...editFormData,
                        pickup_location: value,
                      });
                      handlePickupLocationChange(value);
                    }}
                    items={PICKUP_LOCATIONS.map((location) => ({
                      value: location,
                      label: location,
                    })).sort((a, b) =>
                      a.label.localeCompare(b.label, undefined, {
                        numeric: true,
                        sensitivity: "base",
                      })
                    )}
                    placeholder="Choose pickup location"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Show different content based on shift status */}
          {driverProfile.status === "inactive" ? null : (
            // ACTIVE STATE: Show full dashboard
            <>
              {/* QR Code Card */}
              <Card className="p-6">
                <h2 className="text-lg font-bold text-foreground mb-4">
                  My QR Code
                </h2>
                <div className="bg-white p-6 rounded-lg text-center mb-4 flex justify-center">
                  <QRCodeSVG
                    id="driver-qr-code"
                    value={driverProfile.driver_qr_code}
                    size={200}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center mb-4 break-all">
                  {driverProfile.driver_qr_code}
                </p>
                <Button
                  onClick={handleDownloadQR}
                  className="w-full"
                  variant="outline"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download QR Code
                </Button>
              </Card>

              {/* Active Tickets 
              <Card className="p-6">
                <h2 className="text-lg font-bold text-foreground mb-4">
                  Active Tickets ({activeTickets.length})
                </h2>
                {isLoadingTickets ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full rounded-lg" />
                    ))}
                  </div>
                ) : activeTickets.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="flex justify-center mb-3">
                      <div className="rounded-full bg-muted p-3">
                        <AlertCircle className="h-6 w-6 text-muted-foreground" />
                      </div>
                    </div>
                    <p className="text-muted-foreground font-medium mb-1">
                      No active tickets
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Create a new ticket to get started
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeTickets.map((ticket) => (
                      <div
                        key={ticket.ticket_id}
                        className="p-3 border border-border rounded-lg cursor-pointer hover:bg-accent/50 transition-all hover:shadow-sm active:scale-95"
                        onClick={() => navigate(`/tickets/${ticket.ticket_id}`)}
                      >
                        <p className="font-medium text-foreground">
                          {ticket.ticket_id}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {ticket.destination_site}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
              */}

              {/* Action Buttons 
              <div className="flex gap-2">
                <Button
                  onClick={() => navigate("/tickets/create")}
                  className="flex-1"
                  size="lg"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Ticket
                </Button>
                <Button
                  onClick={handleToggleStatus}
                  disabled={isTogglingStatus}
                  variant="destructive"
                  className="flex-1"
                  size="lg"
                >
                  <Power className="mr-2 h-4 w-4" />
                  End Shift
                </Button>
              </div>
              */}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default DriverProfile;
