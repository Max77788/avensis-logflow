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
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import Papa from "papaparse";
import { useAuth } from "@/contexts/AuthContext";

interface VendorFormData {
  // Company Details
  vendor_company_name: string;
  business_address: string;
  city: string;
  state: string;
  zip: string;
  certificate_of_insurance_expiry_date: string;
  legal_name_for_invoicing: string;
  mailing_address_optional: string;

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
  truck_type: string;
  capacity: string;
  gps_device_id: string;
  material_types_handled: string[];
  max_load_capacity: string;
  truck_state: string;
  vin_optional: string;

  // Driver Details
  driver_name: string;
  phone_number: string;
  email_address: string;
  license_number: string;
  employment_type: string;
  operating_hours: string;
  weekend_availability: string;
  driver_comments: string;

  // Compliance & Safety
  safety_training_completed: string;
  dot_compliance_date: string;
  driver_ppe_verification: string;
  emergency_contact: string;
  upload_insurance_documents: File | null;
}

const VendorOnboarding = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("company_details");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signature, setSignature] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fleetCsvInputRef = useRef<HTMLInputElement>(null);
  const driverCsvInputRef = useRef<HTMLInputElement>(null);

  // CSV upload state
  const [fleetCsvData, setFleetCsvData] = useState<any[]>([]);
  const [driverCsvData, setDriverCsvData] = useState<any[]>([]);

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
    certificate_of_insurance_expiry_date: "",
    legal_name_for_invoicing: "",
    mailing_address_optional: "",
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
    truck_type: "",
    capacity: "",
    gps_device_id: "",
    material_types_handled: [],
    max_load_capacity: "",
    truck_state: "",
    vin_optional: "",
    driver_name: "",
    phone_number: "",
    email_address: "",
    license_number: "",
    employment_type: "",
    operating_hours: "",
    weekend_availability: "",
    driver_comments: "",
    safety_training_completed: "",
    dot_compliance_date: "",
    driver_ppe_verification: "",
    emergency_contact: "",
    upload_insurance_documents: null,
  });

  const updateField = (field: keyof VendorFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Auto-populate company name in Contacts tab
    if (field === "vendor_company_name") {
      setFormData((prev) => ({ ...prev, company_name: value }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      updateField("upload_insurance_documents", file);
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

  const tabOrder = [
    "company_details",
    "contacts",
    "fleet_details",
    "driver_details",
    "compliance_and_safety",
  ];

  const currentTabIndex = tabOrder.indexOf(activeTab);
  const isLastTab = currentTabIndex === tabOrder.length - 1;
  const isFirstTab = currentTabIndex === 0;

  const handleNext = () => {
    if (!isLastTab) {
      setActiveTab(tabOrder[currentTabIndex + 1]);
    }
  };

  const handlePrevious = () => {
    if (!isFirstTab) {
      setActiveTab(tabOrder[currentTabIndex - 1]);
    }
  };

  const handleSubmit = async () => {
    if (!finalContractAccepted) {
      toast({
        title: "Contract Acceptance Required",
        description:
          "Please read and accept the Vendor Service Agreement on the Compliance & Safety tab",
        variant: "destructive",
      });
      setActiveTab("compliance_and_safety");
      return;
    }

    if (!signature) {
      toast({
        title: "Signature Required",
        description:
          "Please provide your signature on the Compliance & Safety tab",
        variant: "destructive",
      });
      setActiveTab("compliance_and_safety");
      return;
    }

    setIsSubmitting(true);

    try {
      // TODO: Implement actual submission logic
      console.log("Submitting vendor onboarding data:", formData);
      console.log("Fleet CSV data:", fleetCsvData);
      console.log("Driver CSV data:", driverCsvData);
      console.log("Initial contract accepted:", initialContractAccepted);
      console.log("Final contract accepted:", finalContractAccepted);
      console.log("Signature:", signature);

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
                      VENDOR SERVICE AGREEMENT
                    </h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      This Vendor Service Agreement ("Agreement") is entered
                      into between the Company and the Vendor identified in this
                      onboarding form.
                    </p>

                    <h5 className="font-semibold text-base mt-6 mb-3">
                      1. SCOPE OF SERVICES
                    </h5>
                    <p className="text-sm text-muted-foreground mb-4">
                      The Vendor agrees to provide transportation and logistics
                      services as requested by the Company, including but not
                      limited to the hauling of materials, equipment operation,
                      and compliance with all applicable regulations.
                    </p>

                    <h5 className="font-semibold text-base mt-6 mb-3">
                      2. COMPLIANCE AND SAFETY
                    </h5>
                    <p className="text-sm text-muted-foreground mb-4">
                      The Vendor certifies that all drivers, vehicles, and
                      equipment meet or exceed federal, state, and local safety
                      requirements. The Vendor agrees to maintain current
                      insurance, licenses, and certifications throughout the
                      term of this Agreement.
                    </p>

                    <h5 className="font-semibold text-base mt-6 mb-3">
                      3. INSURANCE REQUIREMENTS
                    </h5>
                    <p className="text-sm text-muted-foreground mb-4">
                      The Vendor shall maintain comprehensive general liability
                      insurance, commercial auto insurance, and workers'
                      compensation insurance as required by law. Proof of
                      insurance must be provided and kept current.
                    </p>

                    <h5 className="font-semibold text-base mt-6 mb-3">
                      4. INDEMNIFICATION
                    </h5>
                    <p className="text-sm text-muted-foreground mb-4">
                      The Vendor agrees to indemnify and hold harmless the
                      Company from any claims, damages, or liabilities arising
                      from the Vendor's performance of services under this
                      Agreement.
                    </p>

                    <h5 className="font-semibold text-base mt-6 mb-3">
                      5. TERMINATION
                    </h5>
                    <p className="text-sm text-muted-foreground mb-4">
                      Either party may terminate this Agreement with written
                      notice. The Company reserves the right to terminate
                      immediately for cause, including safety violations or
                      breach of contract terms.
                    </p>

                    <h5 className="font-semibold text-base mt-6 mb-3">
                      6. DATA PRIVACY AND CONFIDENTIALITY
                    </h5>
                    <p className="text-sm text-muted-foreground mb-4">
                      The Vendor agrees to maintain the confidentiality of all
                      Company information and comply with applicable data
                      privacy regulations.
                    </p>

                    <p className="text-sm text-muted-foreground mt-8 italic">
                      [Additional contract terms and conditions will be provided
                      by the Company]
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
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-5 h-auto">
                <TabsTrigger
                  value="company_details"
                  className="flex flex-col items-center gap-1 py-3"
                >
                  <Building2 className="h-4 w-4" />
                  <span className="text-xs">Company</span>
                </TabsTrigger>
                <TabsTrigger
                  value="contacts"
                  className="flex flex-col items-center gap-1 py-3"
                >
                  <Users className="h-4 w-4" />
                  <span className="text-xs">Contacts</span>
                </TabsTrigger>
                <TabsTrigger
                  value="fleet_details"
                  className="flex flex-col items-center gap-1 py-3"
                >
                  <Truck className="h-4 w-4" />
                  <span className="text-xs">Fleet</span>
                </TabsTrigger>
                <TabsTrigger
                  value="driver_details"
                  className="flex flex-col items-center gap-1 py-3"
                >
                  <UserCircle className="h-4 w-4" />
                  <span className="text-xs">Driver</span>
                </TabsTrigger>
                <TabsTrigger
                  value="compliance_and_safety"
                  className="flex flex-col items-center gap-1 py-3"
                >
                  <Shield className="h-4 w-4" />
                  <span className="text-xs">Compliance</span>
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
                    <Label htmlFor="certificate_of_insurance_expiry_date">
                      Certificate of Insurance Expiry Date
                    </Label>
                    <Input
                      id="certificate_of_insurance_expiry_date"
                      type="date"
                      value={formData.certificate_of_insurance_expiry_date}
                      onChange={(e) =>
                        updateField(
                          "certificate_of_insurance_expiry_date",
                          e.target.value
                        )
                      }
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
                </div>
              </TabsContent>

              {/* Contacts Tab */}
              <TabsContent value="contacts" className="space-y-4 p-6">
                <h2 className="text-xl font-semibold mb-4">Contacts</h2>

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
                    <Label htmlFor="truck_state">Truck State *</Label>
                    <Select
                      value={formData.truck_state}
                      onValueChange={(value) =>
                        updateField("truck_state", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select ownership status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Owned">Owned</SelectItem>
                        <SelectItem value="Leased">Leased</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="vin_optional">VIN (optional)</Label>
                    <Input
                      id="vin_optional"
                      value={formData.vin_optional}
                      onChange={(e) =>
                        updateField("vin_optional", e.target.value)
                      }
                      placeholder="Vehicle Identification Number for audits"
                    />
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
                    <Label htmlFor="license_number">License Number</Label>
                    <Input
                      id="license_number"
                      value={formData.license_number}
                      onChange={(e) =>
                        updateField("license_number", e.target.value)
                      }
                      placeholder="Driver license number (optional)"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="employment_type">Employment Type *</Label>
                    <Select
                      value={formData.employment_type}
                      onValueChange={(value) =>
                        updateField("employment_type", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select employment type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Direct">Direct</SelectItem>
                        <SelectItem value="Contractor">Contractor</SelectItem>
                        <SelectItem value="Lease Operator">
                          Lease Operator
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

              {/* Compliance & Safety Tab */}
              <TabsContent
                value="compliance_and_safety"
                className="space-y-4 p-6"
              >
                <h2 className="text-xl font-semibold mb-4">
                  Compliance & Safety
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="safety_training_completed">
                      Safety Training Completed *
                    </Label>
                    <Select
                      value={formData.safety_training_completed}
                      onValueChange={(value) =>
                        updateField("safety_training_completed", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dot_compliance_date">
                      DOT Compliance Date
                    </Label>
                    <Input
                      id="dot_compliance_date"
                      type="date"
                      value={formData.dot_compliance_date}
                      onChange={(e) =>
                        updateField("dot_compliance_date", e.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="driver_ppe_verification">
                      Driver PPE Verification *
                    </Label>
                    <Select
                      value={formData.driver_ppe_verification}
                      onValueChange={(value) =>
                        updateField("driver_ppe_verification", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="emergency_contact">Emergency Contact</Label>
                    <Input
                      id="emergency_contact"
                      value={formData.emergency_contact}
                      onChange={(e) =>
                        updateField("emergency_contact", e.target.value)
                      }
                      placeholder="Emergency contact name and phone number"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="upload_insurance_documents">
                      Upload Insurance / W-9 / COI
                    </Label>
                    <Input
                      ref={fileInputRef}
                      id="upload_insurance_documents"
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground">
                      Upload insurance documents, W-9, and certificate of
                      insurance
                    </p>
                    {formData.upload_insurance_documents && (
                      <p className="text-sm text-primary">
                        Selected: {formData.upload_insurance_documents.name}
                      </p>
                    )}
                  </div>

                  {/* Contract Agreement Section */}
                  <div className="space-y-2 md:col-span-2 mt-6">
                    <div className="border-t pt-6">
                      <h3 className="text-lg font-semibold mb-4">
                        Vendor Agreement
                      </h3>
                      <div className="bg-muted p-6 rounded-lg max-h-96 overflow-y-auto mb-4">
                        <div className="prose prose-sm max-w-none">
                          <h4 className="font-semibold text-base mb-3">
                            VENDOR SERVICE AGREEMENT
                          </h4>
                          <p className="text-sm text-muted-foreground mb-4">
                            This Vendor Service Agreement ("Agreement") is
                            entered into between the Company and the Vendor
                            identified in this onboarding form.
                          </p>

                          <h5 className="font-semibold text-sm mt-4 mb-2">
                            1. SCOPE OF SERVICES
                          </h5>
                          <p className="text-sm text-muted-foreground mb-3">
                            The Vendor agrees to provide transportation and
                            logistics services as requested by the Company,
                            including but not limited to the hauling of
                            materials, equipment operation, and compliance with
                            all applicable regulations.
                          </p>

                          <h5 className="font-semibold text-sm mt-4 mb-2">
                            2. COMPLIANCE AND SAFETY
                          </h5>
                          <p className="text-sm text-muted-foreground mb-3">
                            The Vendor certifies that all drivers, vehicles, and
                            equipment meet or exceed federal, state, and local
                            safety requirements. The Vendor agrees to maintain
                            current insurance, licenses, and certifications
                            throughout the term of this Agreement.
                          </p>

                          <h5 className="font-semibold text-sm mt-4 mb-2">
                            3. INSURANCE REQUIREMENTS
                          </h5>
                          <p className="text-sm text-muted-foreground mb-3">
                            The Vendor shall maintain comprehensive general
                            liability insurance, commercial auto insurance, and
                            workers' compensation insurance as required by law.
                            Proof of insurance must be provided and kept
                            current.
                          </p>

                          <h5 className="font-semibold text-sm mt-4 mb-2">
                            4. INDEMNIFICATION
                          </h5>
                          <p className="text-sm text-muted-foreground mb-3">
                            The Vendor agrees to indemnify and hold harmless the
                            Company from any claims, damages, or liabilities
                            arising from the Vendor's performance of services
                            under this Agreement.
                          </p>

                          <h5 className="font-semibold text-sm mt-4 mb-2">
                            5. TERMINATION
                          </h5>
                          <p className="text-sm text-muted-foreground mb-3">
                            Either party may terminate this Agreement with
                            written notice. The Company reserves the right to
                            terminate immediately for cause, including safety
                            violations or breach of contract terms.
                          </p>

                          <p className="text-sm text-muted-foreground mt-6 italic">
                            [Additional contract terms and conditions will be
                            provided by the Company]
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3 mb-6">
                        <Checkbox
                          id="contract-acceptance"
                          checked={finalContractAccepted}
                          onCheckedChange={(checked) =>
                            setFinalContractAccepted(checked as boolean)
                          }
                        />
                        <div className="grid gap-1.5 leading-none">
                          <label
                            htmlFor="contract-acceptance"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            I have read and agree to the terms of this Vendor
                            Service Agreement *
                          </label>
                          <p className="text-sm text-muted-foreground">
                            By checking this box, you acknowledge that you have
                            read, understood, and agree to be bound by the terms
                            and conditions outlined above.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Signature Section */}
                  <div className="space-y-2 md:col-span-2 mt-6">
                    <div className="border-t pt-6">
                      <h3 className="text-lg font-semibold mb-4">
                        Signature *
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Please sign below to confirm all information provided is
                        accurate and complete.
                      </p>
                      <div className="bg-background rounded-lg">
                        <SignaturePad
                          onSave={(data) => setSignature(data)}
                          label="Vendor Signature"
                        />
                      </div>
                      {signature && (
                        <div className="mt-4">
                          <p className="text-sm font-medium mb-2">
                            Signature Preview:
                          </p>
                          <img
                            src={signature}
                            alt="Signature"
                            className="h-32 w-full rounded border border-border object-contain bg-white"
                          />
                        </div>
                      )}
                    </div>
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
