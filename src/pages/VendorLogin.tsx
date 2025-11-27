import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, LogIn, Loader2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { carrierService } from "@/lib/carrierService";
import { toast } from "@/hooks/use-toast";

const VendorLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [companyName, setCompanyName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

        // Check if vendor has filled in basic company info (has onboarded)
        const hasOnboarded =
          company.business_address && company.mc_number && company.dot_number;

        // Authentication successful, log them in as vendor
        login("carrier", result.data.id);

        if (hasOnboarded) {
          // Vendor already onboarded - navigate to profile page
          toast({
            title: "Welcome Back",
            description: `Welcome back, ${result.data.name}!`,
          });
          navigate("/vendor/profile");
        } else {
          // First time onboarding - navigate to onboarding form
          toast({
            title: "Login Successful",
            description: `Welcome, ${result.data.name}!`,
          });
          navigate("/vendor/onboarding");
        }
      } else {
        // Provide more helpful error messages
        let errorMessage = result.error || "Invalid company name or password";

        if (errorMessage.includes("not found")) {
          errorMessage =
            "Company not found. Please check your company name and try again.";
        } else if (errorMessage.includes("Password not set")) {
          errorMessage =
            "Your account password has not been set yet. Please contact your administrator.";
        } else if (errorMessage.includes("Invalid password")) {
          errorMessage =
            "Incorrect password. Please try again or contact your administrator.";
        }

        toast({
          title: "Login Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Error",
        description:
          "An error occurred during login. Please try again or contact support.",
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
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
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
