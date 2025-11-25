import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SignaturePad } from "@/components/SignaturePad";
import { Header } from "@/components/Header";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Building2,
  Users,
  Truck,
  UserCircle,
  Shield,
  ArrowRight,
  ArrowLeft,
  Save,
  Loader2,
  Upload,
  FileSpreadsheet,
  Download,
  FileText,
  CheckCircle2,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import Papa from "papaparse";
import { useAuth } from "@/contexts/AuthContext";
import { APP_TITLE } from "@/lib/config";

interface VendorFormData {
  // Company Details
  vendor_company_name: string;
  business_address: string;
  city: string;
  state: string;
  zip: string;
  legal_name_for_invoicing: string;
  mailing_address_optional: string;
  mc_number: string;
  dot_number: string;
  upload_coi: File | null;
  upload_w9: File | null;

  // Contacts
  company_name: string;
  primary_contact_name: string;
  contact_phone: string;
  contact_email: string;
  location: string;
  role: string;
  comments: string;

  // Fleet Details
  truck_id: string;
  carrier_name: string;
  license_plate: string;
  license_state: string;
  truck_type: string;
  capacity: string;
  gps_device_id: string;
  material_types_handled: string[];
  max_load_capacity: string;
  vin: string;
  is_on_insurance_policy: string;

  // Driver Details
  driver_name: string;
  phone_number: string;
  email_address: string;
  cdl_number: string;
  driver_type: string;
  operating_hours: string;
  weekend_availability: string;
  driver_comments: string;
  emergency_contact: string;
}

const VendorOnboarding = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("company_details");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signature, setSignature] = useState<string>("");
  const [signerName, setSignerName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fleetCsvInputRef = useRef<HTMLInputElement>(null);
  const driverCsvInputRef = useRef<HTMLInputElement>(null);

  // Track completed tabs
  const [completedTabs, setCompletedTabs] = useState<string[]>([
    "company_details",
  ]);

  // CSV upload state
  const [fleetCsvData, setFleetCsvData] = useState<any[]>([]);
  const [driverCsvData, setDriverCsvData] = useState<any[]>([]);

  // Additional contacts state
  const [additionalContacts, setAdditionalContacts] = useState<any[]>([]);

  // Initial contract acceptance state (must accept before accessing form)
  const [initialContractAccepted, setInitialContractAccepted] = useState(false);
  const [hasAgreedToInitialContract, setHasAgreedToInitialContract] =
    useState(false);

  // Final contract acceptance state (on compliance tab)
  const [finalContractAccepted, setFinalContractAccepted] = useState(false);

  // Check authentication
  useEffect(() => {
    if (!authLoading && !user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to access the vendor onboarding portal",
        variant: "destructive",
      });
      navigate("/vendor/login");
    }
  }, [user, authLoading, navigate]);

  const [formData, setFormData] = useState<VendorFormData>({
    vendor_company_name: "",
    business_address: "",
    city: "",
    state: "",
    zip: "",
    legal_name_for_invoicing: "",
    mailing_address_optional: "",
    mc_number: "",
    dot_number: "",
    upload_coi: null,
    upload_w9: null,
    company_name: "",
    primary_contact_name: "",
    contact_phone: "",
    contact_email: "",
    location: "",
    role: "",
    comments: "",
    truck_id: "",
    carrier_name: "",
    license_plate: "",
    license_state: "",
    truck_type: "",
    capacity: "",
    gps_device_id: "",
    material_types_handled: [],
    max_load_capacity: "",
    vin: "",
    is_on_insurance_policy: "",
    driver_name: "",
    phone_number: "",
    email_address: "",
    cdl_number: "",
    driver_type: "",
    operating_hours: "",
    weekend_availability: "",
    driver_comments: "",
    emergency_contact: "",
  });

  const updateField = (field: keyof VendorFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Auto-populate company name in Contacts tab
    if (field === "vendor_company_name") {
      setFormData((prev) => ({ ...prev, company_name: value }));
    }
  };

  const handleCoiFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      updateField("upload_coi", file);
    }
  };

  const handleW9FileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      updateField("upload_w9", file);
    }
  };

  // Handle Fleet CSV Upload
  const handleFleetCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          console.log("Fleet CSV parsed:", results.data);
          setFleetCsvData(results.data);
          toast({
            title: "Success",
            description: `Loaded ${results.data.length} fleet records from CSV`,
          });
        },
        error: (error) => {
          console.error("CSV parse error:", error);
          toast({
            title: "Error",
            description: "Failed to parse CSV file",
            variant: "destructive",
          });
        },
      });
    }
  };

  // Handle Driver CSV Upload
  const handleDriverCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          console.log("Driver CSV parsed:", results.data);
          setDriverCsvData(results.data);
          toast({
            title: "Success",
            description: `Loaded ${results.data.length} driver records from CSV`,
          });
        },
        error: (error) => {
          console.error("CSV parse error:", error);
          toast({
            title: "Error",
            description: "Failed to parse CSV file",
            variant: "destructive",
          });
        },
      });
    }
  };

  // Download CSV Template
  const downloadFleetTemplate = () => {
    const template = `truck_id,carrier_name,license_plate,truck_type,capacity,gps_device_id,material_types_handled,max_load_capacity,truck_state,vin_optional
TRUCK001,ABC Trucking,ABC123,End Dump,25,GPS001,"Sand,Rock",25,Owned,1HGBH41JXMN109186
TRUCK002,XYZ Transport,XYZ456,Tanker,30,GPS002,"Oil,Waste",30,Leased,2HGBH41JXMN109187`;

    const blob = new Blob([template], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fleet_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadDriverTemplate = () => {
    const template = `driver_name,phone_number,email_address,license_number,employment_type,operating_hours,weekend_availability,driver_comments
John Doe,555-0100,john@example.com,DL123456,Full-time,8am-5pm,Yes,Experienced driver
Jane Smith,555-0101,jane@example.com,DL789012,Part-time,9am-3pm,No,New driver`;

    const blob = new Blob([template], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "driver_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Add additional contact
  const addAdditionalContact = () => {
    const newContact = {
      id: Date.now(),
      name: "",
      phone: "",
      email: "",
      location: "",
      role: "",
      comments: "",
    };
    setAdditionalContacts([...additionalContacts, newContact]);
  };

  // Remove additional contact
  const removeAdditionalContact = (id: number) => {
    setAdditionalContacts(
      additionalContacts.filter((contact) => contact.id !== id)
    );
  };

  // Update additional contact
  const updateAdditionalContact = (
    id: number,
    field: string,
    value: string
  ) => {
    setAdditionalContacts(
      additionalContacts.map((contact) =>
        contact.id === id ? { ...contact, [field]: value } : contact
      )
    );
  };

  const tabOrder = [
    "company_details",
    "contacts",
    "fleet_details",
    "driver_details",
  ];

  const currentTabIndex = tabOrder.indexOf(activeTab);
  const isLastTab = currentTabIndex === tabOrder.length - 1;
  const isFirstTab = currentTabIndex === 0;

  const validateCurrentTab = (): boolean => {
    switch (activeTab) {
      case "company_details":
        if (
          !formData.vendor_company_name ||
          !formData.business_address ||
          !formData.city ||
          !formData.state ||
          !formData.zip
        ) {
          toast({
            title: "Required Fields Missing",
            description:
              "Please fill in all required fields in Company Details",
            variant: "destructive",
          });
          return false;
        }
        return true;
      case "contacts":
        if (
          !formData.primary_contact_name ||
          !formData.contact_email ||
          !formData.contact_phone
        ) {
          toast({
            title: "Required Fields Missing",
            description: "Please fill in all required fields in Contacts",
            variant: "destructive",
          });
          return false;
        }
        return true;
      case "fleet_details":
        if (
          !formData.truck_id ||
          !formData.license_plate ||
          !formData.truck_type
        ) {
          toast({
            title: "Required Fields Missing",
            description: "Please fill in all required fields in Fleet Details",
            variant: "destructive",
          });
          return false;
        }
        return true;
      case "driver_details":
        if (
          !formData.driver_name ||
          !formData.phone_number ||
          !formData.cdl_number
        ) {
          toast({
            title: "Required Fields Missing",
            description: "Please fill in all required fields in Driver Details",
            variant: "destructive",
          });
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!isLastTab) {
      if (validateCurrentTab()) {
        const nextTab = tabOrder[currentTabIndex + 1];
        setActiveTab(nextTab);
        // Mark next tab as available
        if (!completedTabs.includes(nextTab)) {
          setCompletedTabs([...completedTabs, nextTab]);
        }
      }
    }
  };

  const handlePrevious = () => {
    if (!isFirstTab) {
      setActiveTab(tabOrder[currentTabIndex - 1]);
    }
  };

  const handleSubmit = async () => {
    if (!signerName) {
      toast({
        title: "Signer Name Required",
        description: "Please provide the signer name on the Company Info tab",
        variant: "destructive",
      });
      setActiveTab("company_details");
      return;
    }

    setIsSubmitting(true);

    try {
      // TODO: Implement actual submission logic
      console.log("Submitting vendor onboarding data:", formData);
      console.log("Additional contacts:", additionalContacts);
      console.log("Fleet CSV data:", fleetCsvData);
      console.log("Driver CSV data:", driverCsvData);
      console.log("Initial contract accepted:", initialContractAccepted);
      console.log("Signer Name:", signerName);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      toast({
        title: "Success!",
        description: "Vendor onboarding completed successfully",
      });

      // Navigate to success page or dashboard
      navigate("/");
    } catch (error) {
      console.error("Error submitting vendor onboarding:", error);
      toast({
        title: "Error",
        description: "Failed to submit vendor onboarding. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show initial contract acceptance screen before allowing access to form
  if (!hasAgreedToInitialContract) {
    return (
      <div className="min-h-screen bg-background">
        <Header showHomeButton onHomeClick={() => navigate("/")} />

        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-primary/10 rounded-full">
                  <FileText className="h-12 w-12 text-primary" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-foreground">
                Vendor Service Agreement
              </h1>
              <p className="text-muted-foreground">
                Please read and accept the terms before proceeding with
                onboarding
              </p>
            </div>

            {/* Contract Card */}
            <Card className="shadow-lg">
              <div className="p-8">
                <div className="bg-muted p-6 rounded-lg max-h-[500px] overflow-y-auto mb-6">
                  <div className="prose prose-sm max-w-none">
                    <h4 className="font-semibold text-lg mb-4">
                      {APP_TITLE} APP USAGE AGREEMENT
                    </h4>

                    <p className="text-sm text-muted-foreground mb-4">
                      This App Usage Agreement ("Agreement") governs the use of
                      the {APP_TITLE} digital platform ("Platform"), powered by
                      FusionIQ Labs LLC, by any trucking or transportation
                      vendor ("Vendor") and its authorized users. By selecting
                      "I Agree", the Vendor acknowledges that it has read,
                      understood, and accepted the terms of this Agreement. Last
                      updated: [Insert Date].
                    </p>

                    <h5 className="font-semibold text-base mt-6 mb-3">
                      1. PURPOSE
                    </h5>
                    <p className="text-sm text-muted-foreground mb-4">
                      {APP_TITLE} provides a secure, paperless environment for
                      creating, verifying, and managing load tickets and
                      delivery documentation. The Platform supports Avensis
                      Energy LLC and its approved vendors in executing digital
                      hauling operations.
                    </p>

                    <h5 className="font-semibold text-base mt-6 mb-3">
                      2. PLATFORM ACCESS
                    </h5>
                    <p className="text-sm text-muted-foreground mb-4">
                      Vendors may access the Platform solely for legitimate
                      business activities authorized by Avensis Energy. Login
                      credentials are for internal company use only and must not
                      be shared or transferred. {APP_TITLE} may monitor usage to
                      maintain system security and performance.
                    </p>

                    <h5 className="font-semibold text-base mt-6 mb-3">
                      3. PLATFORM FEES
                    </h5>
                    <p className="text-sm text-muted-foreground mb-4">
                      A Platform Fee of USD $1.00 per load processed through{" "}
                      {APP_TITLE} applies. The fee will be automatically
                      deducted from Vendor payout settlements processed through
                      Avensis Energy. {APP_TITLE} may adjust this fee with a
                      minimum of 30 days’ notice, provided through the app or in
                      writing.
                    </p>

                    <h5 className="font-semibold text-base mt-6 mb-3">
                      4. DATA OWNERSHIP
                    </h5>
                    <p className="text-sm text-muted-foreground mb-4">
                      All operational data related to loads—including pickup and
                      delivery details, ticket images, signatures, weights, and
                      GPS data—are owned by Avensis Energy LLC. FusionIQ Labs
                      LLC retains ownership of the software, code, workflows,
                      and analytics comprising the {APP_TITLE} Platform. The
                      Vendor grants {APP_TITLE} and Avensis Energy permission to
                      use Vendor-submitted data for operational processing,
                      audits, and compliance.
                    </p>

                    <h5 className="font-semibold text-base mt-6 mb-3">
                      5. CONFIDENTIALITY & DATA PROTECTION
                    </h5>
                    <p className="text-sm text-muted-foreground mb-4">
                      {APP_TITLE} implements reasonable technical and
                      administrative safeguards to protect data entered into the
                      Platform. Vendors must not attempt to access, obtain, or
                      disclose data belonging to other parties.
                    </p>

                    <h5 className="font-semibold text-base mt-6 mb-3">
                      6. SERVICE NATURE
                    </h5>
                    <p className="text-sm text-muted-foreground mb-4">
                      {APP_TITLE} is not a broker, carrier, dispatcher, or
                      employer of the Vendor or its drivers. It functions solely
                      as a digital documentation and workflow system. Vendors
                      remain fully responsible for their own operations,
                      equipment, and personnel.
                    </p>

                    <h5 className="font-semibold text-base mt-6 mb-3">
                      7. LIMITATION OF LIABILITY
                    </h5>
                    <p className="text-sm text-muted-foreground mb-4">
                      {APP_TITLE} and FusionIQ Labs LLC are not liable for any
                      indirect, incidental, or consequential damages arising
                      from Platform use. Total liability to any Vendor shall not
                      exceed the Platform Fees charged for that Vendor’s loads
                      during the three (3) months preceding any claim.
                    </p>

                    <h5 className="font-semibold text-base mt-6 mb-3">
                      8. SUSPENSION OF ACCESS
                    </h5>
                    <p className="text-sm text-muted-foreground mb-4">
                      {APP_TITLE} may suspend or revoke Platform access if a
                      Vendor misuses the system, introduces security risks, or
                      engages in fraudulent activity. Because billing is handled
                      through Avensis Energy, suspension affects access only and
                      does not modify payment obligations between Avensis Energy
                      and FusionIQ Labs.
                    </p>

                    <h5 className="font-semibold text-base mt-6 mb-3">
                      9. UPDATES TO TERMS
                    </h5>
                    <p className="text-sm text-muted-foreground mb-4">
                      {APP_TITLE} may update this Agreement from time to time.
                      Continued use of the Platform after notice of any update
                      constitutes acceptance of the revised terms.
                    </p>

                    <h5 className="font-semibold text-base mt-6 mb-3">
                      10. GOVERNING LAW & DISPUTE RESOLUTION
                    </h5>
                    <p className="text-sm text-muted-foreground mb-4">
                      This Agreement is governed by the laws of the State of
                      Texas. Any dispute will first be addressed through
                      informal discussion, and if unresolved, through
                      arbitration held in Texas.
                    </p>

                    <h5 className="font-semibold text-base mt-6 mb-3">
                      11. ACKNOWLEDGMENT
                    </h5>
                    <p className="text-sm text-muted-foreground mb-4">
                      By clicking "I Agree", the Vendor confirms that:
                      <br />• It is authorized to act on behalf of its company;
                      <br />• It understands {APP_TITLE} is a digital
                      documentation service only; and
                      <br />• It agrees to the USD $1.00 per load Platform Fee
                      and all terms listed above.
                    </p>

                    <p className="text-sm text-muted-foreground mt-8 italic">
                      © 2025 {APP_TITLE} — Powered by FusionIQ Labs LLC. All
                      Rights Reserved.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 mb-6 p-4 bg-primary/5 rounded-lg">
                  <Checkbox
                    id="initial-contract-acceptance"
                    checked={initialContractAccepted}
                    onCheckedChange={(checked) =>
                      setInitialContractAccepted(checked as boolean)
                    }
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor="initial-contract-acceptance"
                      className="text-base font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      I have read and agree to the terms of this Vendor Service
                      Agreement *
                    </label>
                    <p className="text-sm text-muted-foreground">
                      By checking this box, you acknowledge that you have read,
                      understood, and agree to be bound by the terms and
                      conditions outlined above. You must accept these terms to
                      proceed with the onboarding process.
                    </p>
                  </div>
                </div>

                <Button
                  size="lg"
                  className="w-full"
                  disabled={!initialContractAccepted}
                  onClick={() => {
                    if (initialContractAccepted) {
                      setHasAgreedToInitialContract(true);
                      toast({
                        title: "Terms Accepted",
                        description:
                          "You can now proceed with the onboarding form",
                      });
                    }
                  }}
                >
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Continue to Onboarding
                </Button>
              </div>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header showHomeButton onHomeClick={() => navigate("/")} />

      <main className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">
              Vendor Onboarding
            </h1>
            <p className="text-muted-foreground">
              Complete all sections to onboard your vendor. Navigate through the
              tabs to fill in all required information.
            </p>
          </div>

          {/* Tabs */}
          <Card className="shadow-md">
            <Tabs
              value={activeTab}
              onValueChange={(value) => {
                // Only allow switching to completed tabs
                if (completedTabs.includes(value)) {
                  setActiveTab(value);
                }
              }}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-5 h-auto p-4 bg-muted/50">
                <TabsTrigger
                  value="company_details"
                  disabled={!completedTabs.includes("company_details")}
                  className={`flex flex-col items-center gap-2 py-4 ${
                    !completedTabs.includes("company_details")
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                      activeTab === "company_details"
                        ? "bg-primary border-primary text-primary-foreground"
                        : completedTabs.includes("company_details")
                        ? "bg-green-500 border-green-500 text-white"
                        : "bg-red-500 border-red-500 text-white"
                    }`}
                  >
                    <Building2 className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-medium">Company</span>
                </TabsTrigger>
                <TabsTrigger
                  value="contacts"
                  disabled={!completedTabs.includes("contacts")}
                  className={`flex flex-col items-center gap-2 py-4 ${
                    !completedTabs.includes("contacts")
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                      activeTab === "contacts"
                        ? "bg-primary border-primary text-primary-foreground"
                        : completedTabs.includes("contacts")
                        ? "bg-green-500 border-green-500 text-white"
                        : "bg-red-500 border-red-500 text-white"
                    }`}
                  >
                    <Users className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-medium">Contacts</span>
                </TabsTrigger>
                <TabsTrigger
                  value="fleet_details"
                  disabled={!completedTabs.includes("fleet_details")}
                  className={`flex flex-col items-center gap-2 py-4 ${
                    !completedTabs.includes("fleet_details")
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                      activeTab === "fleet_details"
                        ? "bg-primary border-primary text-primary-foreground"
                        : completedTabs.includes("fleet_details")
                        ? "bg-green-500 border-green-500 text-white"
                        : "bg-red-500 border-red-500 text-white"
                    }`}
                  >
                    <Truck className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-medium">Fleet</span>
                </TabsTrigger>
                <TabsTrigger
                  value="driver_details"
                  disabled={!completedTabs.includes("driver_details")}
                  className={`flex flex-col items-center gap-2 py-4 ${
                    !completedTabs.includes("driver_details")
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                      activeTab === "driver_details"
                        ? "bg-primary border-primary text-primary-foreground"
                        : completedTabs.includes("driver_details")
                        ? "bg-green-500 border-green-500 text-white"
                        : "bg-red-500 border-red-500 text-white"
                    }`}
                  >
                    <UserCircle className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-medium">Drivers</span>
                </TabsTrigger>
              </TabsList>

              {/* Company Details Tab */}
              <TabsContent value="company_details" className="space-y-4 p-6">
                <h2 className="text-xl font-semibold mb-4">Company Details</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vendor_company_name">
                      Vendor / Company Name *
                    </Label>
                    <Input
                      id="vendor_company_name"
                      value={formData.vendor_company_name}
                      onChange={(e) =>
                        updateField("vendor_company_name", e.target.value)
                      }
                      placeholder="Legal vendor or company name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="business_address">Business Address *</Label>
                    <Input
                      id="business_address"
                      value={formData.business_address}
                      onChange={(e) =>
                        updateField("business_address", e.target.value)
                      }
                      placeholder="Street address of the business"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => updateField("city", e.target.value)}
                      placeholder="City of the business address"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">State *</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => updateField("state", e.target.value)}
                      placeholder="State or region"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="zip">Zip *</Label>
                    <Input
                      id="zip"
                      value={formData.zip}
                      onChange={(e) => updateField("zip", e.target.value)}
                      placeholder="ZIP or postal code"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="legal_name_for_invoicing">
                      Legal Name Used for Invoicing
                    </Label>
                    <Input
                      id="legal_name_for_invoicing"
                      value={formData.legal_name_for_invoicing}
                      onChange={(e) =>
                        updateField("legal_name_for_invoicing", e.target.value)
                      }
                      placeholder="Legal entity name for invoices"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="mailing_address_optional">
                      Mailing Address (if different)
                    </Label>
                    <Input
                      id="mailing_address_optional"
                      value={formData.mailing_address_optional}
                      onChange={(e) =>
                        updateField("mailing_address_optional", e.target.value)
                      }
                      placeholder="Mailing address if different from business address"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mc_number">MC Number</Label>
                    <Input
                      id="mc_number"
                      value={formData.mc_number}
                      onChange={(e) => updateField("mc_number", e.target.value)}
                      placeholder="Motor Carrier number"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dot_number">DOT Number</Label>
                    <Input
                      id="dot_number"
                      value={formData.dot_number}
                      onChange={(e) =>
                        updateField("dot_number", e.target.value)
                      }
                      placeholder="Department of Transportation number"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="upload_coi">
                      Upload COI (Certificate of Insurance)
                    </Label>
                    <Input
                      id="upload_coi"
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={handleCoiFileChange}
                      className="cursor-pointer"
                    />
                    {formData.upload_coi && (
                      <p className="text-sm text-primary">
                        Selected: {formData.upload_coi.name}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="upload_w9">Upload W9</Label>
                    <Input
                      id="upload_w9"
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={handleW9FileChange}
                      className="cursor-pointer"
                    />
                    {formData.upload_w9 && (
                      <p className="text-sm text-primary">
                        Selected: {formData.upload_w9.name}
                      </p>
                    )}
                  </div>

                  {/* Signer Name Section */}
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="signer_name">Signer Name *</Label>
                    <Input
                      id="signer_name"
                      value={signerName}
                      onChange={(e) => setSignerName(e.target.value)}
                      placeholder="Name of person signing this agreement"
                    />
                    <p className="text-xs text-muted-foreground">
                      By providing your name, you agree to the terms and
                      conditions
                    </p>
                  </div>
                </div>
              </TabsContent>

              {/* Contacts Tab */}
              <TabsContent value="contacts" className="space-y-4 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Primary Contact</h2>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addAdditionalContact}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Contact
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Company Name</Label>
                    <Input
                      id="company_name"
                      value={formData.company_name}
                      onChange={(e) =>
                        updateField("company_name", e.target.value)
                      }
                      placeholder="Vendor company name"
                      disabled
                    />
                    <p className="text-xs text-muted-foreground">
                      Pre-populated from Company Details
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="primary_contact_name">
                      Primary Contact Name *
                    </Label>
                    <Input
                      id="primary_contact_name"
                      value={formData.primary_contact_name}
                      onChange={(e) =>
                        updateField("primary_contact_name", e.target.value)
                      }
                      placeholder="Main contact person"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact_phone">Contact Phone *</Label>
                    <Input
                      id="contact_phone"
                      type="tel"
                      value={formData.contact_phone}
                      onChange={(e) =>
                        updateField("contact_phone", e.target.value)
                      }
                      placeholder="Main phone number"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact_email">Contact Email *</Label>
                    <Input
                      id="contact_email"
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) =>
                        updateField("contact_email", e.target.value)
                      }
                      placeholder="Email for dispatch & system alerts"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => updateField("location", e.target.value)}
                      placeholder="Primary operating location"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Input
                      id="role"
                      value={formData.role}
                      onChange={(e) => updateField("role", e.target.value)}
                      placeholder="e.g., Owner, Dispatcher, Operations"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="comments">Comments</Label>
                    <Textarea
                      id="comments"
                      value={formData.comments}
                      onChange={(e) => updateField("comments", e.target.value)}
                      placeholder="Any notes about this contact"
                      rows={3}
                    />
                  </div>
                </div>

                {/* Additional Contacts */}
                {additionalContacts.length > 0 && (
                  <div className="space-y-4 mt-6">
                    <h3 className="text-lg font-semibold">
                      Additional Contacts
                    </h3>
                    {additionalContacts.map((contact, index) => (
                      <Card key={contact.id} className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium">Contact {index + 2}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAdditionalContact(contact.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Contact Name</Label>
                            <Input
                              value={contact.name}
                              onChange={(e) =>
                                updateAdditionalContact(
                                  contact.id,
                                  "name",
                                  e.target.value
                                )
                              }
                              placeholder="Contact person name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Phone</Label>
                            <Input
                              type="tel"
                              value={contact.phone}
                              onChange={(e) =>
                                updateAdditionalContact(
                                  contact.id,
                                  "phone",
                                  e.target.value
                                )
                              }
                              placeholder="Phone number"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Email</Label>
                            <Input
                              type="email"
                              value={contact.email}
                              onChange={(e) =>
                                updateAdditionalContact(
                                  contact.id,
                                  "email",
                                  e.target.value
                                )
                              }
                              placeholder="Email address"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Location</Label>
                            <Input
                              value={contact.location}
                              onChange={(e) =>
                                updateAdditionalContact(
                                  contact.id,
                                  "location",
                                  e.target.value
                                )
                              }
                              placeholder="Operating location"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Role</Label>
                            <Input
                              value={contact.role}
                              onChange={(e) =>
                                updateAdditionalContact(
                                  contact.id,
                                  "role",
                                  e.target.value
                                )
                              }
                              placeholder="e.g., Manager, Supervisor"
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label>Comments</Label>
                            <Textarea
                              value={contact.comments}
                              onChange={(e) =>
                                updateAdditionalContact(
                                  contact.id,
                                  "comments",
                                  e.target.value
                                )
                              }
                              placeholder="Any notes about this contact"
                              rows={2}
                            />
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Fleet Details Tab */}
              <TabsContent value="fleet_details" className="space-y-4 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Fleet Details</h2>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={downloadFleetTemplate}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Template
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fleetCsvInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload CSV
                    </Button>
                    <input
                      ref={fleetCsvInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleFleetCsvUpload}
                      className="hidden"
                    />
                  </div>
                </div>

                {fleetCsvData.length > 0 && (
                  <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800">
                      <FileSpreadsheet className="h-5 w-5" />
                      <span className="font-medium">
                        {fleetCsvData.length} fleet records loaded from CSV
                      </span>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      These records will be submitted along with the form data.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="truck_id">Truck ID *</Label>
                    <Input
                      id="truck_id"
                      value={formData.truck_id}
                      onChange={(e) => updateField("truck_id", e.target.value)}
                      placeholder="Unique truck number or internal code"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="carrier_name">Carrier Name *</Label>
                    <Input
                      id="carrier_name"
                      value={formData.carrier_name}
                      onChange={(e) =>
                        updateField("carrier_name", e.target.value)
                      }
                      placeholder="Name of the company that operates the truck"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="license_plate">License Plate *</Label>
                    <Input
                      id="license_plate"
                      value={formData.license_plate}
                      onChange={(e) =>
                        updateField("license_plate", e.target.value)
                      }
                      placeholder="Truck license plate number"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="license_state">License State *</Label>
                    <Select
                      value={formData.license_state}
                      onValueChange={(value) =>
                        updateField("license_state", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AL">Alabama</SelectItem>
                        <SelectItem value="AK">Alaska</SelectItem>
                        <SelectItem value="AZ">Arizona</SelectItem>
                        <SelectItem value="AR">Arkansas</SelectItem>
                        <SelectItem value="CA">California</SelectItem>
                        <SelectItem value="CO">Colorado</SelectItem>
                        <SelectItem value="CT">Connecticut</SelectItem>
                        <SelectItem value="DE">Delaware</SelectItem>
                        <SelectItem value="FL">Florida</SelectItem>
                        <SelectItem value="GA">Georgia</SelectItem>
                        <SelectItem value="HI">Hawaii</SelectItem>
                        <SelectItem value="ID">Idaho</SelectItem>
                        <SelectItem value="IL">Illinois</SelectItem>
                        <SelectItem value="IN">Indiana</SelectItem>
                        <SelectItem value="IA">Iowa</SelectItem>
                        <SelectItem value="KS">Kansas</SelectItem>
                        <SelectItem value="KY">Kentucky</SelectItem>
                        <SelectItem value="LA">Louisiana</SelectItem>
                        <SelectItem value="ME">Maine</SelectItem>
                        <SelectItem value="MD">Maryland</SelectItem>
                        <SelectItem value="MA">Massachusetts</SelectItem>
                        <SelectItem value="MI">Michigan</SelectItem>
                        <SelectItem value="MN">Minnesota</SelectItem>
                        <SelectItem value="MS">Mississippi</SelectItem>
                        <SelectItem value="MO">Missouri</SelectItem>
                        <SelectItem value="MT">Montana</SelectItem>
                        <SelectItem value="NE">Nebraska</SelectItem>
                        <SelectItem value="NV">Nevada</SelectItem>
                        <SelectItem value="NH">New Hampshire</SelectItem>
                        <SelectItem value="NJ">New Jersey</SelectItem>
                        <SelectItem value="NM">New Mexico</SelectItem>
                        <SelectItem value="NY">New York</SelectItem>
                        <SelectItem value="NC">North Carolina</SelectItem>
                        <SelectItem value="ND">North Dakota</SelectItem>
                        <SelectItem value="OH">Ohio</SelectItem>
                        <SelectItem value="OK">Oklahoma</SelectItem>
                        <SelectItem value="OR">Oregon</SelectItem>
                        <SelectItem value="PA">Pennsylvania</SelectItem>
                        <SelectItem value="RI">Rhode Island</SelectItem>
                        <SelectItem value="SC">South Carolina</SelectItem>
                        <SelectItem value="SD">South Dakota</SelectItem>
                        <SelectItem value="TN">Tennessee</SelectItem>
                        <SelectItem value="TX">Texas</SelectItem>
                        <SelectItem value="UT">Utah</SelectItem>
                        <SelectItem value="VT">Vermont</SelectItem>
                        <SelectItem value="VA">Virginia</SelectItem>
                        <SelectItem value="WA">Washington</SelectItem>
                        <SelectItem value="WV">West Virginia</SelectItem>
                        <SelectItem value="WI">Wisconsin</SelectItem>
                        <SelectItem value="WY">Wyoming</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="truck_type">Truck Type *</Label>
                    <Select
                      value={formData.truck_type}
                      onValueChange={(value) =>
                        updateField("truck_type", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select truck type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="End Dump">End Dump</SelectItem>
                        <SelectItem value="Tanker">Tanker</SelectItem>
                        <SelectItem value="Flatbed">Flatbed</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="capacity">Capacity (tons or barrels)</Label>
                    <Input
                      id="capacity"
                      type="number"
                      value={formData.capacity}
                      onChange={(e) => updateField("capacity", e.target.value)}
                      placeholder="Truck capacity"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gps_device_id">GPS Device ID</Label>
                    <Input
                      id="gps_device_id"
                      value={formData.gps_device_id}
                      onChange={(e) =>
                        updateField("gps_device_id", e.target.value)
                      }
                      placeholder="GPS device identifier"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="material_types_handled">
                      Material Types Handled
                    </Label>
                    <MultiSelect
                      value={formData.material_types_handled}
                      onValueChange={(value) =>
                        updateField("material_types_handled", value)
                      }
                      options={[
                        "Sand",
                        "Rock",
                        "Aggregate",
                        "Oil",
                        "Waste",
                        "Other",
                      ]}
                      placeholder="Select materials this truck can carry"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max_load_capacity">Max Load Capacity</Label>
                    <Input
                      id="max_load_capacity"
                      type="number"
                      value={formData.max_load_capacity}
                      onChange={(e) =>
                        updateField("max_load_capacity", e.target.value)
                      }
                      placeholder="Maximum allowed load"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vin">VIN *</Label>
                    <Input
                      id="vin"
                      value={formData.vin}
                      onChange={(e) => updateField("vin", e.target.value)}
                      placeholder="Vehicle Identification Number"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="is_on_insurance_policy">
                      Is this truck listed on your insurance policy? *
                    </Label>
                    <Select
                      value={formData.is_on_insurance_policy}
                      onValueChange={(value) =>
                        updateField("is_on_insurance_policy", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Yes or No" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              {/* Driver Details Tab */}
              <TabsContent value="driver_details" className="space-y-4 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Driver Details</h2>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={downloadDriverTemplate}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Template
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => driverCsvInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload CSV
                    </Button>
                    <input
                      ref={driverCsvInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleDriverCsvUpload}
                      className="hidden"
                    />
                  </div>
                </div>

                {driverCsvData.length > 0 && (
                  <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800">
                      <FileSpreadsheet className="h-5 w-5" />
                      <span className="font-medium">
                        {driverCsvData.length} driver records loaded from CSV
                      </span>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      These records will be submitted along with the form data.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="driver_name">Driver Name *</Label>
                    <Input
                      id="driver_name"
                      value={formData.driver_name}
                      onChange={(e) =>
                        updateField("driver_name", e.target.value)
                      }
                      placeholder="Full name as per license"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone_number">Phone Number *</Label>
                    <Input
                      id="phone_number"
                      type="tel"
                      value={formData.phone_number}
                      onChange={(e) =>
                        updateField("phone_number", e.target.value)
                      }
                      placeholder="Mobile phone for app login & alerts"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email_address">Email Address</Label>
                    <Input
                      id="email_address"
                      type="email"
                      value={formData.email_address}
                      onChange={(e) =>
                        updateField("email_address", e.target.value)
                      }
                      placeholder="Email for notifications (optional)"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cdl_number">CDL Number *</Label>
                    <Input
                      id="cdl_number"
                      value={formData.cdl_number}
                      onChange={(e) =>
                        updateField("cdl_number", e.target.value)
                      }
                      placeholder="Commercial Driver's License number"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="driver_type">Driver Type *</Label>
                    <Select
                      value={formData.driver_type}
                      onValueChange={(value) =>
                        updateField("driver_type", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select driver type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Company Driver">
                          Company Driver
                        </SelectItem>
                        <SelectItem value="Owner Operator">
                          Owner Operator
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="operating_hours">Operating Hours</Label>
                    <Input
                      id="operating_hours"
                      value={formData.operating_hours}
                      onChange={(e) =>
                        updateField("operating_hours", e.target.value)
                      }
                      placeholder="e.g., 7:00 AM - 5:00 PM"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="weekend_availability">
                      Weekend Availability
                    </Label>
                    <Select
                      value={formData.weekend_availability}
                      onValueChange={(value) =>
                        updateField("weekend_availability", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select availability" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="driver_comments">Comments</Label>
                    <Textarea
                      id="driver_comments"
                      value={formData.driver_comments}
                      onChange={(e) =>
                        updateField("driver_comments", e.target.value)
                      }
                      placeholder="Notes (e.g., shared between trucks, preferred shifts)"
                      rows={3}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </Card>

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={isFirstTab || isSubmitting}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            <div className="text-sm text-muted-foreground">
              Step {currentTabIndex + 1} of {tabOrder.length}
            </div>

            {!isLastTab ? (
              <Button onClick={handleNext} disabled={isSubmitting}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Submit
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default VendorOnboarding;
