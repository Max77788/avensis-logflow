import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { User, BookOpen, Shield, Building2, MapPin } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { DriverOnboardingModal } from "@/components/DriverOnboardingModal";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Header } from "@/components/Header";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useLanguage();
  const [showOnboarding, setShowOnboarding] = useState(false);

  const handleAttendantClick = () => {
    // Navigate to contractor login page for destination attendants
    navigate("/contractor/login");
  };

  const handleAdminClick = () => {
    login("admin");
    navigate("/admin/dashboard");
  };

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
            <div className="flex items-center justify-center mx-auto mb-4">
              <img
                src="/avensis-logo.jpg"
                alt="Avensis Energy Services"
                className="h-20 md:h-24 w-auto object-contain"
              />
            </div>
            <p className="text-muted-foreground text-lg">
              {t("login.digitalTicketingSystem")}
            </p>
          </div>

          {/* Role Selection */}
          <div className="space-y-4">
            <Card
              className="group cursor-pointer overflow-hidden transition-all hover:shadow-lg hover:border-primary"
              onClick={() => navigate("/driver-onboarding")}
            >
              <div className="p-6 space-y-4 flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-sky-100 group-hover:bg-sky-200 transition-colors">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-1">
                    Driver Onboarding
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Recruit, assess, manage and onboard new drivers
                  </p>
                </div>
              </div>
            </Card>

            <Card
              className="group cursor-pointer overflow-hidden transition-all hover:shadow-lg hover:border-primary"
              onClick={() => navigate("/driver/login")}
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
              onClick={() => navigate("/scale-house")}
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
                  <MapPin className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-1">
                    Destination Attendant
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Contractor portal for destination sites
                  </p>
                </div>
              </div>
            </Card>

            <Card
              className="group cursor-pointer overflow-hidden transition-all hover:shadow-lg hover:border-primary"
              onClick={handleAdminClick}
            >
              <div className="p-6 space-y-4 flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100 group-hover:bg-orange-200 transition-colors">
                  <Shield className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-1">
                    Admin
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Manage companies, sites, and onboarding
                  </p>
                </div>
              </div>
            </Card>

            {/* Driver Onboarding Button */}
            <div className="flex flex-col items-center gap-3 pt-4 md:pt-8">
              <Button
                variant="outline"
                onClick={() => setShowOnboarding(true)}
                className="gap-2"
                size="sm"
              >
                <BookOpen className="h-4 w-4" />
                Driver Onboarding
              </Button>

              <Button
                variant="outline"
                onClick={() => navigate("/vendor/login")}
                className="gap-2"
                size="sm"
              >
                <Building2 className="h-4 w-4" />
                Vendor Portal
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
};

export default Login;
