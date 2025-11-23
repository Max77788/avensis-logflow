import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  MapPin,
  Users,
  Settings,
  Plus,
} from "lucide-react";
import { CompaniesTab } from "@/components/admin/CompaniesTab";
import { DestinationSitesTab } from "@/components/admin/DestinationSitesTab";
import { PickupSitesTab } from "@/components/admin/PickupSitesTab";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("companies");

  return (
    <div className="min-h-screen bg-background">
      <Header
        showHomeButton
        onHomeClick={() => navigate("/")}
        showLogoutButton
        onLogoutClick={() => navigate("/login")}
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
              <TabsList className="grid w-full grid-cols-3 lg:grid-cols-3">
                <TabsTrigger value="companies" className="gap-2">
                  <Building2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Companies</span>
                </TabsTrigger>
                <TabsTrigger value="destination_sites" className="gap-2">
                  <MapPin className="h-4 w-4" />
                  <span className="hidden sm:inline">Destination Sites</span>
                </TabsTrigger>
                <TabsTrigger value="pickup_sites" className="gap-2">
                  <MapPin className="h-4 w-4" />
                  <span className="hidden sm:inline">Pickup Sites</span>
                </TabsTrigger>
              </TabsList>

              <div className="p-6">
                <TabsContent value="companies" className="mt-0">
                  <CompaniesTab />
                </TabsContent>

                <TabsContent value="destination_sites" className="mt-0">
                  <DestinationSitesTab />
                </TabsContent>

                <TabsContent value="pickup_sites" className="mt-0">
                  <PickupSitesTab />
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

