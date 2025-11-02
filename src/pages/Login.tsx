import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Truck, User, QrCode, LogIn } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { carrierService } from "@/lib/carrierService";

const Login = () => {
  const navigate = useNavigate();
  const { login, setDriverProfile } = useAuth();
  const [step, setStep] = useState<"role" | "driver-login">("role");
  const [driverEmail, setDriverEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleAttendantClick = () => {
    login("attendant");
    toast({
      title: "Welcome",
      description: "Destination Attendant mode activated",
    });
    navigate("/");
  };

  const handleDriverLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Check if driver exists
      const driver = await carrierService.getDriverByEmail(driverEmail);

      if (driver) {
        // Driver exists, log them in
        login("driver", driver.id);

        // Set driver profile
        setDriverProfile({
          id: driver.id,
          name: driver.name,
          carrier_id: driver.carrier_id,
          default_truck_id: driver.default_truck_id,
          driver_qr_code: driver.driver_qr_code,
          status: driver.status,
          created_at: driver.created_at,
          updated_at: driver.updated_at,
        });

        toast({
          title: "Welcome Back",
          description: `Logged in as ${driver.name}`,
        });
        navigate("/driver/profile");
      } else {
        // Driver doesn't exist, redirect to sign up
        toast({
          title: "New Driver",
          description: "Let's create your driver account",
        });
        navigate("/driver/signup", { state: { email: driverEmail } });
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Login Failed",
        description: "An error occurred during login",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (step === "role") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary mx-auto mb-4">
              <Truck className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Avensis LogFlow
            </h1>
            <p className="text-muted-foreground">Digital Ticketing System</p>
          </div>

          {/* Role Selection */}
          <div className="space-y-4">
            <Card
              className="group cursor-pointer overflow-hidden transition-all hover:shadow-lg hover:border-primary"
              onClick={handleAttendantClick}
            >
              <div className="p-6 space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 group-hover:bg-blue-200 transition-colors">
                  <QrCode className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-1">
                    Destination Attendant
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Scan QR codes and confirm deliveries
                  </p>
                </div>
                <Button className="w-full" size="lg">
                  Continue as Attendant
                </Button>
              </div>
            </Card>

            <Card
              className="group cursor-pointer overflow-hidden transition-all hover:shadow-lg hover:border-primary"
              onClick={() => setStep("driver-login")}
            >
              <div className="p-6 space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 group-hover:bg-green-200 transition-colors">
                  <User className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-1">
                    Driver
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Log in or sign up to create tickets
                  </p>
                </div>
                <Button className="w-full" size="lg" variant="outline">
                  Continue as Driver
                </Button>
              </div>
            </Card>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground mt-8">
            © 2024 Avensis. All rights reserved.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => setStep("role")}
            className="mb-4"
          >
            ← Back
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Driver Login</h1>
          <p className="text-muted-foreground mt-2">
            Enter your email to log in or sign up
          </p>
        </div>

        {/* Login Form */}
        <Card className="p-6">
          <form onSubmit={handleDriverLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="driver@example.com"
                value={driverEmail}
                onChange={(e) => setDriverEmail(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Logging in...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Log In / Sign Up
                </>
              )}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-4">
            If you don't have an account, one will be created for you.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Login;
