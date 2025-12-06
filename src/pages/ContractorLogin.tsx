import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { carrierService } from "@/lib/carrierService";

const ContractorLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [contractorName, setContractorName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleContractorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Authenticate contractor with password (using same service as carriers)
      const result = await carrierService.authenticateCarrier(
        contractorName.trim(),
        password
      );

      if (result.success && result.data) {
        // Verify this is a contractor company
        if (result.data.type !== "Contractor") {
          setError("This company is not registered as a contractor.");
          setIsLoading(false);
          return;
        }

        // Authentication successful, log them in as attendant
        login("attendant", result.data.id);
        navigate("/contractor/portal");
      } else {
        setError(result.error || "Authentication failed. Please try again.");
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
              Contractor Portal Login
            </h1>
            <p className="text-muted-foreground mt-2">
              Enter your contractor company name to access the destination attendant portal
            </p>
          </div>

          {/* Login Form */}
          <Card className="p-6">
            <form onSubmit={handleContractorLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contractorName">Contractor Company Name</Label>
                <Input
                  id="contractorName"
                  type="text"
                  placeholder="Enter contractor company name"
                  value={contractorName}
                  onChange={(e) => setContractorName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
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
              <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
                <img
                  src="/avensis-logo.jpg"
                  alt="Avensis Energy Services"
                  className="h-12 w-auto object-contain opacity-70"
                />
                <p className="text-center">
                  The Contractor Portal allows destination attendants to view and approve tickets coming to their destination sites.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ContractorLogin;

