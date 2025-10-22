import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SignaturePad } from "@/components/SignaturePad";
import { ArrowLeft, Save, Truck, Weight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { Ticket } from "@/lib/types";
import { ticketService } from "@/lib/ticketService";

const CreateTicket = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const truckFromQR = searchParams.get("truck");

  const [formData, setFormData] = useState({
    truck_id: truckFromQR || "",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!signature) {
      toast({
        title: "Signature Required",
        description: "Please provide operator signature",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

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
        title: "Error",
        description: "Failed to create ticket. Please try again.",
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
                <Truck className="h-5 w-5" />
                <h2 className="font-semibold">Truck Information</h2>
              </div>
            </div>
            <div className="space-y-4 p-4">
              <div>
                <Label htmlFor="truck_id">Truck ID *</Label>
                <Input
                  id="truck_id"
                  name="truck_id"
                  value={formData.truck_id}
                  onChange={handleChange}
                  required
                  placeholder="e.g., T-1234"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="product">Product *</Label>
                <Input
                  id="product"
                  name="product"
                  value={formData.product}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Aggregate, Concrete"
                  className="mt-1"
                />
              </div>
            </div>
          </Card>

          {/* Site Info */}
          <Card className="shadow-md">
            <div className="space-y-4 p-4">
              <div>
                <Label htmlFor="origin_site">Origin Site *</Label>
                <Input
                  id="origin_site"
                  name="origin_site"
                  value={formData.origin_site}
                  onChange={handleChange}
                  required
                  placeholder="Loading location"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="destination_site">Destination Site *</Label>
                <Input
                  id="destination_site"
                  name="destination_site"
                  value={formData.destination_site}
                  onChange={handleChange}
                  required
                  placeholder="Delivery location"
                  className="mt-1"
                />
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
