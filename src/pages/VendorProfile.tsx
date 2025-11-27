import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Header } from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import {
  Loader2,
  Building2,
  Users,
  Truck,
  UserCircle,
  LogOut,
} from "lucide-react";
import CompanyInfoTab from "@/components/vendor-profile/CompanyInfoTab";
import ContactsTab from "@/components/vendor-profile/ContactsTab";
import TrucksTab from "@/components/vendor-profile/TrucksTab";
import DriversTab from "@/components/vendor-profile/DriversTab";

const VendorProfile = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [companyData, setCompanyData] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("company");

  // Check authentication
  useEffect(() => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to access your profile",
        variant: "destructive",
      });
      navigate("/vendor/login");
    }
  }, [user, navigate]);

  // Load vendor data
  useEffect(() => {
    const loadVendorData = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);

        // Load company data
        const { data: company, error: companyError } = await supabase
          .from("companies")
          .select("*")
          .eq("id", user.id)
          .single();

        if (companyError) throw companyError;
        setCompanyData(company);

        // Load contacts
        const { data: contactsData, error: contactsError } = await supabase
          .from("Contact_Info")
          .select("*")
          .eq("company_id", user.id);

        if (!contactsError && contactsData) {
          setContacts(contactsData);
        }

        // Load trucks
        const { data: trucksData, error: trucksError } = await supabase
          .from("trucks")
          .select("*")
          .eq("carrier_id", user.id);

        if (!trucksError && trucksData) {
          setTrucks(trucksData);
        }

        // Load drivers
        const { data: driversData, error: driversError } = await supabase
          .from("drivers")
          .select("*")
          .eq("carrier_id", user.id);

        if (!driversError && driversData) {
          setDrivers(driversData);
        }
      } catch (error: any) {
        console.error("Error loading vendor data:", error);
        toast({
          title: "Error",
          description: "Failed to load your profile data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadVendorData();
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate("/vendor/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading your profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Vendor Profile</h1>
            <p className="text-muted-foreground">
              {companyData?.name || "Your Company"}
            </p>
          </div>
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>

        <Card className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="company">
                <Building2 className="mr-2 h-4 w-4" />
                Company Info
              </TabsTrigger>
              <TabsTrigger value="contacts">
                <Users className="mr-2 h-4 w-4" />
                Contacts
              </TabsTrigger>
              <TabsTrigger value="trucks">
                <Truck className="mr-2 h-4 w-4" />
                Trucks
              </TabsTrigger>
              <TabsTrigger value="drivers">
                <UserCircle className="mr-2 h-4 w-4" />
                Drivers
              </TabsTrigger>
            </TabsList>

            <TabsContent value="company">
              <CompanyInfoTab
                companyData={companyData}
                setCompanyData={setCompanyData}
              />
            </TabsContent>

            <TabsContent value="contacts">
              <ContactsTab
                contacts={contacts}
                setContacts={setContacts}
                companyId={user?.id}
              />
            </TabsContent>

            <TabsContent value="trucks">
              <TrucksTab
                trucks={trucks}
                setTrucks={setTrucks}
                carrierId={user?.id}
              />
            </TabsContent>

            <TabsContent value="drivers">
              <DriversTab
                drivers={drivers}
                setDrivers={setDrivers}
                carrierId={user?.id}
              />
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default VendorProfile;
