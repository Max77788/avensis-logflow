import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Lock, LogIn, Loader2 } from "lucide-react";
import { CompaniesTab } from "@/components/admin/CompaniesTab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

// Hardcoded credentials for admin dashboard access
const ADMIN_CREDENTIALS = {
  username: "admin",
  password: "admin123",
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("companies");
  
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Handle login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);

    // Simulate a brief loading state for better UX
    setTimeout(() => {
      if (
        username.trim() === ADMIN_CREDENTIALS.username &&
        password === ADMIN_CREDENTIALS.password
      ) {
        setIsAuthenticated(true);
        toast({
          title: "Login Successful",
          description: "Welcome to Admin Dashboard",
        });
      } else {
        toast({
          title: "Login Failed",
          description: "Invalid username or password",
          variant: "destructive",
        });
      }
      setIsLoggingIn(false);
    }, 500);
  };

  // Show login wall if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-primary/10 rounded-full">
                <Lock className="h-12 w-12 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-foreground">
              Admin Dashboard Access
            </h1>
            <p className="text-muted-foreground mt-2">
              Please enter your credentials to continue
            </p>
          </div>

          {/* Login Form */}
          <Card className="p-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isLoggingIn}
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Login
                  </>
                )}
              </Button>
            </form>

            <div className="mt-4 pt-4 border-t border-border">
              <Button
                variant="ghost"
                onClick={() => navigate("/home")}
                className="w-full"
              >
                Back to Home
              </Button>
            </div>
          </Card>

          {/* Info */}
          <p className="text-center text-xs text-muted-foreground mt-6">
            Authorized personnel only. Contact your administrator for access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        showHomeButton
        onHomeClick={() => navigate("/home")}
        showLogoutButton
        onLogoutClick={() => {
          setIsAuthenticated(false);
          setUsername("");
          setPassword("");
          navigate("/login");
        }}
      />

      <main className="container mx-auto px-4 py-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Admin Dashboard
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage companies, sites, and onboarding workflows
              </p>
            </div>
          </div>

          {/* Main Tabs */}
          <Card className="shadow-md">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-1">
                <TabsTrigger value="companies" className="gap-2">
                  <Building2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Companies</span>
                </TabsTrigger>
              </TabsList>

              <div className="p-6">
                <TabsContent value="companies" className="mt-0">
                  <CompaniesTab />
                </TabsContent>
              </div>
            </Tabs>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
