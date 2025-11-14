import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { SignaturePad } from "@/components/SignaturePad";
import { TicketImageUpload } from "@/components/TicketImageUpload";
import { Header } from "@/components/Header";
import { Save, Weight, Loader2, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useShift } from "@/contexts/ShiftContext";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Ticket } from "@/lib/types";
import { ticketService } from "@/lib/ticketService";
import { carrierService, type Carrier } from "@/lib/carrierService";
import {
  CARRIERS,
  PICKUP_LOCATIONS,
  DESTINATION_SITES,
  getTrucksByCarrier,
} from "@/lib/trucksAndCarriers";

// Fallback destination sites (in case database is unavailable)
const FALLBACK_DESTINATION_SITES = DESTINATION_SITES;

const CreateTicket = () => {
  const navigate = useNavigate();
  const { user, driverProfile } = useAuth();
  const { shift } = useShift();
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const truckFromQR = searchParams.get("truck");

  const [formData, setFormData] = useState({
    carrier: "",
    carrier_id: "",
    truck_id: truckFromQR || "",
    driver_id: "",
    driver_name: "",
    pickup_location: "Primal Materials",
    destination_site: "",
    net_weight: "",
  });

  const [signature, setSignature] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [destinationSites, setDestinationSites] = useState<string[]>(
    FALLBACK_DESTINATION_SITES
  );
  const [
    hasShownActiveTicketNotification,
    setHasShownActiveTicketNotification,
  ] = useState(false);
  const [hasActiveTicket, setHasActiveTicket] = useState(false);
  const [ticketImage, setTicketImage] = useState<File | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [truckNameDisplay, setTruckNameDisplay] = useState<string>("");

  // Check for existing draft on component mount
  useEffect(() => {
    const draftData = localStorage.getItem("ticketDraft");
    if (draftData) {
      setHasDraft(true);
    }
  }, []);

  // Fetch carriers and destination sites on component mount

  useEffect(() => {
    const fetchData = async () => {
      const carriersData = await carrierService.getAllCarriers();
      setCarriers(carriersData);

      const sitesData = await ticketService.getDestinationSites();
      if (sitesData.length > 0) {
        setDestinationSites(sitesData.map((site) => site.name));
      }
    };
    fetchData();
  }, []);

  // Load driver data on mount
  useEffect(() => {
    const loadData = async () => {
      // If driver is logged in, auto-fill their data
      if (user?.role === "driver" && driverProfile) {
        // Get the carrier name from the carrier ID
        let carrierName = "";
        let carrierId = "";

        // First, check if there's an active shift
        if (shift.isActive && shift.carrier) {
          carrierName = shift.carrier;
          carrierId = shift.carrier_id || "";
        } else if (driverProfile.carrier_id) {
          // Fall back to driver profile carrier
          const carrier = carriers.find(
            (c) => c.id === driverProfile.carrier_id
          );
          carrierName = carrier?.name || "";
          carrierId = driverProfile.carrier_id;
        }

        // Get the truck name from active shift or QR code
        let truckName = "";
        let truckId = "";

        if (truckFromQR) {
          truckName = truckFromQR;
          truckId = truckFromQR;
        } else if (shift.isActive && shift.truck_id) {
          // Use truck from active shift
          truckName = shift.truck_id;
          truckId = shift.truck_id;
        } else if (driverProfile.default_truck_id) {
          // Fall back to driver profile default truck
          truckId = driverProfile.default_truck_id;
          // If it looks like a UUID, fetch the truck name from Supabase
          if (truckId.includes("-")) {
            try {
              const truck = await carrierService.getTruckById(truckId);
              if (truck) {
                truckName = truck.truck_id;
              } else {
                truckName = truckId;
              }
            } catch (error) {
              console.error("Error fetching truck name:", error);
              truckName = truckId;
            }
          } else {
            truckName = truckId;
          }
        }

        // Get pickup location from shift (even if shift is not active, pickup location might be stored)
        const pickupLocation = shift.pickupLocation || "";

        console.log("CreateTicket loading data:", {
          carrierName,
          truckName,
          pickupLocation,
          shiftActive: shift.isActive,
        });

        setFormData((prev) => ({
          ...prev,
          carrier: carrierName,
          carrier_id: carrierId,
          truck_id: truckName,
          driver_id: driverProfile.id,
          driver_name: driverProfile.name,
          pickup_location: pickupLocation,
        }));
      }
    };
    loadData();
  }, [user, driverProfile, carriers, truckFromQR, shift]);

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
        return;
      }
    }

    // Validation
    if (!formData.carrier) {
      return;
    }

    if (!formData.truck_id) {
      return;
    }

    if (!formData.driver_name) {
      return;
    }

    setIsSubmitting(true);

    const ticket: Ticket = {
      ticket_id: `TKT-${Date.now()}`,
      truck_qr_id: `TRUCK-${formData.truck_id}`,
      truck_id: formData.truck_id,
      product: "", // Optional field, left empty
      origin_site: formData.pickup_location, // Pickup location as origin
      destination_site: formData.destination_site,
      net_weight: parseFloat(formData.net_weight) || 0,
      scale_operator_signature: signature,
      status: "VERIFIED",
      created_at: new Date().toISOString(),
      verified_at_scale: new Date().toISOString(),
      carrier: formData.carrier,
      carrier_id: formData.carrier_id,
      driver_name: formData.driver_name,
      driver_id: formData.driver_id,
    };

    const result = await ticketService.createTicket(
      ticket,
      ticketImage || undefined
    );

    setIsSubmitting(false);

    if (result.success) {
      // Wait for ticket to be fully registered in Supabase before redirecting
      setTimeout(() => {
        navigate(`/`);
      }, 700);
    }
  };

  const saveDraft = () => {
    const draft = {
      formData,
      signature,
      ticketImage: ticketImage ? ticketImage.name : null,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem("ticketDraft", JSON.stringify(draft));
    setHasDraft(true);
    toast({
      title: "Draft Saved",
      description: "Your ticket draft has been saved. You can continue later.",
    });
  };

  const loadDraft = () => {
    const draftData = localStorage.getItem("ticketDraft");
    if (draftData) {
      const draft = JSON.parse(draftData);
      setFormData(draft.formData);
      setSignature(draft.signature);
      toast({
        title: "Draft Loaded",
        description: "Your saved draft has been loaded.",
      });
    }
  };

  const deleteDraft = () => {
    localStorage.removeItem("ticketDraft");
    setHasDraft(false);
    toast({
      title: "Draft Deleted",
      description: "Your ticket draft has been deleted.",
    });
  };

  // Force re-render when driver status changes
  const [driverStatus, setDriverStatus] = useState<string | undefined>(
    driverProfile?.status
  );

  useEffect(() => {
    setDriverStatus(driverProfile?.status);
  }, [driverProfile?.status]);

  // Check if driver is inactive
  const isDriverInactive =
    user?.role === "driver" && driverStatus === "inactive";

  // Check if shift has all required fields (carrier, truck, pickup location)
  // Also check driverProfile as fallback in case shift context is not populated
  const isShiftComplete =
    user?.role === "driver"
      ? (shift.carrier && shift.truck_id && shift.pickupLocation) ||
        (driverProfile?.carrier_id && driverProfile?.default_truck_id)
      : true;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <Header
        title="Create Ticket"
        subtitle="Scale verification"
        showHomeButton
        onHomeClick={() => navigate("/")}
        showSettingsButton
        onSettingsClick={() => navigate("/driver/profile")}
        showThemeToggle
        showLanguageSelector
      />

      {/* Main Content */}
      <main className="container mx-auto px-3 py-4 md:px-4 md:py-6 flex-1 overflow-y-auto">
        {/* Driver Inactive Warning */}
        {isDriverInactive && (
          <div className="mx-auto max-w-2xl mb-4 md:mb-6">
            <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
              <div className="p-3 md:p-4">
                <p className="text-xs md:text-sm font-medium text-red-900 dark:text-red-100">
                  ⛔ {t("createTicket.driverInactiveWarningFull")}
                </p>
                <Button
                  onClick={() => navigate("/")}
                  className="mt-3 w-full"
                  variant="default"
                  size="sm"
                >
                  {t("common.home")}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Shift Not Complete Warning */}
        {!isShiftComplete && !isDriverInactive && (
          <div className="mx-auto max-w-2xl mb-4 md:mb-6">
            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
              <div className="p-3 md:p-4">
                <p className="text-xs md:text-sm font-medium text-amber-900 dark:text-amber-100">
                  ⚠️ Please complete your shift setup (carrier, truck, and
                  pickup location) at your profile page to create tickets.
                </p>
                <Button
                  onClick={() => navigate("/driver/profile")}
                  className="mt-3 w-full"
                  variant="default"
                  size="sm"
                >
                  Go to Profile
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="mx-auto max-w-2xl space-y-4 md:space-y-6 pb-4"
        >
          {/* Truck Info - Compact for Mobile */}
          <Card className="overflow-hidden shadow-md">
            {/*
            <div className="bg-primary/5 p-4">
              <div className="flex items-center gap-2 text-primary">
                <TruckIcon className="h-5 w-5" />
                <h2 className="font-semibold">Truck Information</h2>
              </div>
            </div>
            */}
            <div className="space-y-3 p-3 md:p-4">
              {/* Always in row layout for Carrier, Truck, Driver */}
              <div className="grid grid-cols-3 gap-2">
                {/* Carrier - Read-only for drivers */}
                <div className="min-w-0">
                  <Label htmlFor="carrier" className="text-xs">
                    {t("createTicket.carrier")}
                  </Label>
                  {user?.role === "driver" ? (
                    <div className="mt-1 rounded border border-border bg-muted p-1 text-xs text-foreground truncate">
                      {formData.carrier || t("createTicket.notAssigned")}
                    </div>
                  ) : (
                    <SearchableSelect
                      value={formData.carrier}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          carrier: value,
                          truck_id: "", // Clear truck when carrier changes
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
                      ].sort((a, b) =>
                        a.label.localeCompare(b.label, undefined, {
                          numeric: true,
                          sensitivity: "base",
                        })
                      )}
                    />
                  )}
                </div>

                {/* Truck ID - Read-only for drivers */}
                <div className="min-w-0">
                  <Label htmlFor="truck_id" className="text-xs">
                    {t("createTicket.truckID")}
                  </Label>
                  {user?.role === "driver" ? (
                    <div className="mt-1 rounded border border-border bg-muted p-1 text-xs text-foreground truncate">
                      {formData.truck_id || t("createTicket.notAssigned")}
                    </div>
                  ) : (
                    <SearchableSelect
                      value={formData.truck_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, truck_id: value })
                      }
                      placeholder="Select Truck"
                      className={cn(
                        !formData.truck_id && "border-red-500 border-2"
                      )}
                      items={getTrucksByCarrier(formData.carrier)
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
                    />
                  )}
                </div>

                {/* Driver - Read-only for drivers */}
                <div className="min-w-0">
                  <Label htmlFor="driver_name" className="text-xs">
                    {t("createTicket.driver")}
                  </Label>
                  {user?.role === "driver" ? (
                    <div className="mt-1 rounded border border-border bg-muted p-1 text-xs text-foreground truncate">
                      {formData.driver_name || t("createTicket.notAssigned")}
                    </div>
                  ) : (
                    <Input
                      id="driver_name"
                      name="driver_name"
                      type="text"
                      value={formData.driver_name}
                      onChange={handleChange}
                      placeholder="Driver"
                      className="mt-1 text-xs"
                    />
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Destination Site & Pickup Location */}
          <Card className="shadow-md">
            <div className="space-y-4 p-4">
              <div>
                <Label htmlFor="pickup_location">
                  {t("createTicket.pickupLocation")}
                </Label>
                <SearchableSelect
                  value={"Primal Materials"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, pickup_location: value })
                  }
                  placeholder="Select pickup location"
                  items={PICKUP_LOCATIONS.map((location) => ({
                    value: location,
                    label: location,
                  })).sort((a, b) =>
                    a.label.localeCompare(b.label, undefined, {
                      numeric: true,
                      sensitivity: "base",
                    })
                  )}
                />
              </div>
              <div>
                <Label htmlFor="destination_site">
                  {t("createTicket.destinationSite")}
                </Label>
                <SearchableSelect
                  value={formData.destination_site}
                  onValueChange={(value) =>
                    setFormData({ ...formData, destination_site: value })
                  }
                  placeholder="Select destination site"
                  items={destinationSites
                    .map((site) => ({
                      value: site,
                      label: site,
                    }))
                    .sort((a, b) =>
                      a.label.localeCompare(b.label, undefined, {
                        numeric: true,
                        sensitivity: "base",
                      })
                    )}
                />
              </div>
            </div>
          </Card>

          {/* Weight Info */}
          <Card className="overflow-hidden shadow-md">
            <div className="bg-success/5 p-4">
              <div className="flex items-center gap-2 text-success">
                <Weight className="h-5 w-5" />
                <h2 className="font-semibold">
                  {t("createTicket.netWeight")} (tons) *
                </h2>
              </div>
            </div>
            <div className="space-y-4 p-4">
              <div>
                <Input
                  id="net_weight"
                  name="net_weight"
                  type="number"
                  step="0.01"
                  value={formData.net_weight}
                  onChange={handleChange}
                  required
                  placeholder="0.00"
                  className={cn(
                    "mt-1",
                    !formData.net_weight && "border-red-500 border-2"
                  )}
                />
              </div>
            </div>
          </Card>

          {/* Ticket Image Upload - For drivers to store ticket images 
          {user?.role === "driver" && <TicketImageUpload />}
          */}

          {/* Ticket Image Upload - Optional */}
          {user?.role === "driver" && (
            <TicketImageUpload onImageSelected={setTicketImage} />
          )}

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

          {/* Draft Notification */}
          {hasDraft && (
            <Card className="overflow-hidden shadow-md border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
              <div className="p-4">
                <p className="text-sm text-blue-900 dark:text-blue-100 mb-3">
                  You have a saved draft ticket. Would you like to load it?
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={loadDraft}
                    className="flex-1"
                  >
                    Load Draft
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={deleteDraft}
                    className="flex-1 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Draft
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Button Group */}
          <div className="flex gap-2">
            {/* Save as Draft Button */}
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="flex-1 shadow-lg transition-all"
              onClick={saveDraft}
            >
              <Save className="mr-2 h-5 w-5" />
              {t("createTicket.saveAsDraft")}
            </Button>

            {/* Submit */}
            <Button
              type="submit"
              size="lg"
              className="flex-1 shadow-lg transition-all"
              disabled={
                isSubmitting ||
                hasActiveTicket ||
                !isShiftComplete ||
                isDriverInactive
              }
              title={
                isDriverInactive
                  ? t("createTicket.driverInactiveWarning")
                  : !isShiftComplete
                  ? t("createTicket.completeShiftSetup")
                  : hasActiveTicket
                  ? t("createTicket.activeTicketWarning")
                  : ""
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {t("createTicket.creatingTicket")}
                </>
              ) : hasActiveTicket ? (
                <>
                  <Save className="mr-2 h-5 w-5" />
                  {t("createTicket.completeActiveTicketFirst")}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-5 w-5" />
                  {t("createTicket.activateTicket")}
                </>
              )}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default CreateTicket;
