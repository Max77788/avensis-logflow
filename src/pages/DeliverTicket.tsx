import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SignaturePad } from "@/components/SignaturePad";
import { useGPS } from "@/hooks/useGPS";
import { ArrowLeft, MapPin, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { Ticket } from "@/lib/types";

const DeliverTicket = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const { captureLocation, coordinates, loading } = useGPS();

  useEffect(() => {
    const tickets = JSON.parse(localStorage.getItem("tickets") || "[]");
    const found = tickets.find((t: Ticket) => t.ticket_id === id);
    if (found) {
      setTicket(found);
    }
  }, [id]);

  const handleDeliver = async () => {
    if (!signature) {
      toast({
        title: "Signature Required",
        description: "Please provide receiver signature",
        variant: "destructive",
      });
      return;
    }

    // Capture GPS
    const gps = await captureLocation();
    if (!gps) {
      toast({
        title: "GPS Required",
        description: "Location must be captured for delivery confirmation",
        variant: "destructive",
      });
      return;
    }

    // Update ticket
    const tickets = JSON.parse(localStorage.getItem("tickets") || "[]");
    const updatedTickets = tickets.map((t: Ticket) => {
      if (t.ticket_id === id) {
        return {
          ...t,
          destination_signature: signature,
          delivery_gps: `${gps.latitude},${gps.longitude}`,
          delivered_at: new Date().toISOString(),
          status: "DELIVERED",
        };
      }
      return t;
    });

    localStorage.setItem("tickets", JSON.stringify(updatedTickets));

    toast({
      title: "Delivery Confirmed",
      description: `Ticket ${id} marked as delivered`,
    });

    navigate(`/tickets/${id}`);
  };

  if (!ticket) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center gap-3 px-4 py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/tickets/${id}`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Confirm Delivery</h1>
            <p className="text-sm text-muted-foreground">{ticket.ticket_id}</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Delivery Info */}
          <Card className="shadow-md">
            <div className="space-y-3 p-4">
              <h3 className="font-semibold text-foreground">Delivery Location</h3>
              <div className="flex items-start gap-3">
                <MapPin className="mt-1 h-5 w-5 text-destructive" />
                <div>
                  <p className="font-medium text-foreground">{ticket.destination_site}</p>
                  <p className="text-sm text-muted-foreground">
                    Truck: {ticket.truck_id} • Product: {ticket.product}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* GPS Capture */}
          <Card className="overflow-hidden shadow-md">
            <div className="bg-success/5 p-4">
              <div className="flex items-center gap-2 text-success">
                <MapPin className="h-5 w-5" />
                <h2 className="font-semibold">Location Verification</h2>
              </div>
            </div>
            <div className="p-4">
              {coordinates ? (
                <div className="rounded-lg bg-success-light p-4">
                  <div className="mb-2 flex items-center gap-2 text-success">
                    <CheckCircle className="h-5 w-5" />
                    <p className="font-semibold">Location Captured</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Lat: {coordinates.latitude.toFixed(6)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Lon: {coordinates.longitude.toFixed(6)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Accuracy: ±{coordinates.accuracy.toFixed(0)}m
                  </p>
                </div>
              ) : (
                <Button
                  onClick={captureLocation}
                  disabled={loading}
                  variant="outline"
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
                      Capture GPS Location
                    </>
                  )}
                </Button>
              )}
            </div>
          </Card>

          {/* Signature */}
          <SignaturePad onSave={setSignature} label="Receiver Signature" />

          {signature && (
            <Card className="overflow-hidden shadow-md">
              <div className="p-4">
                <p className="mb-2 text-sm font-medium text-foreground">Signature Preview</p>
                <img
                  src={signature}
                  alt="Receiver signature"
                  className="h-32 w-full rounded border border-border object-contain bg-white"
                />
              </div>
            </Card>
          )}

          {/* Submit */}
          <Button
            onClick={handleDeliver}
            size="lg"
            className="w-full shadow-lg"
            disabled={!signature || !coordinates}
          >
            <CheckCircle className="mr-2 h-5 w-5" />
            Confirm Delivery
          </Button>
        </div>
      </main>
    </div>
  );
};

export default DeliverTicket;
