import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Header } from "@/components/Header";
import { ApplicationStatusBadge } from "@/components/driver-onboarding/ApplicationStatusBadge";
import { ActivityLog } from "@/components/driver-onboarding/ActivityLog";
import { DocumentUpload } from "@/components/driver-onboarding/DocumentUpload";
import { DriverOnboardingRibbon } from "@/components/driver-onboarding/DriverOnboardingRibbon";
import { DriverApplicationFormView } from "@/components/driver-onboarding/DriverApplicationFormView";
import { driverOnboardingService } from "@/lib/driverOnboardingService";
import { supabase } from "@/lib/supabase";
import {
  sendEmail,
  generateDriverApplicationFormEmailHTML,
  generateDriverApplicationReceivedEmailHTML,
  generateDriverMVRCompletedEmailHTML,
  generateDriverMVRNotClearedEmailHTML,
  generateDriverDrugTestCompletedEmailHTML,
  generateDriverDrugTestNotClearedEmailHTML,
  generateDriverClearedForOrientationEmailHTML,
  generateDriverOrientationScheduledEmailHTML,
} from "@/lib/emailService";
import {
  isValidEmail,
  isValidPhoneNumber,
  formatPhoneNumber,
} from "@/lib/validationUtils";
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
  Trash2,
  ChevronDown,
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
  const [isFormDetailsOpen, setIsFormDetailsOpen] = useState(false);

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
  const [newLeadValidationErrors, setNewLeadValidationErrors] = useState<{
    email?: string;
    phone?: string;
  }>({});
  const [yards, setYards] = useState<
    Array<{
      id: string;
      name: string;
      address?: string;
      supervisor_name?: string;
      supervisor_phone?: string;
    }>
  >([]);
  const [supervisors, setSupervisors] = useState<
    Array<{ id: string; name: string }>
  >([]);

  // Onboarding state
  const [orientationDate, setOrientationDate] = useState("");
  const [orientationSupervisorName, setOrientationSupervisorName] =
    useState("");
  const [orientationYardId, setOrientationYardId] = useState("");
  const [orientationNotes, setOrientationNotes] = useState("");
  const [isSchedulingOrientation, setIsSchedulingOrientation] = useState(false);
  const [isCompletingOrientation, setIsCompletingOrientation] = useState(false);

  const [isHiring, setIsHiring] = useState(false);

  // Delete state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Application form state
  const [isSendingApplicationForm, setIsSendingApplicationForm] =
    useState(false);

  useEffect(() => {
    if (id && id !== "new") {
      loadApplication();
      loadActivities();
      loadYards();
      loadSupervisors();
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

  const loadSupervisors = async () => {
    // Fetch users who can be supervisors (you may want to filter by role)
    const { data, error } = await supabase
      .from("users")
      .select("id, name")
      .order("name");

    if (!error && data) {
      setSupervisors(data);
    }
  };

  // Helper function to determine the next tab after completing current stage
  const getNextTab = (currentTab: string): string => {
    const tabOrder = [
      "verification",
      "documents",
      "mvr",
      "drug_test",
      "orientation",
    ];
    const currentIndex = tabOrder.indexOf(currentTab);
    if (currentIndex >= 0 && currentIndex < tabOrder.length - 1) {
      return tabOrder[currentIndex + 1];
    }
    return currentTab; // Stay on current tab if it's the last one
  };

  const loadApplication = async () => {
    if (!id || id === "new") return;

    setIsLoading(true);
    const result = await driverOnboardingService.getApplicationById(id);
    if (result.success && result.data) {
      setApplication(result.data);
      setNotes(result.data.application.notes || "");

      // Auto-populate orientation yard from application yard if not already set
      if (result.data.application.yard_id && !orientationYardId) {
        setOrientationYardId(result.data.application.yard_id);
      }
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
      await loadApplication();
      await loadActivities();
      setVerificationNotes("");
      // Move to next tab
      setActiveTab(getNextTab("verification"));
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
      // Reload application data without refreshing the page or switching tabs
      await loadApplication();
      // Don't call loadActivities or switch tabs to prevent page refresh feeling
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
      // Update local state immediately without reloading from server
      const columnMap = {
        dl: "drivers_license_verified",
        medical_card: "medical_card_verified",
        ssn: "ssn_verified",
      };

      const updatedCompliance = {
        ...application.compliance,
        [columnMap[documentType]]: verified,
      };

      setApplication({
        ...application,
        compliance: updatedCompliance,
      });

      // Check if all documents are now verified
      const allDocsVerified =
        updatedCompliance.drivers_license_verified &&
        updatedCompliance.medical_card_verified &&
        updatedCompliance.ssn_verified;

      // Move to next tab if all documents are verified
      if (allDocsVerified && verified) {
        setActiveTab(getNextTab("documents"));
        toast({
          title: "Success",
          description: "All documents verified - Compliance tab unlocked",
        });

        // Send "Application Received" email to driver
        if (application.candidate.email) {
          const emailHTML = generateDriverApplicationReceivedEmailHTML({
            driverName: application.candidate.name,
          });

          const emailResult = await sendEmail({
            to: application.candidate.email,
            subject: "Your Application Has Been Received - Avensis Energy",
            html: emailHTML,
          });

          if (emailResult.success) {
            console.log(
              `✅ Application received email sent to ${application.candidate.email}`
            );
          } else {
            console.error(
              `❌ Failed to send application received email: ${emailResult.error}`
            );
          }
        }
      }
      // Don't switch tabs otherwise - stay on documents tab
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
      await loadApplication();
      await loadActivities();
      setMvrSummary("");

      // Send email to driver based on MVR result
      if (application?.candidate.email) {
        const emailHTML = mvrEligible
          ? generateDriverMVRCompletedEmailHTML({
              driverName: application.candidate.name,
            })
          : generateDriverMVRNotClearedEmailHTML({
              driverName: application.candidate.name,
            });

        const emailSubject = mvrEligible
          ? "MVR Check Completed - Avensis Energy"
          : "MVR Review Result - Avensis Energy";

        const emailResult = await sendEmail({
          to: application.candidate.email,
          subject: emailSubject,
          html: emailHTML,
        });

        if (emailResult.success) {
          console.log(
            `✅ MVR ${
              mvrEligible ? "completed" : "not cleared"
            } email sent to ${application.candidate.email}`
          );
        } else {
          console.error(`❌ Failed to send MVR email: ${emailResult.error}`);
        }
      }

      // Move to drug test tab
      setActiveTab(getNextTab("mvr"));
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
    // Validate required fields
    if (!newLeadForm.name.trim() || !newLeadForm.phone.trim()) {
      toast({
        title: "Validation Error",
        description: "Name and phone are required",
        variant: "destructive",
      });
      return;
    }

    // Validate phone number format
    if (!isValidPhoneNumber(newLeadForm.phone)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid 10-digit phone number",
        variant: "destructive",
      });
      return;
    }

    // Validate email format if provided
    if (newLeadForm.email && !isValidEmail(newLeadForm.email)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid email address",
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
      await loadApplication();
      await loadActivities();

      // Send email to driver based on drug test result
      if (application?.candidate.email) {
        if (result === "NEGATIVE") {
          // Drug test passed - send success email and cleared for orientation email
          const drugTestEmailHTML = generateDriverDrugTestCompletedEmailHTML({
            driverName: application.candidate.name,
          });

          const drugTestEmailResult = await sendEmail({
            to: application.candidate.email,
            subject: "Drug Test Completed - Avensis Energy",
            html: drugTestEmailHTML,
          });

          if (drugTestEmailResult.success) {
            console.log(
              `✅ Drug test completed email sent to ${application.candidate.email}`
            );
          }

          // Also send "Cleared for Orientation" email
          const clearedEmailHTML = generateDriverClearedForOrientationEmailHTML(
            {
              driverName: application.candidate.name,
            }
          );

          const clearedEmailResult = await sendEmail({
            to: application.candidate.email,
            subject: "You're Cleared for Orientation - Avensis Energy",
            html: clearedEmailHTML,
          });

          if (clearedEmailResult.success) {
            console.log(
              `✅ Cleared for orientation email sent to ${application.candidate.email}`
            );
          }
        } else {
          // Drug test failed or no-show - send failure email
          const emailHTML = generateDriverDrugTestNotClearedEmailHTML({
            driverName: application.candidate.name,
          });

          const emailResult = await sendEmail({
            to: application.candidate.email,
            subject: "Drug Test Result - Avensis Energy",
            html: emailHTML,
          });

          if (emailResult.success) {
            console.log(
              `✅ Drug test not cleared email sent to ${application.candidate.email}`
            );
          } else {
            console.error(
              `❌ Failed to send drug test email: ${emailResult.error}`
            );
          }
        }
      }

      // Move to next tab if drug test passed
      if (result === "NEGATIVE") {
        setActiveTab(getNextTab("drug_test"));
      } else {
        setActiveTab("drug_test");
      }
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
    if (
      !id ||
      id === "new" ||
      !orientationDate ||
      !orientationSupervisorName ||
      !orientationYardId
    ) {
      toast({
        title: "Validation Error",
        description:
          "Please fill in all required fields (supervisor, yard, date/time)",
        variant: "destructive",
      });
      return;
    }

    setIsSchedulingOrientation(true);

    // Update onboarding record with supervisor name and yard
    await supabase
      .from("driver_onboarding")
      .update({
        supervisor_name: orientationSupervisorName,
        yard_id: orientationYardId,
        orientation_notes: orientationNotes,
      })
      .eq("application_id", id);

    const result = await driverOnboardingService.scheduleOrientation(id, {
      supervisor_name: orientationSupervisorName,
      scheduled_at: orientationDate,
    });

    if (result.success) {
      toast({
        title: "Success",
        description: "Orientation scheduled successfully",
      });
      await loadApplication();
      await loadActivities();

      // Send orientation scheduled email to driver
      if (application?.candidate.email) {
        // Get yard details
        const selectedYard = yards.find((y) => y.id === orientationYardId);
        const yardName = selectedYard?.name || "Yard";
        const yardAddress = selectedYard?.address || undefined;

        // Format the orientation date
        const formattedDate = new Date(orientationDate).toLocaleString(
          "en-US",
          {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          }
        );

        const emailHTML = generateDriverOrientationScheduledEmailHTML({
          driverName: application.candidate.name,
          orientationDate: formattedDate,
          supervisorName: orientationSupervisorName,
          yardName: yardName,
          yardAddress: yardAddress,
          notes: orientationNotes || undefined,
        });

        const emailResult = await sendEmail({
          to: application.candidate.email,
          subject: "Orientation Scheduled - Avensis Energy",
          html: emailHTML,
        });

        if (emailResult.success) {
          console.log(
            `✅ Orientation scheduled email sent to ${application.candidate.email}`
          );
        } else {
          console.error(
            `❌ Failed to send orientation email: ${emailResult.error}`
          );
        }
      }

      setOrientationDate("");
      setOrientationSupervisorName("");
      setOrientationYardId("");
      setOrientationNotes("");
      // Stay on orientation tab (user still needs to complete it)
      setActiveTab("orientation");
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
      await loadApplication();
      await loadActivities();
      setOrientationNotes("");
      // Move to next tab
      setActiveTab(getNextTab("orientation"));
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to complete orientation",
        variant: "destructive",
      });
    }
    setIsCompletingOrientation(false);
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

  const handleDeleteApplication = async () => {
    if (!id || id === "new") return;

    setIsDeleting(true);
    const result = await driverOnboardingService.deleteApplication(id);

    if (result.success) {
      toast({
        title: "Success",
        description: "Application deleted successfully",
      });
      // Redirect to pipeline dashboard
      navigate("/driver-onboarding/pipeline");
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to delete application",
        variant: "destructive",
      });
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleSendApplicationForm = async () => {
    if (!id || id === "new" || !application) return;

    // Check if driver has email
    if (!application.candidate?.email) {
      toast({
        title: "Error",
        description: "Driver email is required to send the application form",
        variant: "destructive",
      });
      return;
    }

    setIsSendingApplicationForm(true);

    try {
      // Generate unique token
      const token = crypto.randomUUID();

      // Update application with token and sent timestamp
      const { error: updateError } = await supabase
        .from("driver_applications")
        .update({
          application_form_token: token,
          application_form_sent_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateError) throw updateError;

      // Generate form link
      const formLink = `${window.location.origin}/driver-onboarding/form/${token}`;

      // Format position type for display
      const positionTypeDisplay = application.application.position_type
        ? application.application.position_type
            .replace(/_/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase())
        : "Driver";

      // Generate email HTML
      const emailHTML = generateDriverApplicationFormEmailHTML({
        driverName: application.candidate.name,
        formUrl: formLink,
        positionType: positionTypeDisplay,
      });

      // Send email
      const emailResult = await sendEmail({
        to: application.candidate.email,
        subject: "Complete Your Driver Application - Avensis Energy",
        html: emailHTML,
      });

      if (!emailResult.success) {
        throw new Error(emailResult.error || "Failed to send email");
      }

      toast({
        title: "Application Form Sent",
        description: `Email sent successfully to ${application.candidate.email}`,
      });

      // Reload application to show updated status
      loadApplication();
    } catch (error: any) {
      console.error("Error sending application form:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send application form",
        variant: "destructive",
      });
    } finally {
      setIsSendingApplicationForm(false);
    }
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
                  type="tel"
                  value={newLeadForm.phone}
                  onChange={(e) => {
                    setNewLeadForm({ ...newLeadForm, phone: e.target.value });
                    // Clear validation error when user types
                    if (newLeadValidationErrors.phone) {
                      setNewLeadValidationErrors({
                        ...newLeadValidationErrors,
                        phone: undefined,
                      });
                    }
                  }}
                  onBlur={(e) => {
                    // Format phone number on blur
                    const formatted = formatPhoneNumber(e.target.value);
                    setNewLeadForm({ ...newLeadForm, phone: formatted });
                    // Validate phone number
                    if (e.target.value && !isValidPhoneNumber(e.target.value)) {
                      setNewLeadValidationErrors({
                        ...newLeadValidationErrors,
                        phone: "Please enter a valid 10-digit phone number",
                      });
                    }
                  }}
                  placeholder="(555) 123-4567"
                  className={
                    newLeadValidationErrors.phone ? "border-red-500" : ""
                  }
                />
                {newLeadValidationErrors.phone && (
                  <p className="text-sm text-red-500">
                    {newLeadValidationErrors.phone}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newLeadForm.email}
                  onChange={(e) => {
                    setNewLeadForm({ ...newLeadForm, email: e.target.value });
                    // Clear validation error when user types
                    if (newLeadValidationErrors.email) {
                      setNewLeadValidationErrors({
                        ...newLeadValidationErrors,
                        email: undefined,
                      });
                    }
                  }}
                  onBlur={(e) => {
                    // Validate email
                    if (e.target.value && !isValidEmail(e.target.value)) {
                      setNewLeadValidationErrors({
                        ...newLeadValidationErrors,
                        email: "Please enter a valid email address",
                      });
                    }
                  }}
                  placeholder="email@example.com"
                  className={
                    newLeadValidationErrors.email ? "border-red-500" : ""
                  }
                />
                {newLeadValidationErrors.email && (
                  <p className="text-sm text-red-500">
                    {newLeadValidationErrors.email}
                  </p>
                )}
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
                <Select
                  value={newLeadForm.source}
                  onValueChange={(value) =>
                    setNewLeadForm({ ...newLeadForm, source: value })
                  }
                >
                  <SelectTrigger id="source">
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Indeed">Indeed</SelectItem>
                    <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                    <SelectItem value="Facebook">Facebook</SelectItem>
                    <SelectItem value="Meta">Meta</SelectItem>
                    <SelectItem value="Referral">Referral</SelectItem>
                    <SelectItem value="Walk-in">Walk-in</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="position_type">Driver Type</Label>
                <Select
                  value={newLeadForm.position_type}
                  onValueChange={(value) =>
                    setNewLeadForm({ ...newLeadForm, position_type: value })
                  }
                >
                  <SelectTrigger id="position_type">
                    <SelectValue placeholder="Select driver type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Owner Operator">
                      Owner Operator
                    </SelectItem>
                    <SelectItem value="Company Driver (Employee)">
                      Company Driver (Employee)
                    </SelectItem>
                  </SelectContent>
                </Select>
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
                        <div className="flex flex-col">
                          <span className="font-medium">{yard.name}</span>
                          {yard.address && (
                            <span className="text-xs text-muted-foreground">
                              {yard.address}
                            </span>
                          )}
                          {yard.supervisor_name && (
                            <span className="text-xs text-muted-foreground">
                              Supervisor: {yard.supervisor_name}
                              {yard.supervisor_phone &&
                                ` • ${yard.supervisor_phone}`}
                            </span>
                          )}
                        </div>
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

  // Helper function to determine which tabs should be enabled based on application status
  const isTabEnabled = (tabName: string): boolean => {
    if (!application) return false;

    const status = application.application.status;

    switch (tabName) {
      case "overview":
        return true; // Always enabled
      case "verification":
        return true; // Always enabled - this is where users start
      case "documents":
        // Enabled after verification is done (status changes from NEW)
        return status !== "NEW" && status !== "REJECTED";
      case "mvr":
        // Enabled after all documents are verified
        return (
          (application.compliance?.drivers_license_verified &&
            application.compliance?.medical_card_verified &&
            application.compliance?.ssn_verified) ||
          false
        );
      case "drug_test":
        // Enabled after MVR is completed
        return !!application.compliance?.mvr_completed_at;
      case "orientation":
        // Enabled after compliance is cleared (MVR and Drug Test passed)
        return [
          "CLEARED_FOR_HIRE",
          "ORIENTATION_SCHEDULED",
          "ORIENTATION_COMPLETED",
          "HIRED",
        ].includes(status);
      default:
        return false;
    }
  };

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
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Application
            </Button>
          </div>
        </div>

        {/* Onboarding Progress Ribbon */}
        <DriverOnboardingRibbon application={application} />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4 w-full h-auto bg-transparent p-0 grid grid-cols-[auto_1fr] gap-2 border-b">
            <TabsTrigger
              value="overview"
              disabled={!isTabEnabled("overview")}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              Overview
            </TabsTrigger>
            <div className="grid grid-cols-6 gap-0">
              <TabsTrigger
                value="verification"
                disabled={!isTabEnabled("verification")}
                className={`rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent ${
                  !isTabEnabled("verification")
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
              >
                Initial Connect
                {!isTabEnabled("verification") && " 🔒"}
              </TabsTrigger>
              <TabsTrigger
                value="documents"
                disabled={!isTabEnabled("documents")}
                className={`rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent ${
                  !isTabEnabled("documents")
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
              >
                Applications
                {!isTabEnabled("documents") && " 🔒"}
              </TabsTrigger>
              <TabsTrigger
                value="mvr"
                disabled={!isTabEnabled("mvr")}
                className={`rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent ${
                  !isTabEnabled("mvr") ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                MVR Record
                {!isTabEnabled("mvr") && " 🔒"}
              </TabsTrigger>
              <TabsTrigger
                value="drug_test"
                disabled={!isTabEnabled("drug_test")}
                className={`rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent ${
                  !isTabEnabled("drug_test")
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
              >
                Drug Test
                {!isTabEnabled("drug_test") && " 🔒"}
              </TabsTrigger>
              <TabsTrigger
                value="orientation"
                disabled={!isTabEnabled("orientation")}
                className={`rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent ${
                  !isTabEnabled("orientation")
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
              >
                Orientation
                {!isTabEnabled("orientation") && " 🔒"}
              </TabsTrigger>
            </div>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
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
              </div>

              {/* Activity Log */}
              <div className="lg:col-span-1">
                <ActivityLog activities={activities} />
              </div>
            </div>
          </TabsContent>

          {/* Initial Connect Tab */}
          <TabsContent value="verification">
            <Card className="p-6 max-w-4xl mx-auto">
              <h3 className="text-lg font-semibold mb-4">Initial Connect</h3>

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
                  Submit
                </Button>
              </div>
            </Card>
          </TabsContent>
          {/* Applications Tab */}
          <TabsContent value="documents">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Send Application Form Card */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Driver Application Form
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Send the driver a link to complete their application form
                  online. They will fill out all required information and upload
                  documents.
                </p>

                {application.application.application_form_sent_at ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        ✉️ Application form sent on{" "}
                        {format(
                          new Date(
                            application.application.application_form_sent_at
                          ),
                          "PPP 'at' p"
                        )}
                      </p>
                      {application.application.application_form_token && (
                        <p className="text-xs text-blue-600 dark:text-blue-300 mt-2">
                          Link: {window.location.origin}/driver-onboarding/form/
                          {application.application.application_form_token}
                        </p>
                      )}
                    </div>

                    {application.application.application_form_completed_at ? (
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                        <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                          <CheckCircle2 className="h-5 w-5" />
                          <p className="font-medium">
                            Form completed on{" "}
                            {format(
                              new Date(
                                application.application.application_form_completed_at
                              ),
                              "PPP 'at' p"
                            )}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                          ⏳ Waiting for driver to complete the form...
                        </p>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      onClick={handleSendApplicationForm}
                      disabled={isSendingApplicationForm}
                    >
                      {isSendingApplicationForm ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Mail className="h-4 w-4 mr-2" />
                      )}
                      Resend Application Form Link
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={handleSendApplicationForm}
                    disabled={isSendingApplicationForm}
                  >
                    {isSendingApplicationForm ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Mail className="h-4 w-4 mr-2" />
                    )}
                    Send Application Form to Driver
                  </Button>
                )}
              </Card>

              {/* Form Details Collapsible Section */}
              {application.application.application_form_completed_at && (
                <Collapsible
                  open={isFormDetailsOpen}
                  onOpenChange={setIsFormDetailsOpen}
                >
                  <Card className="p-6">
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">
                          Application Form Details
                        </h3>
                        <ChevronDown
                          className={`h-5 w-5 transition-transform ${
                            isFormDetailsOpen ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-4">
                      <DriverApplicationFormView applicationId={id!} />
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              )}

              {/* Hidden for now - Application Documents section */}
              {true && (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">
                    Required Application Documents
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
                        application.compliance?.drivers_license_verified ||
                        false
                      }
                      onUploadComplete={(url) =>
                        handleDocumentUpload("dl", url)
                      }
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
                        handleDocumentVerificationChange(
                          "medical_card",
                          verified
                        )
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
                      onUploadComplete={(url) =>
                        handleDocumentUpload("ssn", url)
                      }
                      onVerificationChange={(verified) =>
                        handleDocumentVerificationChange("ssn", verified)
                      }
                    />
                  </div>
                </Card>
              )}
            </div>
          </TabsContent>
          {/* MVR Tab */}
          <TabsContent value="mvr">
            <div className="max-w-4xl mx-auto space-y-6">
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
                        <div className="border rounded-lg p-4 bg-muted/30">
                          <Label className="text-sm font-medium mb-2 block">
                            Upload MVR Report
                          </Label>
                          <DocumentUpload
                            label="MVR Report"
                            documentType="dl"
                            candidateId={application.application.candidate_id}
                            complianceId={application.compliance.id}
                            currentFileUrl={
                              application.compliance.mvr_report_url
                            }
                            isVerified={false}
                            onUploadComplete={async (fileUrl) => {
                              // Update MVR report URL
                              await supabase
                                .from("driver_compliance")
                                .update({ mvr_report_url: fileUrl })
                                .eq("id", application.compliance!.id);
                              loadApplication();
                              toast({
                                title: "Success",
                                description: "MVR report uploaded successfully",
                              });
                            }}
                            onVerificationChange={() => {}}
                          />
                        </div>

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
            </div>
          </TabsContent>

          {/* Drug Test Tab */}
          <TabsContent value="drug_test">
            <div className="max-w-4xl mx-auto space-y-6">
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
                      </div>
                    </div>

                    <div className="border rounded-lg p-4 bg-muted/30">
                      <Label className="text-sm font-medium mb-2 block">
                        Upload Work Order
                      </Label>
                      <DocumentUpload
                        label="Drug Test Work Order"
                        documentType="dl"
                        candidateId={application.application.candidate_id}
                        complianceId={application.compliance.id}
                        currentFileUrl={
                          application.compliance.drug_test_work_order_url
                        }
                        isVerified={false}
                        onUploadComplete={async (fileUrl) => {
                          // Update work order URL
                          await supabase
                            .from("driver_compliance")
                            .update({ drug_test_work_order_url: fileUrl })
                            .eq("id", application.compliance!.id);
                          loadApplication();
                          toast({
                            title: "Success",
                            description: "Work order uploaded successfully",
                          });
                        }}
                        onVerificationChange={() => {}}
                      />
                      {application.compliance.drug_test_work_order_url && (
                        <Button
                          onClick={async () => {
                            // Send email to driver with work order details
                            toast({
                              title: "Email Sent",
                              description:
                                "Drug test instructions sent to driver",
                            });
                          }}
                          className="w-full mt-3"
                          variant="outline"
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Send Instructions to Driver
                        </Button>
                      )}
                    </div>

                    <div className="border rounded-lg p-4 bg-muted/30">
                      <Label className="text-sm font-medium mb-2 block">
                        Upload Test Results (from Clinic)
                      </Label>
                      <DocumentUpload
                        label="Drug Test Results"
                        documentType="dl"
                        candidateId={application.application.candidate_id}
                        complianceId={application.compliance.id}
                        currentFileUrl={
                          application.compliance.drug_test_results_url
                        }
                        isVerified={false}
                        onUploadComplete={async (fileUrl) => {
                          // Update test results URL
                          await supabase
                            .from("driver_compliance")
                            .update({ drug_test_results_url: fileUrl })
                            .eq("id", application.compliance!.id);
                          loadApplication();
                          toast({
                            title: "Success",
                            description: "Test results uploaded successfully",
                          });
                        }}
                        onVerificationChange={() => {}}
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Upload the test results document received from the
                        clinic
                      </p>
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
                        Scheduled Date <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="drug-test-date"
                        type="date"
                        value={drugTestDate}
                        onChange={(e) => setDrugTestDate(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                        className="mt-1 dark:bg-background dark:text-foreground dark:[color-scheme:dark]"
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Select a future date for the drug test appointment
                      </p>
                    </div>

                    <Button
                      onClick={handleCreateDrugTest}
                      disabled={
                        isCreatingDrugTest ||
                        !drugTestProvider.trim() ||
                        !drugTestSite.trim() ||
                        !drugTestDate
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
          {/* Orientation Tab */}
          <TabsContent value="orientation">
            <div className="grid gap-6 max-w-4xl mx-auto">
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
                      <Label htmlFor="orientation-yard">
                        Yard Location <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={orientationYardId}
                        onValueChange={setOrientationYardId}
                      >
                        <SelectTrigger id="orientation-yard">
                          <SelectValue placeholder="Select yard" />
                        </SelectTrigger>
                        <SelectContent>
                          {yards.map((yard) => (
                            <SelectItem key={yard.id} value={yard.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{yard.name}</span>
                                {yard.address && (
                                  <span className="text-xs text-muted-foreground">
                                    {yard.address}
                                  </span>
                                )}
                                {yard.supervisor_name && (
                                  <span className="text-xs text-muted-foreground">
                                    Supervisor: {yard.supervisor_name}
                                    {yard.supervisor_phone &&
                                      ` • ${yard.supervisor_phone}`}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="orientation-supervisor">
                        Supervisor Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="orientation-supervisor"
                        value={orientationSupervisorName}
                        onChange={(e) =>
                          setOrientationSupervisorName(e.target.value)
                        }
                        placeholder="Enter supervisor name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="orientation-date">
                        Date & Time <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="orientation-date"
                        type="datetime-local"
                        value={orientationDate}
                        onChange={(e) => setOrientationDate(e.target.value)}
                        min={new Date().toISOString().slice(0, 16)}
                        className="dark:bg-background dark:text-foreground dark:[color-scheme:dark]"
                      />
                      <p className="text-xs text-muted-foreground">
                        Select a future date and time for orientation
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="orientation-next-steps">
                        Next Steps / Instructions
                      </Label>
                      <Textarea
                        id="orientation-next-steps"
                        value={orientationNotes}
                        onChange={(e) => setOrientationNotes(e.target.value)}
                        placeholder="Add any instructions or next steps for the driver..."
                        rows={3}
                      />
                    </div>

                    <Button
                      onClick={handleScheduleOrientation}
                      disabled={
                        !orientationDate ||
                        !orientationSupervisorName ||
                        !orientationYardId ||
                        isSchedulingOrientation
                      }
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
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Application</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this application for{" "}
              <strong>{application.candidate.name}</strong>? This action cannot
              be undone and will permanently remove all associated data
              including documents, compliance records, and activity history.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteApplication}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Application
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApplicationDetail;
