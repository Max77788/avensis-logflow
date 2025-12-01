import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2 } from "lucide-react";
import { CompaniesTab } from "@/components/admin/CompaniesTab";
import AddUserDialog from "@/components/admin/AddUserDialog";
import { Button } from "@/components/ui/button";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("companies");
  const [showAddUser, setShowAddUser] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Header
        showHomeButton
        onHomeClick={() => navigate("/home")}
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
            <Button onClick={() => setShowAddUser(true)} variant="outline">Add User</Button>
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
      <AddUserDialog open={showAddUser} onOpenChange={setShowAddUser} onSuccess={() => {/*refresh users list*/}} />
    </div>
  );
};

export default AdminDashboard;
