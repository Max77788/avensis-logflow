import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QRCodeSVG } from "qrcode.react";
import { Download, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import type { Ticket } from "@/lib/types";

const ScaleHouse = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const ticket = location.state?.ticket as Ticket | undefined;
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (!ticket) {
      navigate("/driver/dashboard");
    }
  }, [ticket, navigate]);

  if (!ticket) {
    return null;
  }

  const handleDownloadQR = () => {
    setIsDownloading(true);
    const qrElement = document.getElementById("ticket-qr");
    if (qrElement) {
      const canvas = qrElement.querySelector("canvas");
      if (canvas) {
        const link = document.createElement("a");
        link.href = canvas.toDataURL("image/png");
        link.download = `ticket-${ticket.ticket_id}-qr.png`;
        link.click();
      }
    }
    setIsDownloading(false);
  };

  const handleContinue = () => {
    navigate(`/tickets/${ticket.ticket_id}`, { state: { ticket } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="lg"
              onClick={() => navigate("/driver/dashboard")}
              className="h-12 w-12"
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Scale House Verification
              </h1>
              <p className="text-sm text-muted-foreground">
                Ticket {ticket.ticket_id}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left: Ticket Details */}
          <div className="space-y-6">
            {/* Status */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                  Ticket Status
                </h2>
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Verified at Scale
                </Badge>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ticket ID:</span>
                  <span className="font-semibold">{ticket.ticket_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Carrier:</span>
                  <span className="font-semibold">{ticket.carrier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Truck:</span>
                  <span className="font-semibold">{ticket.truck_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Driver:</span>
                  <span className="font-semibold">{ticket.driver_name}</span>
                </div>
              </div>
            </Card>

            {/* Destination & Weight */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Delivery Details
              </h2>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Destination:</span>
                  <p className="font-semibold mt-1">
                    {ticket.destination_site}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Net Weight:</span>
                  <p className="font-semibold mt-1">{ticket.net_weight} tons</p>
                </div>
              </div>
            </Card>

            {/* Signature */}
            {ticket.scale_operator_signature && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  Scale Operator Signature
                </h2>
                <img
                  src={ticket.scale_operator_signature}
                  alt="Scale operator signature"
                  className="h-32 w-full rounded border border-border object-contain bg-white dark:bg-slate-900"
                />
              </Card>
            )}
          </div>

          {/* Right: QR Code */}
          <div className="flex flex-col gap-6">
            <Card className="p-8 flex flex-col items-center justify-center">
              <h2 className="text-lg font-semibold text-foreground mb-6">
                Ticket QR Code
              </h2>
              <div
                id="ticket-qr"
                className="p-4 bg-white rounded-lg border-2 border-border"
              >
                <QRCodeSVG
                  value={ticket.ticket_id}
                  size={256}
                  level="H"
                  includeMargin={true}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-4 text-center">
                Scan this QR code at the destination to confirm delivery
              </p>
              <Button
                variant="outline"
                onClick={handleDownloadQR}
                disabled={isDownloading}
                className="mt-4 gap-2 h-12 text-base font-semibold"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5" />
                    Download QR Code
                  </>
                )}
              </Button>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleContinue}
                className="w-full h-14 text-base font-semibold"
              >
                Continue to Delivery
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/driver/dashboard")}
                className="w-full h-14 text-base font-semibold"
              >
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ScaleHouse;
