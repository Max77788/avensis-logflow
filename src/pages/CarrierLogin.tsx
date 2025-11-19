import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Truck, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { carrierService } from "@/lib/carrierService";

const CarrierLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [carrierName, setCarrierName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCarrierLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Verify carrier exists
      const carrier = await carrierService.getCarrierByName(carrierName.trim());

      if (carrier) {
        // Carrier exists, log them in
        login("carrier", carrier.id);
        navigate("/carrier/portal");
      } else {
        setError("Carrier not found. Please check the name and try again.");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("An error occurred during login. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background flex flex-col">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Back Button */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate("/login")}
              className="mb-4"
            >
              ← Back to Login
            </Button>
            <h1 className="text-2xl font-bold text-foreground">
              Carrier Portal Login
            </h1>
            <p className="text-muted-foreground mt-2">
              Enter your carrier name to access the activity portal
            </p>
          </div>

          {/* Login Form */}
          <Card className="p-6">
            <form onSubmit={handleCarrierLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="carrierName">Carrier Name</Label>
                <Input
                  id="carrierName"
                  type="text"
                  placeholder="Enter carrier name"
                  value={carrierName}
                  onChange={(e) => setCarrierName(e.target.value)}
                  required
                />
              </div>

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Logging In...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Access Portal
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-border">
              <div className="flex items-start gap-3 text-sm text-muted-foreground">
                <Truck className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <p>
                  The Carrier Portal allows you to view all loads your trucks have
                  completed on the Avensis eTicket platform.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CarrierLogin;

