import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { ArrowLeft, MapPin, Truck, Package, Calendar, User, Download } from "lucide-react";
import type { Ticket } from "@/lib/types";
import { QRCodeSVG } from "qrcode.react";
import { ticketService } from "@/lib/ticketService";
import { toast } from "@/hooks/use-toast";

const TicketDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const qrCodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadTicket = async () => {
      if (id) {
        const found = await ticketService.getTicket(id);
        setTicket(found);
      }
    };
    loadTicket();
  }, [id]);

  const handleExportQR = () => {
    if (!qrCodeRef.current) return;

    const svg = qrCodeRef.current.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = 512;
    canvas.height = 512;

    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
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

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  if (!ticket) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="p-8 text-center shadow-lg">
          <Package className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
          <h2 className="mb-2 text-xl font-bold text-foreground">Ticket Not Found</h2>
          <p className="mb-4 text-muted-foreground">
            The ticket you're looking for doesn't exist
          </p>
          <Button onClick={() => navigate("/")}>Return Home</Button>
        </Card>
      </div>
    );
  }

  const canDeliver = ticket.status === "VERIFIED_AT_SCALE" || ticket.status === "IN_TRANSIT";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Ticket Details</h1>
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
              <div ref={qrCodeRef} className="mx-auto mb-4 inline-block rounded-xl bg-white p-4 shadow-md">
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
                <h3 className="font-semibold text-foreground">Truck {ticket.truck_id}</h3>
                <p className="text-sm text-muted-foreground">{ticket.product}</p>
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
                  <p className="font-medium text-foreground">{ticket.origin_site}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="mt-1 h-5 w-5 text-destructive" />
                <div>
                  <p className="text-xs text-muted-foreground">Destination</p>
                  <p className="font-medium text-foreground">{ticket.destination_site}</p>
                </div>
              </div>
            </div>
          </Card>

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
                    <p className="text-xs text-muted-foreground">Verified at Scale</p>
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
                  <p className="text-sm font-medium text-foreground">Operator Signature</p>
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
                  <p className="text-sm font-medium text-foreground">Receiver Signature</p>
                </div>
                <img
                  src={ticket.destination_signature}
                  alt="Receiver signature"
                  className="h-24 w-full rounded border border-border object-contain bg-white"
                />
              </div>
            </Card>
          )}

          {/* Deliver Button */}
          {canDeliver && (
            <Button
              size="lg"
              className="w-full shadow-lg"
              onClick={() => navigate(`/tickets/${ticket.ticket_id}/deliver`)}
            >
              <Package className="mr-2 h-5 w-5" />
              Confirm Delivery
            </Button>
          )}
        </div>
      </main>
    </div>
  );
};

export default TicketDetails;
