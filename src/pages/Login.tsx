import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Truck, User, QrCode, LogIn, BookOpen } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { DriverOnboardingModal } from "@/components/DriverOnboardingModal";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { carrierService } from "@/lib/carrierService";
import { APP_TITLE } from "@/lib/config";
import { Header } from "@/components/Header";
import { useTheme } from "@/contexts/ThemeContext";

const Login = () => {
  const navigate = useNavigate();
  const { login, setDriverProfile } = useAuth();
  const { t } = useLanguage();
  const { toggleTheme } = useTheme();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [step, setStep] = useState<"role" | "driver-login">("role");
  const [driverEmail, setDriverEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleAttendantClick = () => {
    login("attendant");
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

        // Redirect based on driver status
        if (driver.status === "active") {
          navigate("/");
        } else {
          navigate("/driver/profile");
        }
      } else {
        // Driver doesn't exist, redirect to sign up
        navigate("/driver/signup", { state: { email: driverEmail } });
      }
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (step === "role") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header with Theme Toggle */}
        <Header />

        {/* Language Selector */}
        <div className="absolute top-16 right-4">
          <LanguageSelector />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            {/* Header */}
            <div className="mb-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary mx-auto mb-4">
                <Truck className="h-8 w-8 text-primary-foreground" />
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {APP_TITLE}
              </h1>
              <p className="text-muted-foreground">
                {t("login.digitalTicketingSystem")}
              </p>
            </div>

            {/* Role Selection */}
            <div className="space-y-4">
              <Card
                className="group cursor-pointer overflow-hidden transition-all hover:shadow-lg hover:border-primary"
                onClick={() => setStep("driver-login")}
              >
                <div className="p-6 space-y-4 flex flex-col items-center text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 group-hover:bg-green-200 transition-colors">
                    <User className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-1">
                      {t("login.driver")}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t("login.driverDesc")}
                    </p>
                  </div>
                  {/*
                <Button className="w-full" size="lg">
                  {t("login.continueAsDriver")}
                </Button>
                */}
                </div>
              </Card>

              <Card
                className="group cursor-pointer overflow-hidden transition-all hover:shadow-lg hover:border-primary"
                onClick={() => navigate("/overview")}
              >
                <div className="p-6 space-y-4 flex flex-col items-center text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 group-hover:bg-purple-200 transition-colors overflow-hidden flex-shrink-0">
                    <img
                      src="/truckPic.png"
                      alt="Truck"
                      className="h-12 w-12 object-contain"
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-1">
                      {/*t("login.overview")*/}Scalehouse
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t("login.overviewDesc")}
                    </p>
                  </div>
                  {/*
                <Button className="w-full" size="lg">
                  {t("login.continueAsOverview")}
                </Button>
                */}
                </div>
              </Card>

              <Card
                className="group cursor-pointer overflow-hidden transition-all hover:shadow-lg hover:border-primary"
                onClick={handleAttendantClick}
              >
                <div className="p-6 space-y-4 flex flex-col items-center text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 group-hover:bg-blue-200 transition-colors">
                    <QrCode className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-1">
                      {t("login.attendant")}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t("login.attendantDesc")}
                    </p>
                  </div>
                  {/*
                <Button className="w-full" size="lg">
                  {t("login.continueAsAttendant")}
                </Button>
                */}
                </div>
              </Card>
              {/* Driver Onboarding Button - Bottom of Page */}
              <div className="flex justify-center pt-4 md:pt-8">
                <Button
                  variant="outline"
                  onClick={() => setShowOnboarding(true)}
                  className="gap-2"
                  size="sm"
                >
                  <BookOpen className="h-4 w-4" />
                  Driver Onboarding
                </Button>
              </div>
              {/* Driver Onboarding Modal */}
              <DriverOnboardingModal
                open={showOnboarding}
                onOpenChange={setShowOnboarding}
              />
            </div>

            {/* Footer */}
            <p className="text-center text-xs text-muted-foreground mt-8">
              {t("login.copyright")}
            </p>
          </div>
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
            {t("login.back")}
          </Button>
          <h1 className="text-2xl font-bold text-foreground">
            {t("login.driverLogin")}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t("login.enterEmailToLogin")}
          </p>
        </div>

        {/* Login Form */}
        <Card className="p-6">
          <form onSubmit={handleDriverLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("login.loginId")}</Label>
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
                  {t("login.loggingIn")}
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  {t("login.logInSignUp")}
                </>
              )}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-4">
            {t("login.noAccountWarning")}
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Login;
