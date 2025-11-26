import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, LogIn, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { carrierService } from "@/lib/carrierService";
import { toast } from "@/hooks/use-toast";

const VendorLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [companyName, setCompanyName] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleVendorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Authenticate vendor/carrier with password
      const result = await carrierService.authenticateCarrier(
        companyName.trim(),
        password
      );

      if (result.success && result.data) {
        // Check if vendor has already completed onboarding
        const company = result.data as any;

        // Check if all onboarding sections are complete
        const allSectionsComplete =
          company.company_details_status === "Complete" &&
          company.contacts_status === "Complete" &&
          company.fleet_status === "Complete" &&
          company.drivers_status === "Complete";

        // Check if vendor has already submitted onboarding
        const isOnboarded =
          company.status === "Pending Review" ||
          company.status === "Active" ||
          company.status === "Approved" ||
          allSectionsComplete;

        if (isOnboarded) {
          // Vendor already onboarded - navigate to "already onboarded" page
          login("carrier", result.data.id);
          navigate("/vendor/already-onboarded", {
            state: { companyName: result.data.name },
          });
          setIsLoading(false);
          return;
        }

        // Authentication successful, log them in as vendor
        login("carrier", result.data.id);

        toast({
          title: "Login Successful",
          description: `Welcome, ${result.data.name}!`,
        });

        // Navigate to vendor onboarding portal
        navigate("/vendor/onboarding");
      } else {
        toast({
          title: "Login Failed",
          description: result.error || "Invalid company name or password",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Error",
        description: "An error occurred during login. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-primary/10 rounded-full">
              <Building2 className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">Vendor Portal</h1>
          <p className="text-muted-foreground">
            Sign in to access the vendor onboarding portal
          </p>
        </div>

        <Card className="p-6">
          <form onSubmit={handleVendorLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Company Name</Label>
              <Input
                id="company-name"
                type="text"
                placeholder="Enter your company name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isLoading || !companyName || !password}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t">
            <p className="text-sm text-muted-foreground text-center">
              Don't have a password?{" "}
              <span className="text-primary font-medium">
                Contact your administrator
              </span>
            </p>
          </div>
        </Card>

        <div className="mt-6 text-center">
          <Button
            variant="ghost"
            onClick={() => navigate("/login")}
            className="text-sm"
          >
            ← Back to Main Login
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VendorLogin;
