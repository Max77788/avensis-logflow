import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Header } from "@/components/Header";
import { ApplicationStatusBadge } from "@/components/driver-onboarding/ApplicationStatusBadge";
import { ActivityLog } from "@/components/driver-onboarding/ActivityLog";
import { DocumentUpload } from "@/components/driver-onboarding/DocumentUpload";
import { driverOnboardingService } from "@/lib/driverOnboardingService";
import type {
  ApplicationWithDetails,
  DriverApplicationActivity,
  ApplicationStatus,
} from "@/lib/driverOnboardingTypes";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Calendar,
  Save,
  Loader2,
  CheckCircle,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

const ApplicationDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [application, setApplication] = useState<ApplicationWithDetails | null>(
    null
  );
  const [activities, setActivities] = useState<DriverApplicationActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Verification tab state
  const [verificationOutcome, setVerificationOutcome] =
    useState<ApplicationStatus>("CONTACTED");
  const [verificationNotes, setVerificationNotes] = useState("");
  const [isSubmittingVerification, setIsSubmittingVerification] =
    useState(false);

  // MVR tab state
  const [mvrEligible, setMvrEligible] = useState(true);
  const [mvrSummary, setMvrSummary] = useState("");
  const [isSubmittingMVR, setIsSubmittingMVR] = useState(false);

  // Drug test tab state
  const [drugTestProvider, setDrugTestProvider] = useState("");
  const [drugTestSite, setDrugTestSite] = useState("");
  const [drugTestDate, setDrugTestDate] = useState("");
  const [isCreatingDrugTest, setIsCreatingDrugTest] = useState(false);

  // New lead form state
  const [newLeadForm, setNewLeadForm] = useState({
    name: "",
    phone: "",
    email: "",
    zip_code: "",
    source: "",
    position_type: "",
    yard_id: "",
  });
  const [isCreatingLead, setIsCreatingLead] = useState(false);
  const [yards, setYards] = useState<Array<{ id: string; name: string }>>([]);

  // Onboarding state
  const [orientationDate, setOrientationDate] = useState("");
  const [orientationNotes, setOrientationNotes] = useState("");
  const [isSchedulingOrientation, setIsSchedulingOrientation] = useState(false);
  const [isCompletingOrientation, setIsCompletingOrientation] = useState(false);

  const [trainingStartDate, setTrainingStartDate] = useState("");
  const [trainingEndDate, setTrainingEndDate] = useState("");
  const [isSchedulingTraining, setIsSchedulingTraining] = useState(false);
  const [trainingRating, setTrainingRating] = useState(5);
  const [trainingCompletionNotes, setTrainingCompletionNotes] = useState("");
  const [isCompletingTraining, setIsCompletingTraining] = useState(false);

  const [isHiring, setIsHiring] = useState(false);

  useEffect(() => {
    if (id && id !== "new") {
      loadApplication();
      loadActivities();
    } else if (id === "new") {
      // For new applications, load yards and set loading to false
      loadYards();
      setIsLoading(false);
    }
  }, [id]);

  const loadYards = async () => {
    const result = await driverOnboardingService.getYards();
    if (result.success && result.data) {
      setYards(result.data);
    }
  };

  const loadApplication = async () => {
    if (!id || id === "new") return;

    setIsLoading(true);
    const result = await driverOnboardingService.getApplicationById(id);
    if (result.success && result.data) {
      setApplication(result.data);
      setNotes(result.data.application.notes || "");
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to load application",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const loadActivities = async () => {
    if (!id || id === "new") return;

    const result = await driverOnboardingService.getApplicationActivities(id);
    if (result.success && result.data) {
      setActivities(result.data);
    }
  };

  const handleSaveNotes = async () => {
    if (!id || id === "new") return;

    setIsSavingNotes(true);
    const result = await driverOnboardingService.updateApplicationNotes(
      id,
      notes
    );
    if (result.success) {
      toast({
        title: "Success",
        description: "Notes saved successfully",
      });
      loadApplication();
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to save notes",
        variant: "destructive",
      });
    }
    setIsSavingNotes(false);
  };

  const handleSubmitVerification = async () => {
    if (!id || id === "new") return;

    setIsSubmittingVerification(true);
    const result = await driverOnboardingService.submitInitialVerification(id, {
      call_outcome: verificationOutcome,
      notes: verificationNotes,
    });
    if (result.success) {
      toast({
        title: "Success",
        description: "Verification submitted successfully",
      });
      loadApplication();
      loadActivities();
      setVerificationNotes("");
      // Stay on verification tab
      setActiveTab("verification");
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to submit verification",
        variant: "destructive",
      });
    }
    setIsSubmittingVerification(false);
  };

  const handleDocumentUpload = async (
    documentType: "dl" | "medical_card" | "ssn",
    fileUrl: string
  ) => {
    if (!application?.compliance) return;

    const result = await driverOnboardingService.updateDocumentVerification(
      id!,
      application.compliance.id,
      documentType,
      false,
      fileUrl
    );

    if (result.success) {
      loadApplication();
      loadActivities();
      // Switch to documents tab after upload
      setActiveTab("documents");
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to update document",
        variant: "destructive",
      });
    }
  };

  const handleDocumentVerificationChange = async (
    documentType: "dl" | "medical_card" | "ssn",
    verified: boolean
  ) => {
    if (!application?.compliance) return;

    const result = await driverOnboardingService.updateDocumentVerification(
      id!,
      application.compliance.id,
      documentType,
      verified
    );

    if (result.success) {
      toast({
        title: "Success",
        description: `Document ${verified ? "verified" : "unverified"}`,
      });
      loadApplication();
      loadActivities();
      // Stay on documents tab
      setActiveTab("documents");
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to update verification",
        variant: "destructive",
      });
    }
  };

  const handleMarkAllDocsVerified = async () => {
    if (!id || id === "new") return;

    const result = await driverOnboardingService.markDocumentsVerified(id);
    if (result.success) {
      toast({
        title: "Success",
        description: "All documents marked as verified",
      });
      loadApplication();
      loadActivities();
      // Stay on documents tab
      setActiveTab("documents");
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to mark documents verified",
        variant: "destructive",
      });
    }
  };

  const handleRequestMVR = async () => {
    if (!id || id === "new") return;

    const result = await driverOnboardingService.markMVRRequested(id);
    if (result.success) {
      toast({
        title: "Success",
        description: "MVR requested successfully",
      });
      loadApplication();
      loadActivities();
      // Stay on compliance tab
      setActiveTab("compliance");
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to request MVR",
        variant: "destructive",
      });
    }
  };

  const handleSubmitMVR = async () => {
    if (!id || id === "new") return;

    setIsSubmittingMVR(true);
    const result = await driverOnboardingService.markMVRCompleted(id, {
      eligible: mvrEligible,
      summary: mvrSummary,
    });
    if (result.success) {
      toast({
        title: "Success",
        description: `MVR marked as ${mvrEligible ? "passed" : "failed"}`,
      });
      loadApplication();
      loadActivities();
      setMvrSummary("");
      // Stay on compliance tab
      setActiveTab("compliance");
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to submit MVR result",
        variant: "destructive",
      });
    }
    setIsSubmittingMVR(false);
  };

  const handleCreateDrugTest = async () => {
    if (!id || id === "new") return;

    setIsCreatingDrugTest(true);
    const result = await driverOnboardingService.createDrugTestOrder(id, {
      provider: drugTestProvider,
      site: drugTestSite,
      scheduled_date: drugTestDate || undefined,
    });
    if (result.success) {
      toast({
        title: "Success",
        description: "Drug test order created",
      });
      loadApplication();
      loadActivities();
      setDrugTestProvider("");
      setDrugTestSite("");
      setDrugTestDate("");
      // Stay on compliance tab
      setActiveTab("compliance");
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to create drug test order",
        variant: "destructive",
      });
    }
    setIsCreatingDrugTest(false);
  };

  const handleCreateLead = async () => {
    if (!newLeadForm.name.trim() || !newLeadForm.phone.trim()) {
      toast({
        title: "Validation Error",
        description: "Name and phone are required",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingLead(true);
    const result = await driverOnboardingService.createLead(newLeadForm);

    if (result.success && result.data) {
      toast({
        title: "Success",
        description: "New lead created successfully",
      });
      // Navigate to the newly created application
      navigate(`/driver-onboarding/application/${result.data.application_id}`);
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to create lead",
        variant: "destructive",
      });
    }
    setIsCreatingLead(false);
  };

  const handleDrugTestResult = async (
    result: "NEGATIVE" | "POSITIVE" | "NO_SHOW"
  ) => {
    if (!id || id === "new") return;

    const response = await driverOnboardingService.markDrugTestResult(
      id,
      result
    );
    if (response.success) {
      toast({
        title: "Success",
        description: `Drug test result recorded: ${result}`,
      });
      loadApplication();
      loadActivities();
      // Stay on compliance tab
      setActiveTab("compliance");
    } else {
      toast({
        title: "Error",
        description: response.error || "Failed to record drug test result",
        variant: "destructive",
      });
    }
  };

  // Onboarding handlers
  const handleScheduleOrientation = async () => {
    if (!id || id === "new" || !orientationDate) {
      toast({
        title: "Validation Error",
        description: "Please select a date and time for orientation",
        variant: "destructive",
      });
      return;
    }

    setIsSchedulingOrientation(true);
    const result = await driverOnboardingService.scheduleOrientation(id, {
      supervisor_id: undefined, // TODO: Add supervisor selection
      scheduled_at: orientationDate,
    });

    if (result.success) {
      toast({
        title: "Success",
        description: "Orientation scheduled successfully",
      });
      loadApplication();
      loadActivities();
      setOrientationDate("");
      // Stay on onboarding tab
      setActiveTab("onboarding");
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to schedule orientation",
        variant: "destructive",
      });
    }
    setIsSchedulingOrientation(false);
  };

  const handleCompleteOrientation = async () => {
    if (!id || id === "new") return;

    setIsCompletingOrientation(true);
    const result = await driverOnboardingService.completeOrientation(
      id,
      orientationNotes
    );

    if (result.success) {
      toast({
        title: "Success",
        description: "Orientation marked as completed",
      });
      loadApplication();
      loadActivities();
      setOrientationNotes("");
      // Stay on onboarding tab
      setActiveTab("onboarding");
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to complete orientation",
        variant: "destructive",
      });
    }
    setIsCompletingOrientation(false);
  };

  const handleScheduleTraining = async () => {
    if (!id || id === "new" || !trainingStartDate || !trainingEndDate) {
      toast({
        title: "Validation Error",
        description: "Please select start and end dates for training",
        variant: "destructive",
      });
      return;
    }

    setIsSchedulingTraining(true);
    const result = await driverOnboardingService.scheduleTraining(id, {
      mentor_id: undefined, // TODO: Add mentor selection
      scheduled_start: trainingStartDate,
      scheduled_end: trainingEndDate,
    });

    if (result.success) {
      toast({
        title: "Success",
        description: "Training scheduled successfully",
      });
      loadApplication();
      loadActivities();
      setTrainingStartDate("");
      setTrainingEndDate("");
      // Stay on onboarding tab
      setActiveTab("onboarding");
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to schedule training",
        variant: "destructive",
      });
    }
    setIsSchedulingTraining(false);
  };

  const handleCompleteTraining = async () => {
    if (!id || id === "new") return;

    setIsCompletingTraining(true);
    const result = await driverOnboardingService.completeTraining(id, {
      rating: trainingRating,
      notes: trainingCompletionNotes,
    });

    if (result.success) {
      toast({
        title: "Success",
        description: "Training marked as completed",
      });
      loadApplication();
      loadActivities();
      setTrainingCompletionNotes("");
      // Stay on onboarding tab
      setActiveTab("onboarding");
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to complete training",
        variant: "destructive",
      });
    }
    setIsCompletingTraining(false);
  };

  const handleApproveAndHire = async () => {
    if (!id || id === "new") return;

    setIsHiring(true);
    const result = await driverOnboardingService.approveAndHire(id);

    if (result.success) {
      toast({
        title: "Success",
        description: "Candidate approved and hired!",
      });
      loadApplication();
      loadActivities();
      // Stay on onboarding tab
      setActiveTab("onboarding");
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to approve and hire",
        variant: "destructive",
      });
    }
    setIsHiring(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header showHomeButton onHomeClick={() => navigate("/home")} />
        <main className="container mx-auto px-4 py-8 flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </main>
      </div>
    );
  }

  // Show new lead form when id is "new"
  if (id === "new") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header showHomeButton onHomeClick={() => navigate("/home")} />
        <main className="container mx-auto px-4 py-8 flex-1">
          <div className="mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/driver-onboarding/pipeline")}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Pipeline
            </Button>
            <h2 className="text-2xl font-bold">Create New Lead</h2>
          </div>

          <Card className="max-w-2xl p-6">
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={newLeadForm.name}
                  onChange={(e) =>
                    setNewLeadForm({ ...newLeadForm, name: e.target.value })
                  }
                  placeholder="Enter candidate name"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  value={newLeadForm.phone}
                  onChange={(e) =>
                    setNewLeadForm({ ...newLeadForm, phone: e.target.value })
                  }
                  placeholder="Enter phone number"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newLeadForm.email}
                  onChange={(e) =>
                    setNewLeadForm({ ...newLeadForm, email: e.target.value })
                  }
                  placeholder="Enter email address"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="zip_code">ZIP Code</Label>
                <Input
                  id="zip_code"
                  value={newLeadForm.zip_code}
                  onChange={(e) =>
                    setNewLeadForm({ ...newLeadForm, zip_code: e.target.value })
                  }
                  placeholder="Enter ZIP code"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="source">Source</Label>
                <Input
                  id="source"
                  value={newLeadForm.source}
                  onChange={(e) =>
                    setNewLeadForm({ ...newLeadForm, source: e.target.value })
                  }
                  placeholder="e.g., Indeed, Referral, Walk-in"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="position_type">Position Type</Label>
                <Input
                  id="position_type"
                  value={newLeadForm.position_type}
                  onChange={(e) =>
                    setNewLeadForm({
                      ...newLeadForm,
                      position_type: e.target.value,
                    })
                  }
                  placeholder="e.g., CDL Driver, Yard Driver"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="yard">Yard</Label>
                <Select
                  value={newLeadForm.yard_id}
                  onValueChange={(value) =>
                    setNewLeadForm({ ...newLeadForm, yard_id: value })
                  }
                >
                  <SelectTrigger id="yard">
                    <SelectValue placeholder="Select a yard (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {yards.map((yard) => (
                      <SelectItem key={yard.id} value={yard.id}>
                        {yard.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleCreateLead}
                  disabled={
                    isCreatingLead ||
                    !newLeadForm.name.trim() ||
                    !newLeadForm.phone.trim()
                  }
                  className="flex-1"
                >
                  {isCreatingLead ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Create Lead
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/driver-onboarding/pipeline")}
                  disabled={isCreatingLead}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header showHomeButton onHomeClick={() => navigate("/home")} />
        <main className="container mx-auto px-4 py-8 flex-1">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Application not found</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate("/driver-onboarding/pipeline")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Pipeline
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header showHomeButton onHomeClick={() => navigate("/home")} />
      <main className="container mx-auto px-4 py-8 flex-1">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/driver-onboarding/pipeline")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Pipeline
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">
                {application.candidate.name}
              </h2>
              <ApplicationStatusBadge status={application.application.status} />
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4 gap-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="verification">Verification</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Candidate Info */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Candidate Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-medium">
                        {application.candidate.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {application.candidate.phone}
                      </p>
                    </div>
                    {application.candidate.email && (
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {application.candidate.email}
                        </p>
                      </div>
                    )}
                    {application.candidate.zip_code && (
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Zip Code
                        </p>
                        <p className="font-medium flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {application.candidate.zip_code}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Application Info */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Application Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Yard</p>
                      <p className="font-medium">
                        {application.yard?.name || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Position</p>
                      <p className="font-medium">
                        {application.application.position_type || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Source</p>
                      <p className="font-medium">
                        {application.candidate.source || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Applied</p>
                      <p className="font-medium flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(
                          new Date(application.application.created_at),
                          "MMM d, yyyy"
                        )}
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Notes */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Notes</h3>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes about this candidate..."
                    className="min-h-[120px] mb-3"
                  />
                  <Button
                    onClick={handleSaveNotes}
                    disabled={isSavingNotes}
                    size="sm"
                  >
                    {isSavingNotes ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Notes
                  </Button>
                </Card>
              </div>

              {/* Activity Log */}
              <div className="lg:col-span-1">
                <ActivityLog activities={activities} />
              </div>
            </div>
          </TabsContent>

          {/* Verification Tab */}
          <TabsContent value="verification">
            <Card className="p-6 max-w-2xl">
              <h3 className="text-lg font-semibold mb-4">
                Initial Verification Call
              </h3>

              {application.application.initial_verification_call_at && (
                <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <p className="font-medium">Verification Completed</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {format(
                      new Date(
                        application.application.initial_verification_call_at
                      ),
                      "MMM d, yyyy 'at' h:mm a"
                    )}
                  </p>
                  {(() => {
                    // Find the verification activity to get the call outcome
                    const verificationActivity = activities.find(
                      (activity) =>
                        activity.event_type === "INITIAL_VERIFICATION"
                    );
                    const outcomeMatch =
                      verificationActivity?.event_description.match(
                        /completed - (CONTACTED|REJECTED|DOCS_PENDING)/
                      );
                    const outcome = outcomeMatch ? outcomeMatch[1] : null;

                    return outcome ? (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm font-medium mb-1">
                          Call Outcome:
                        </p>
                        <p className="text-sm">
                          {outcome === "CONTACTED" && (
                            <span className="inline-flex items-center gap-1 text-green-600">
                              <CheckCircle className="h-4 w-4" />
                              Contacted - Interested
                            </span>
                          )}
                          {outcome === "REJECTED" && (
                            <span className="inline-flex items-center gap-1 text-red-600">
                              <XCircle className="h-4 w-4" />
                              Not Interested / Rejected
                            </span>
                          )}
                          {outcome === "DOCS_PENDING" && (
                            <span className="inline-flex items-center gap-1 text-blue-600">
                              <CheckCircle className="h-4 w-4" />
                              Interested - Docs Pending
                            </span>
                          )}
                        </p>
                      </div>
                    ) : null;
                  })()}
                  {application.application.initial_verification_notes && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm font-medium mb-1">Notes:</p>
                      <p className="text-sm text-muted-foreground">
                        {application.application.initial_verification_notes}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <Label htmlFor="verification-outcome">Call Outcome</Label>
                  <Select
                    value={verificationOutcome}
                    onValueChange={(value) =>
                      setVerificationOutcome(value as ApplicationStatus)
                    }
                  >
                    <SelectTrigger id="verification-outcome" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CONTACTED">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          Contacted - Interested
                        </div>
                      </SelectItem>
                      <SelectItem value="REJECTED">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-red-600" />
                          Not Interested / Rejected
                        </div>
                      </SelectItem>
                      <SelectItem value="DOCS_PENDING">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-blue-600" />
                          Interested - Docs Pending
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="verification-notes">Call Notes</Label>
                  <Textarea
                    id="verification-notes"
                    value={verificationNotes}
                    onChange={(e) => setVerificationNotes(e.target.value)}
                    placeholder="Enter notes from the verification call..."
                    className="mt-1 min-h-[120px]"
                  />
                </div>

                <Button
                  onClick={handleSubmitVerification}
                  disabled={
                    isSubmittingVerification || !verificationNotes.trim()
                  }
                  className="w-full"
                >
                  {isSubmittingVerification ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Submit Verification
                </Button>
              </div>
            </Card>
          </TabsContent>
          {/* Documents Tab */}
          <TabsContent value="documents">
            <div className="max-w-2xl space-y-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Required Documents
                </h3>
                <div className="space-y-4">
                  <DocumentUpload
                    label="Driver's License"
                    documentType="dl"
                    candidateId={application.candidate.id}
                    complianceId={application.compliance?.id || ""}
                    currentFileUrl={
                      application.compliance?.drivers_license_url || undefined
                    }
                    isVerified={
                      application.compliance?.drivers_license_verified || false
                    }
                    onUploadComplete={(url) => handleDocumentUpload("dl", url)}
                    onVerificationChange={(verified) =>
                      handleDocumentVerificationChange("dl", verified)
                    }
                  />
                  <DocumentUpload
                    label="Medical Card"
                    documentType="medical_card"
                    candidateId={application.candidate.id}
                    complianceId={application.compliance?.id || ""}
                    currentFileUrl={
                      application.compliance?.medical_card_url || undefined
                    }
                    isVerified={
                      application.compliance?.medical_card_verified || false
                    }
                    onUploadComplete={(url) =>
                      handleDocumentUpload("medical_card", url)
                    }
                    onVerificationChange={(verified) =>
                      handleDocumentVerificationChange("medical_card", verified)
                    }
                  />
                  <DocumentUpload
                    label="Social Security Card"
                    documentType="ssn"
                    candidateId={application.candidate.id}
                    complianceId={application.compliance?.id || ""}
                    currentFileUrl={
                      application.compliance?.ssn_url || undefined
                    }
                    isVerified={application.compliance?.ssn_verified || false}
                    onUploadComplete={(url) => handleDocumentUpload("ssn", url)}
                    onVerificationChange={(verified) =>
                      handleDocumentVerificationChange("ssn", verified)
                    }
                  />
                </div>

                {application.compliance?.drivers_license_verified &&
                  application.compliance?.medical_card_verified &&
                  application.compliance?.ssn_verified && (
                    <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 text-green-800">
                        <CheckCircle className="h-5 w-5" />
                        <p className="font-medium">All documents verified</p>
                      </div>
                    </div>
                  )}

                {application.compliance?.drivers_license_verified &&
                  application.compliance?.medical_card_verified &&
                  application.compliance?.ssn_verified &&
                  application.application.status !== "DOCS_VERIFIED" && (
                    <Button
                      onClick={handleMarkAllDocsVerified}
                      className="w-full mt-4"
                    >
                      Mark Documents Complete & Move to Next Stage
                    </Button>
                  )}
              </Card>
            </div>
          </TabsContent>
          {/* Compliance Tab */}
          <TabsContent value="compliance">
            <div className="max-w-2xl space-y-6">
              {/* MVR Section */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Motor Vehicle Record (MVR)
                </h3>

                {application.compliance?.mvr_requested_at && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm text-blue-800">
                      MVR requested on{" "}
                      {format(
                        new Date(application.compliance.mvr_requested_at),
                        "MMM d, yyyy"
                      )}
                    </p>
                  </div>
                )}

                {application.compliance?.mvr_completed_at ? (
                  <div className="space-y-3">
                    <div
                      className={`p-4 rounded-lg border ${
                        application.compliance.mvr_eligible
                          ? "bg-green-50 border-green-200"
                          : "bg-red-50 border-red-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {application.compliance.mvr_eligible ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                        <p className="font-medium text-black">
                          {application.compliance.mvr_eligible
                            ? "MVR Passed"
                            : "MVR Failed"}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Completed on{" "}
                        {format(
                          new Date(application.compliance.mvr_completed_at),
                          "MMM d, yyyy"
                        )}
                      </p>
                      {application.compliance.mvr_summary && (
                        <div className="mt-3 pt-3 text-black border-t">
                          <p className="text-sm font-medium mb-1">Summary:</p>
                          <p className="text-sm">
                            {application.compliance.mvr_summary}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {!application.compliance?.mvr_requested_at && (
                      <Button onClick={handleRequestMVR} className="w-full">
                        Request MVR
                      </Button>
                    )}

                    {application.compliance?.mvr_requested_at && (
                      <>
                        <div>
                          <Label>MVR Result</Label>
                          <Select
                            value={mvrEligible ? "eligible" : "not_eligible"}
                            onValueChange={(value) =>
                              setMvrEligible(value === "eligible")
                            }
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="eligible">
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                  Eligible / Passed
                                </div>
                              </SelectItem>
                              <SelectItem value="not_eligible">
                                <div className="flex items-center gap-2">
                                  <XCircle className="h-4 w-4 text-red-600" />
                                  Not Eligible / Failed
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="mvr-summary">MVR Summary</Label>
                          <Textarea
                            id="mvr-summary"
                            value={mvrSummary}
                            onChange={(e) => setMvrSummary(e.target.value)}
                            placeholder="Enter MVR summary or notes..."
                            className="mt-1 min-h-[100px]"
                          />
                        </div>

                        <Button
                          onClick={handleSubmitMVR}
                          disabled={isSubmittingMVR}
                          className="w-full"
                        >
                          {isSubmittingMVR ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4 mr-2" />
                          )}
                          Submit MVR Result
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </Card>

              {/* Drug Test Section */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Drug Test</h3>

                {application.compliance?.drug_test_result ? (
                  <div
                    className={`p-4 rounded-lg border ${
                      application.compliance.drug_test_result === "NEGATIVE"
                        ? "bg-green-50 border-green-200"
                        : "bg-red-50 border-red-200"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2 text-black">
                      {application.compliance.drug_test_result ===
                      "NEGATIVE" ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <p className="font-medium">
                        Result: {application.compliance.drug_test_result}
                      </p>
                    </div>
                    {application.compliance.drug_test_completed_at && (
                      <p className="text-sm text-muted-foreground">
                        Completed on{" "}
                        {format(
                          new Date(
                            application.compliance.drug_test_completed_at
                          ),
                          "MMM d, yyyy"
                        )}
                      </p>
                    )}
                  </div>
                ) : application.compliance?.drug_test_ordered_at ? (
                  <div className="space-y-4">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                      <p className="text-sm font-medium text-blue-800 mb-2">
                        Drug Test Ordered
                      </p>
                      <div className="text-sm text-blue-700 space-y-1">
                        <p>
                          Provider: {application.compliance.drug_test_provider}
                        </p>
                        <p>Site: {application.compliance.drug_test_site}</p>
                        {application.compliance.drug_test_scheduled_date && (
                          <p>
                            Scheduled:{" "}
                            {format(
                              new Date(
                                application.compliance.drug_test_scheduled_date
                              ),
                              "MMM d, yyyy"
                            )}
                          </p>
                        )}
                        {application.compliance.drug_test_expires_at && (
                          <p>
                            Expires:{" "}
                            {format(
                              new Date(
                                application.compliance.drug_test_expires_at
                              ),
                              "MMM d, yyyy"
                            )}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Record Test Result</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          variant="outline"
                          onClick={() => handleDrugTestResult("NEGATIVE")}
                          className="border-green-200 hover:bg-green-50"
                        >
                          <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                          Negative
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleDrugTestResult("POSITIVE")}
                          className="border-red-200 hover:bg-red-50"
                        >
                          <XCircle className="h-4 w-4 mr-1 text-red-600" />
                          Positive
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleDrugTestResult("NO_SHOW")}
                          className="border-orange-200 hover:bg-orange-50"
                        >
                          No Show
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="drug-test-provider">Provider</Label>
                      <Input
                        id="drug-test-provider"
                        value={drugTestProvider}
                        onChange={(e) => setDrugTestProvider(e.target.value)}
                        placeholder="e.g., LabCorp, Quest Diagnostics"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="drug-test-site">Test Site</Label>
                      <Input
                        id="drug-test-site"
                        value={drugTestSite}
                        onChange={(e) => setDrugTestSite(e.target.value)}
                        placeholder="e.g., 123 Main St, City, State"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="drug-test-date">
                        Scheduled Date (Optional)
                      </Label>
                      <Input
                        id="drug-test-date"
                        type="date"
                        value={drugTestDate}
                        onChange={(e) => setDrugTestDate(e.target.value)}
                        className="mt-1"
                      />
                    </div>

                    <Button
                      onClick={handleCreateDrugTest}
                      disabled={
                        isCreatingDrugTest ||
                        !drugTestProvider.trim() ||
                        !drugTestSite.trim()
                      }
                      className="w-full"
                    >
                      {isCreatingDrugTest ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Create Drug Test Order
                    </Button>
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="onboarding">
            <div className="grid gap-6">
              {/* Orientation Section */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Orientation</h3>
                {application.onboarding?.orientation_completed_at ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-medium">Orientation Completed</span>
                    </div>
                    <div className="grid gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">
                          Completed:{" "}
                        </span>
                        <span>
                          {format(
                            new Date(
                              application.onboarding.orientation_completed_at
                            ),
                            "PPP"
                          )}
                        </span>
                      </div>
                      {application.onboarding.orientation_notes && (
                        <div>
                          <span className="text-muted-foreground">Notes: </span>
                          <span>
                            {application.onboarding.orientation_notes}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : application.onboarding?.orientation_scheduled_at ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-blue-600">
                      <Clock className="h-5 w-5" />
                      <span className="font-medium">Orientation Scheduled</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">
                        Scheduled for:{" "}
                      </span>
                      <span>
                        {format(
                          new Date(
                            application.onboarding.orientation_scheduled_at
                          ),
                          "PPP p"
                        )}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="orientation-notes">
                        Completion Notes (Optional)
                      </Label>
                      <Textarea
                        id="orientation-notes"
                        value={orientationNotes}
                        onChange={(e) => setOrientationNotes(e.target.value)}
                        placeholder="Add any notes about the orientation..."
                        rows={3}
                      />
                    </div>
                    <Button
                      onClick={handleCompleteOrientation}
                      disabled={isCompletingOrientation}
                      className="w-full"
                    >
                      {isCompletingOrientation ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                      )}
                      Mark as Completed
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      No orientation scheduled yet
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="orientation-date">
                        Orientation Date & Time
                      </Label>
                      <Input
                        id="orientation-date"
                        type="datetime-local"
                        value={orientationDate}
                        onChange={(e) => setOrientationDate(e.target.value)}
                      />
                    </div>
                    <Button
                      onClick={handleScheduleOrientation}
                      disabled={!orientationDate || isSchedulingOrientation}
                      className="w-full"
                    >
                      {isSchedulingOrientation ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Calendar className="h-4 w-4 mr-2" />
                      )}
                      Schedule Orientation
                    </Button>
                  </div>
                )}
              </Card>

              {/* Training Section */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Training</h3>
                {application.onboarding?.training_completed_at ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-medium">Training Completed</span>
                    </div>
                    <div className="grid gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">
                          Completed:{" "}
                        </span>
                        <span>
                          {format(
                            new Date(
                              application.onboarding.training_completed_at
                            ),
                            "PPP"
                          )}
                        </span>
                      </div>
                      {application.onboarding.training_rating && (
                        <div>
                          <span className="text-muted-foreground">
                            Rating:{" "}
                          </span>
                          <span>
                            {application.onboarding.training_rating}/5
                          </span>
                        </div>
                      )}
                      {application.onboarding.training_notes && (
                        <div>
                          <span className="text-muted-foreground">Notes: </span>
                          <span>{application.onboarding.training_notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : application.onboarding?.training_scheduled_start ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-blue-600">
                      <Clock className="h-5 w-5" />
                      <span className="font-medium">Training Scheduled</span>
                    </div>
                    <div className="grid gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Start: </span>
                        <span>
                          {format(
                            new Date(
                              application.onboarding.training_scheduled_start
                            ),
                            "PPP"
                          )}
                        </span>
                      </div>
                      {application.onboarding.training_scheduled_end && (
                        <div>
                          <span className="text-muted-foreground">End: </span>
                          <span>
                            {format(
                              new Date(
                                application.onboarding.training_scheduled_end
                              ),
                              "PPP"
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="training-rating">Rating (1-5)</Label>
                      <Select
                        value={trainingRating.toString()}
                        onValueChange={(value) =>
                          setTrainingRating(parseInt(value))
                        }
                      >
                        <SelectTrigger id="training-rating">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 - Poor</SelectItem>
                          <SelectItem value="2">2 - Below Average</SelectItem>
                          <SelectItem value="3">3 - Average</SelectItem>
                          <SelectItem value="4">4 - Good</SelectItem>
                          <SelectItem value="5">5 - Excellent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="training-notes">
                        Completion Notes (Optional)
                      </Label>
                      <Textarea
                        id="training-notes"
                        value={trainingCompletionNotes}
                        onChange={(e) =>
                          setTrainingCompletionNotes(e.target.value)
                        }
                        placeholder="Add any notes about the training..."
                        rows={3}
                      />
                    </div>
                    <Button
                      onClick={handleCompleteTraining}
                      disabled={isCompletingTraining}
                      className="w-full"
                    >
                      {isCompletingTraining ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                      )}
                      Mark as Completed
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      No training scheduled yet
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="training-start">
                        Training Start Date
                      </Label>
                      <Input
                        id="training-start"
                        type="datetime-local"
                        value={trainingStartDate}
                        onChange={(e) => setTrainingStartDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="training-end">Training End Date</Label>
                      <Input
                        id="training-end"
                        type="datetime-local"
                        value={trainingEndDate}
                        onChange={(e) => setTrainingEndDate(e.target.value)}
                      />
                    </div>
                    <Button
                      onClick={handleScheduleTraining}
                      disabled={
                        !trainingStartDate ||
                        !trainingEndDate ||
                        isSchedulingTraining
                      }
                      className="w-full"
                    >
                      {isSchedulingTraining ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Calendar className="h-4 w-4 mr-2" />
                      )}
                      Schedule Training
                    </Button>
                  </div>
                )}
              </Card>

              {/* Hire Button */}
              {application.application.status === "CLEARED_FOR_HIRE" ||
              application.application.status === "ORIENTATION_COMPLETED" ||
              application.application.status === "TRAINING_COMPLETED" ? (
                <Card className="p-6 bg-green-50 dark:bg-green-950">
                  <h3 className="text-lg font-semibold mb-4 text-green-900 dark:text-green-100">
                    Ready to Hire
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-300 mb-4">
                    This candidate has completed all requirements and is ready
                    to be hired.
                  </p>
                  <Button
                    onClick={handleApproveAndHire}
                    disabled={isHiring}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {isHiring ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <UserCheck className="h-4 w-4 mr-2" />
                    )}
                    Approve and Hire
                  </Button>
                </Card>
              ) : null}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ApplicationDetail;
