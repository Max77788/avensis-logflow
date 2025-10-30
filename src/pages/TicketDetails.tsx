import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/StatusBadge";
import { SignaturePad } from "@/components/SignaturePad";
import { RouteMap } from "@/components/RouteMap";
import { useGPS } from "@/hooks/useGPS";
import {
  ArrowLeft,
  MapPin,
  Truck,
  Package,
  Calendar,
  User,
  Download,
  CheckCircle,
  Loader2,
  Navigation,
  Users,
} from "lucide-react";
import type { Ticket } from "@/lib/types";
import { QRCodeSVG } from "qrcode.react";
import { ticketService } from "@/lib/ticketService";
import { toast } from "@/hooks/use-toast";

// Helper function to parse GPS coordinates
const parseGPS = (gpsString?: string) => {
  if (!gpsString) return null;
  const [lat, lng] = gpsString.split(",").map((v) => parseFloat(v.trim()));
  return isNaN(lat) || isNaN(lng) ? null : { lat, lng };
};

const TicketDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const qrCodeRef = useRef<HTMLDivElement>(null);

  // Delivery confirmation state
  const [showConfirmationForm, setShowConfirmationForm] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [confirmerName, setConfirmerName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const { captureLocation, coordinates, loading } = useGPS();

  useEffect(() => {
    const loadTicket = async () => {
      if (id) {
        // Check if ticket was passed via navigation state
        const state = location.state as { ticket?: Ticket } | null;
        if (state?.ticket) {
          setTicket(state.ticket);
        } else {
          // Otherwise fetch from service
          const found = await ticketService.getTicket(id);
          setTicket(found);
        }
      }
    };
    loadTicket();
  }, [id, location.state]);

  const handleExportQR = () => {
    if (!qrCodeRef.current) return;

    const svg = qrCodeRef.current.querySelector("svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    const padding = 40;
    const qrSize = 512;
    const textHeight = 80;
    const totalWidth = qrSize + padding * 2;
    const totalHeight = qrSize + padding * 2 + textHeight;

    canvas.width = totalWidth;
    canvas.height = totalHeight;

    img.onload = () => {
      if (ctx) {
        // White background
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw QR code
        ctx.drawImage(img, padding, padding, qrSize, qrSize);

        // Draw ticket ID text below QR code
        ctx.fillStyle = "#000000";
        ctx.font = "bold 32px Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";

        const textY = qrSize + padding * 2 + 15;
        ctx.fillText(`TKT-${ticket?.ticket_id}`, totalWidth / 2, textY);

        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `ticket-${ticket?.ticket_id}-qr.png`;
            a.click();
            URL.revokeObjectURL(url);

            toast({
              title: "QR Code Exported",
              description: "QR code saved as PNG image",
            });
          }
        });
      }
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const handleDeliver = async () => {
    if (!signature) {
      toast({
        title: "Signature Required",
        description: "Please provide receiver signature",
        variant: "destructive",
      });
      return;
    }

    if (!coordinates) {
      toast({
        title: "GPS Required",
        description: "Location must be captured for delivery confirmation",
        variant: "destructive",
      });
      return;
    }

    if (!confirmerName.trim()) {
      toast({
        title: "Confirmer Name Required",
        description: "Please enter the name of the person confirming delivery",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    const result = await ticketService.updateTicket(id!, {
      destination_signature: signature,
      delivery_gps: `${coordinates.latitude},${coordinates.longitude}`,
      delivered_at: new Date().toISOString(),
      status: "DELIVERED",
      confirmer_name: confirmerName.trim(),
    });

    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: "Delivery Confirmed",
        description: `Ticket ${id} is marked as delivered`,
      });
      // Show success animation
      setShowSuccessAnimation(true);
      // Redirect after animation completes (3 seconds)
      setTimeout(() => {
        navigate("/");
      }, 3000);
    } else {
      toast({
        title: "Error",
        description: "Failed to update ticket. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!ticket) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="p-8 text-center shadow-lg">
          <Package className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
          <h2 className="mb-2 text-xl font-bold text-foreground">
            Ticket Not Found
          </h2>
          <p className="mb-4 text-muted-foreground">
            The ticket you're looking for doesn't exist
          </p>
          <Button onClick={() => navigate("/")}>Return Home</Button>
        </Card>
      </div>
    );
  }

  const canDeliver =
    ticket.status === "VERIFIED_AT_SCALE" || ticket.status === "IN_TRANSIT";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">
              Ticket Details
            </h1>
            <p className="text-sm text-muted-foreground">{ticket.ticket_id}</p>
          </div>
          <StatusBadge status={ticket.status} />
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="mx-auto max-w-2xl space-y-4">
          {/* QR Code Card */}
          <Card className="overflow-hidden shadow-lg">
            <div className="bg-primary/5 p-6 text-center">
              <div
                ref={qrCodeRef}
                className="mx-auto mb-4 inline-block rounded-xl bg-white p-4 shadow-md"
              >
                <QRCodeSVG value={`TICKET-${ticket.ticket_id}`} size={160} />
              </div>
              <p className="mb-3 text-sm font-medium text-muted-foreground">
                Scan at delivery site
              </p>
              <Button onClick={handleExportQR} variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export QR Code
              </Button>
            </div>
          </Card>

          {/* Truck & Product Info */}
          <Card className="shadow-md">
            <div className="flex items-start gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Truck className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">
                  Truck {ticket.truck_id}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {ticket.product}
                </p>
              </div>
            </div>
          </Card>

          {/* Route Info */}
          <Card className="shadow-md">
            <div className="space-y-3 p-4">
              <div className="flex items-start gap-3">
                <MapPin className="mt-1 h-5 w-5 text-success" />
                <div>
                  <p className="text-xs text-muted-foreground">Origin</p>
                  <p className="font-medium text-foreground">
                    {ticket.origin_site}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="mt-1 h-5 w-5 text-destructive" />
                <div>
                  <p className="text-xs text-muted-foreground">Destination</p>
                  <p className="font-medium text-foreground">
                    {ticket.destination_site}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Route Map */}
          {(() => {
            const loadGps = parseGPS(ticket.load_gps) || {
              lat: 40.4168,
              lng: -3.7038,
            }; // Madrid
            const deliveryGps = parseGPS(ticket.delivery_gps) || {
              lat: 40.0105,
              lng: -4.3009,
            }; // near Toledo (~80 km)
            return (
              <RouteMap
                originLat={loadGps.lat}
                originLng={loadGps.lng}
                destinationLat={deliveryGps.lat}
                destinationLng={deliveryGps.lng}
                originName={ticket.origin_site}
                destinationName={ticket.destination_site}
              />
            );
          })()}

          {/* Carrier & Driver Info */}
          {(ticket.carrier || ticket.driver_name) && (
            <Card className="shadow-md">
              <div className="space-y-3 p-4">
                {ticket.carrier && (
                  <div className="flex items-start gap-3">
                    <Truck className="mt-1 h-5 w-5 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Carrier</p>
                      <p className="font-medium text-foreground">
                        {ticket.carrier}
                      </p>
                    </div>
                  </div>
                )}
                {ticket.driver_name && (
                  <div className="flex items-start gap-3">
                    <Users className="mt-1 h-5 w-5 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Driver</p>
                      <p className="font-medium text-foreground">
                        {ticket.driver_name}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Weight Info */}
          {ticket.net_weight && (
            <Card className="shadow-md">
              <div className="grid grid-cols-3 divide-x divide-border">
                <div className="p-4 text-center">
                  <p className="text-xs text-muted-foreground">Gross</p>
                  <p className="text-lg font-bold text-foreground">
                    {ticket.gross_weight?.toFixed(0)} kg
                  </p>
                </div>
                <div className="p-4 text-center">
                  <p className="text-xs text-muted-foreground">Tare</p>
                  <p className="text-lg font-bold text-foreground">
                    {ticket.tare_weight?.toFixed(0)} kg
                  </p>
                </div>
                <div className="bg-success-light p-4 text-center">
                  <p className="text-xs text-muted-foreground">Net</p>
                  <p className="text-lg font-bold text-success">
                    {ticket.net_weight.toFixed(0)} kg
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* GPS Coordinates */}
          {(ticket.load_gps || ticket.delivery_gps) && (
            <Card className="shadow-md">
              <div className="space-y-3 p-4">
                {ticket.load_gps && (
                  <div className="flex items-start gap-3">
                    <Navigation className="mt-1 h-5 w-5 text-success" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">
                        Load Location
                      </p>
                      <p className="text-sm font-mono text-foreground">
                        {ticket.load_gps}
                      </p>
                    </div>
                  </div>
                )}
                {ticket.delivery_gps && (
                  <div className="flex items-start gap-3">
                    <Navigation className="mt-1 h-5 w-5 text-destructive" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">
                        Delivery Location
                      </p>
                      <p className="text-sm font-mono text-foreground">
                        {ticket.delivery_gps}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Confirmer Information */}
          {ticket.confirmer_name && (
            <Card className="shadow-md">
              <div className="flex items-start gap-3 p-4">
                <User className="mt-1 h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">
                    Delivery Confirmed By
                  </p>
                  <p className="font-medium text-foreground">
                    {ticket.confirmer_name}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Timestamps */}
          <Card className="shadow-md">
            <div className="space-y-3 p-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-sm font-medium text-foreground">
                    {new Date(ticket.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              {ticket.verified_at_scale && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">
                      Verified at Scale
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      {new Date(ticket.verified_at_scale).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
              {ticket.delivered_at && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Delivered</p>
                    <p className="text-sm font-medium text-foreground">
                      {new Date(ticket.delivered_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Signatures */}
          {ticket.scale_operator_signature && (
            <Card className="shadow-md">
              <div className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">
                    Operator Signature
                  </p>
                </div>
                <img
                  src={ticket.scale_operator_signature}
                  alt="Operator signature"
                  className="h-24 w-full rounded border border-border object-contain bg-white"
                />
              </div>
            </Card>
          )}

          {ticket.destination_signature && (
            <Card className="shadow-md">
              <div className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">
                    Receiver Signature
                  </p>
                </div>
                <img
                  src={ticket.destination_signature}
                  alt="Receiver signature"
                  className="h-24 w-full rounded border border-border object-contain bg-white"
                />
              </div>
            </Card>
          )}

          {/* Success Animation */}
          {showSuccessAnimation && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <Card className="w-80 space-y-4 p-8 text-center shadow-2xl">
                <div className="flex justify-center">
                  <div className="relative h-20 w-20">
                    <CheckCircle className="h-20 w-20 animate-bounce text-success" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-foreground">
                  Delivery Confirmed!
                </h2>
                <p className="text-muted-foreground">
                  Ticket {ticket.ticket_id} has been successfully delivered
                </p>
                <p className="text-sm text-muted-foreground">
                  Redirecting to home...
                </p>
              </Card>
            </div>
          )}

          {/* Delivery Confirmation Form */}
          {canDeliver && (
            <>
              {!showConfirmationForm ? (
                <Button
                  size="lg"
                  className="w-full shadow-lg"
                  onClick={() => setShowConfirmationForm(true)}
                >
                  <Package className="mr-2 h-5 w-5" />
                  Confirm Delivery
                </Button>
              ) : (
                <Card className="overflow-hidden border-primary/50 bg-primary/5 shadow-md">
                  <div className="bg-primary/10 p-4">
                    <div className="flex items-center gap-2 text-primary">
                      <User className="h-5 w-5" />
                      <h3 className="font-semibold">Delivery Confirmation</h3>
                    </div>
                  </div>
                  <div className="space-y-4 p-4">
                    {/* Location Verification */}
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <Label className="text-sm font-medium">
                          Location Verification
                        </Label>
                      </div>
                      {coordinates ? (
                        <div className="rounded border border-success/30 bg-success/5 p-3">
                          <p className="text-xs text-muted-foreground">
                            ✓ Location Captured
                          </p>
                          <p className="text-xs text-foreground">
                            Lat: {coordinates.latitude.toFixed(6)}
                          </p>
                          <p className="text-xs text-foreground">
                            Lon: {coordinates.longitude.toFixed(6)}
                          </p>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={captureLocation}
                          disabled={loading}
                          className="w-full"
                        >
                          {loading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Capturing Location...
                            </>
                          ) : (
                            <>
                              <MapPin className="mr-2 h-4 w-4" />
                              Capture Location
                            </>
                          )}
                        </Button>
                      )}
                    </div>

                    {/* Receiver Signature */}
                    <div>
                      <SignaturePad
                        onSave={setSignature}
                        label="Receiver Signature *"
                      />
                    </div>

                    {/* Confirmer's Name */}
                    <div>
                      <Label
                        htmlFor="confirmer_name"
                        className="text-sm font-medium"
                      >
                        Confirmer's Name *
                      </Label>
                      <Input
                        id="confirmer_name"
                        placeholder="Enter name of person confirming delivery"
                        value={confirmerName}
                        onChange={(e) => setConfirmerName(e.target.value)}
                        className="mt-1"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={handleDeliver}
                        disabled={isSubmitting}
                        className="flex-1"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Confirming...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Confirm
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowConfirmationForm(false);
                          setSignature(null);
                          setConfirmerName("");
                        }}
                        disabled={isSubmitting}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default TicketDetails;
