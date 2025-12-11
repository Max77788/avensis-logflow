import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { DocumentUpload } from "@/components/driver-onboarding/DocumentUpload";
import { min } from "date-fns";

// Types
interface DriverExperience {
  equipment_type: string;
  from_date: string;
  to_date: string;
  approx_miles: number;
}

interface AccidentHistory {
  accident_date: string;
  description: string;
  injuries: number;
  fatalities: number;
}

interface TrafficViolation {
  violation_date: string;
  location: string;
  charge: string;
  penalty: string;
}

interface EmploymentHistory {
  employer_name: string;
  employer_address: string;
  employer_phone: string;
  from_date: string;
  to_date: string;
  position: string;
  reason_for_leaving: string;
  subject_to_fmcsrs: boolean;
  subject_to_drug_testing: boolean;
}

interface EmploymentGap {
  activity_description: string;
  from_date: string;
  to_date: string;
  was_unemployed: boolean;
}

interface FormData {
  // Step 1: Applicant Information
  first_name: string;
  middle_name: string;
  last_name: string;
  current_address: string;
  previous_address_1: string;
  previous_address_2: string;
  phone_number: string;
  date_of_birth: string;
  ssn: string;
  years_at_current_address: number;

  // Step 2: Work Authorization
  legally_authorized_to_work: boolean | null;

  // Step 3: Emergency Contact
  emergency_contact_name: string;
  emergency_contact_relation: string;
  emergency_contact_address: string;
  emergency_contact_phone: string;

  // Step 4: Driver License
  dl_number: string;
  dl_state: string;
  dl_type: string;
  dl_expiration_date: string;

  // Step 5: Driver Experience
  driver_experience: DriverExperience[];

  // Step 6: Safety Questions
  denied_license: boolean;
  denied_license_details: string;
  license_suspended: boolean;
  license_suspended_details: string;
  convicted_cmv_crime: boolean;
  convicted_cmv_crime_details: string;
  convicted_law_violation: boolean;
  convicted_law_violation_details: string;

  // Step 7: Accident History
  accident_history: AccidentHistory[];

  // Step 8: Traffic Violations
  traffic_violations: TrafficViolation[];

  // Step 9: Employment History
  employment_history: EmploymentHistory[];
  no_previous_dot_employment: boolean;

  // Step 10: Employment Gaps
  employment_gaps: EmploymentGap[];

  // Step 11: Applicant Declarations
  applicant_signature: string;
  applicant_print_name: string;

  // Step 12: FCRA Disclosure
  fcra_signature: string;
  fcra_print_name: string;
}

const STEPS = [
  "Applicant Information",
  "Work Authorization",
  "Emergency Contact",
  "Driver License",
  "Driver Experience",
  "Safety Questions",
  "Accident History",
  "Traffic Violations",
  "Employment History",
  "Employment Gaps",
  "Declarations",
  "FCRA Disclosure",
  "Document Upload",
];

const US_STATES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
];

const today = new Date();
today.setFullYear(today.getFullYear() - 18);
const maxDate = today.toISOString().split("T")[0];

const minDateToday = new Date().toISOString().split("T")[0];

const dateToday = minDateToday;

export default function DriverApplicationForm() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [complianceId, setComplianceId] = useState<string | null>(null);
  const [formId, setFormId] = useState<string | null>(null);
  const [positionType, setPositionType] = useState<string>("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    first_name: "",
    middle_name: "",
    last_name: "",
    current_address: "",
    previous_address_1: "",
    previous_address_2: "",
    phone_number: "",
    date_of_birth: "",
    ssn: "",
    years_at_current_address: 0,
    legally_authorized_to_work: null,
    emergency_contact_name: "",
    emergency_contact_relation: "",
    emergency_contact_address: "",
    emergency_contact_phone: "",
    dl_number: "",
    dl_state: "",
    dl_type: "",
    dl_expiration_date: "",
    driver_experience: [],
    denied_license: false,
    denied_license_details: "",
    license_suspended: false,
    license_suspended_details: "",
    convicted_cmv_crime: false,
    convicted_cmv_crime_details: "",
    convicted_law_violation: false,
    convicted_law_violation_details: "",
    accident_history: [],
    traffic_violations: [],
    employment_history: [],
    no_previous_dot_employment: false,
    employment_gaps: [],
    applicant_signature: "",
    applicant_print_name: "",
    fcra_signature: "",
    fcra_print_name: "",
  });

  // Load application data and existing form data if any
  useEffect(() => {
    loadApplicationData();
  }, [token]);

  const loadApplicationData = async () => {
    if (!token) {
      toast({
        title: "Invalid Link",
        description: "This application link is invalid.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Get application by token with candidate data and compliance
      const { data: application, error: appError } = await supabase
        .from("driver_applications")
        .select(
          `
          id,
          candidate_id,
          position_type,
          status,
          application_form_completed_at,
          candidate:driver_candidates(name, phone),
          compliance:driver_compliance(id)
        `
        )
        .eq("application_form_token", token)
        .single();

      if (appError || !application) {
        toast({
          title: "Invalid Link",
          description: "This application link is invalid or has expired.",
          variant: "destructive",
        });
        return;
      }

      setApplicationId(application.id);
      setCandidateId(application.candidate_id);
      setPositionType(application.position_type || "");

      // Set compliance ID if it exists
      if (
        application.compliance &&
        Array.isArray(application.compliance) &&
        application.compliance.length > 0
      ) {
        setComplianceId(application.compliance[0].id);
      } else if (
        application.compliance &&
        !Array.isArray(application.compliance)
      ) {
        setComplianceId((application.compliance as any).id);
      }

      // Check if already submitted
      if (application.application_form_completed_at) {
        setIsSubmitted(true);
        setLoading(false);
        return;
      }

      // Load existing form data if any
      const { data: existingForm, error: formError } = await supabase
        .from("driver_application_forms")
        .select("*")
        .eq("application_id", application.id)
        .single();

      if (existingForm && !formError) {
        setFormId(existingForm.id);

        // Restore the current step from saved progress
        if (
          existingForm.current_step !== null &&
          existingForm.current_step !== undefined
        ) {
          setCurrentStep(existingForm.current_step);
        }

        // Populate form data from existing record
        setFormData((prev) => ({
          ...prev,
          first_name: existingForm.first_name || "",
          middle_name: existingForm.middle_name || "",
          last_name: existingForm.last_name || "",
          current_address: existingForm.current_address || "",
          previous_address_1: existingForm.previous_address_1 || "",
          previous_address_2: existingForm.previous_address_2 || "",
          phone_number: existingForm.phone_number || "",
          date_of_birth: existingForm.date_of_birth || "",
          years_at_current_address: existingForm.years_at_current_address || 0,
          legally_authorized_to_work: existingForm.legally_authorized_to_work,
          emergency_contact_name: existingForm.emergency_contact_name || "",
          emergency_contact_relation:
            existingForm.emergency_contact_relation || "",
          emergency_contact_address:
            existingForm.emergency_contact_address || "",
          emergency_contact_phone: existingForm.emergency_contact_phone || "",
          dl_number: existingForm.dl_number || "",
          dl_state: existingForm.dl_state || "",
          dl_type: existingForm.dl_type || "",
          dl_expiration_date: existingForm.dl_expiration_date || "",
          applicant_signature: existingForm.applicant_signature || "",
          applicant_print_name: existingForm.applicant_print_name || "",
          fcra_signature: existingForm.fcra_signature || "",
          fcra_print_name: existingForm.fcra_print_name || "",
        }));

        // Load related data
        await loadRelatedData(existingForm.id);
      } else {
        // No existing form - prefill with candidate data from HR
        const candidate = Array.isArray(application.candidate)
          ? application.candidate[0]
          : application.candidate;

        if (candidate) {
          // Parse candidate name into first and last name
          const nameParts = candidate.name.trim().split(/\s+/);
          const firstName = nameParts[0] || "";
          const lastName =
            nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
          const middleName =
            nameParts.length > 2 ? nameParts.slice(1, -1).join(" ") : "";

          setFormData((prev) => ({
            ...prev,
            first_name: firstName,
            middle_name: middleName,
            last_name: lastName,
            phone_number: candidate.phone || "",
          }));
        }
      }
    } catch (error: any) {
      console.error("Error loading application:", error);
      toast({
        title: "Error",
        description: "Failed to load application data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRelatedData = async (formId: string) => {
    // Load driver experience
    const { data: experience } = await supabase
      .from("driver_experience")
      .select("*")
      .eq("form_id", formId);
    if (experience) {
      setFormData((prev) => ({ ...prev, driver_experience: experience }));
    }

    // Load safety questions
    const { data: safety } = await supabase
      .from("driver_safety_questions")
      .select("*")
      .eq("form_id", formId)
      .single();
    if (safety) {
      setFormData((prev) => ({
        ...prev,
        denied_license: safety.denied_license || false,
        denied_license_details: safety.denied_license_details || "",
        license_suspended: safety.license_suspended || false,
        license_suspended_details: safety.license_suspended_details || "",
        convicted_cmv_crime: safety.convicted_cmv_crime || false,
        convicted_cmv_crime_details: safety.convicted_cmv_crime_details || "",
        convicted_law_violation: safety.convicted_law_violation || false,
        convicted_law_violation_details:
          safety.convicted_law_violation_details || "",
      }));
    }

    // Load accident history
    const { data: accidents } = await supabase
      .from("driver_accident_history")
      .select("*")
      .eq("form_id", formId);
    if (accidents) {
      setFormData((prev) => ({ ...prev, accident_history: accidents }));
    }

    // Load traffic violations
    const { data: violations } = await supabase
      .from("driver_traffic_violations")
      .select("*")
      .eq("form_id", formId);
    if (violations) {
      setFormData((prev) => ({ ...prev, traffic_violations: violations }));
    }

    // Load employment history
    const { data: employment } = await supabase
      .from("driver_employment_history")
      .select("*")
      .eq("form_id", formId);
    if (employment) {
      setFormData((prev) => ({ ...prev, employment_history: employment }));
    }

    // Load employment gaps
    const { data: gaps } = await supabase
      .from("driver_employment_gaps")
      .select("*")
      .eq("form_id", formId);
    if (gaps) {
      setFormData((prev) => ({ ...prev, employment_gaps: gaps }));
    }
  };

  const saveProgress = async (stepToSave?: number) => {
    if (!applicationId) return;

    try {
      // Upsert main form data
      const formPayload = {
        application_id: applicationId,
        first_name: formData.first_name,
        middle_name: formData.middle_name,
        last_name: formData.last_name,
        current_address: formData.current_address,
        previous_address_1: formData.previous_address_1,
        previous_address_2: formData.previous_address_2,
        phone_number: formData.phone_number,
        date_of_birth: formData.date_of_birth || null,
        ssn_encrypted: formData.ssn, // TODO: Encrypt in production
        years_at_current_address: formData.years_at_current_address,
        legally_authorized_to_work: formData.legally_authorized_to_work,
        emergency_contact_name: formData.emergency_contact_name,
        emergency_contact_relation: formData.emergency_contact_relation,
        emergency_contact_address: formData.emergency_contact_address,
        emergency_contact_phone: formData.emergency_contact_phone,
        dl_number: formData.dl_number,
        dl_state: formData.dl_state,
        dl_type: formData.dl_type,
        dl_expiration_date: formData.dl_expiration_date || null,
        applicant_signature: formData.applicant_signature,
        applicant_print_name: formData.applicant_print_name,
        fcra_signature: formData.fcra_signature,
        fcra_print_name: formData.fcra_print_name,
        current_step: stepToSave !== undefined ? stepToSave : currentStep,
        status: "DRAFT",
        updated_at: new Date().toISOString(),
      };

      if (formId) {
        // Update existing
        await supabase
          .from("driver_application_forms")
          .update(formPayload)
          .eq("id", formId);
      } else {
        // Create new
        const { data: newForm, error } = await supabase
          .from("driver_application_forms")
          .insert(formPayload)
          .select()
          .single();

        if (error) throw error;
        if (newForm) setFormId(newForm.id);
      }
    } catch (error: any) {
      console.error("Error saving progress:", error);
    }
  };

  // Validation function for each step
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0: // Applicant Information
        return !!(
          formData.first_name &&
          formData.last_name &&
          formData.current_address &&
          formData.phone_number &&
          formData.date_of_birth &&
          formData.ssn &&
          formData.years_at_current_address !== undefined
        );
      case 1: // Work Authorization
        return formData.legally_authorized_to_work !== null;
      case 2: // Emergency Contact
        return !!(
          formData.emergency_contact_name &&
          formData.emergency_contact_relation &&
          formData.emergency_contact_address &&
          formData.emergency_contact_phone
        );
      case 3: // Driver License
        return !!(
          formData.dl_number &&
          formData.dl_state &&
          formData.dl_type &&
          formData.dl_expiration_date
        );
      case 4: // Driver Experience
        // Must have at least one experience entry
        if (formData.driver_experience.length === 0) return false;
        // All experience entries must have all required fields filled
        return formData.driver_experience.every(
          (exp) =>
            exp.equipment_type &&
            exp.from_date &&
            exp.to_date &&
            exp.approx_miles > 0
        );
      case 5: // Safety Questions
        // All safety questions are boolean, so they're always valid
        return true;
      case 6: // Accident History
        // Optional section, but if accidents are added, all fields must be filled
        if (formData.accident_history.length === 0) return true;
        return formData.accident_history.every(
          (acc) =>
            acc.accident_date &&
            acc.description &&
            acc.injuries !== undefined &&
            acc.fatalities !== undefined
        );
      case 7: // Traffic Violations
        // Optional section, but if violations are added, all fields must be filled
        if (formData.traffic_violations.length === 0) return true;
        return formData.traffic_violations.every(
          (vio) =>
            vio.violation_date && vio.location && vio.charge && vio.penalty
        );
      case 8: // Employment History
        // Either has employment history or checked no previous DOT employment
        if (formData.no_previous_dot_employment) return true;
        if (formData.employment_history.length === 0) return false;
        // All employment entries must have all required fields filled
        return formData.employment_history.every(
          (emp) =>
            emp.employer_name &&
            emp.employer_address &&
            emp.employer_phone &&
            emp.from_date &&
            emp.to_date &&
            emp.position &&
            emp.reason_for_leaving
        );
      case 9: // Employment Gaps
        // Optional section, but if gaps are added, all fields must be filled
        if (formData.employment_gaps.length === 0) return true;
        return formData.employment_gaps.every(
          (gap) => gap.activity_description && gap.from_date && gap.to_date
        );
      case 10: // Declarations
        return !!(
          formData.applicant_signature && formData.applicant_print_name
        );
      case 11: // FCRA Disclosure
        return !!(formData.fcra_signature && formData.fcra_print_name);
      case 12: // Document Upload
        // Always valid, documents are optional
        return true;
      default:
        return true;
    }
  };

  const handleNext = async () => {
    if (!isStepValid(currentStep)) {
      toast({
        title: "Required Fields Missing",
        description: "Please fill in all required fields before proceeding.",
        variant: "destructive",
      });
      return;
    }

    if (currentStep < STEPS.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      window.scrollTo(0, 0);

      // Save progress with the new step
      await saveProgress(nextStep);
    } else {
      // Save progress on the current step
      await saveProgress(currentStep);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleSubmit = async () => {
    if (!applicationId || !formId) return;

    try {
      setSubmitting(true);

      // Save all related data
      await saveAllRelatedData();

      // Mark form as submitted
      await supabase
        .from("driver_application_forms")
        .update({
          status: "SUBMITTED",
          submitted_at: new Date().toISOString(),
        })
        .eq("id", formId);

      // Mark application as form completed
      await supabase
        .from("driver_applications")
        .update({
          application_form_completed_at: new Date().toISOString(),
        })
        .eq("id", applicationId);

      setIsSubmitted(true);
      toast({
        title: "Application Submitted!",
        description: "Your application has been submitted successfully.",
      });
    } catch (error: any) {
      console.error("Error submitting application:", error);
      toast({
        title: "Error",
        description: "Failed to submit application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const saveAllRelatedData = async () => {
    if (!formId) return;

    // Save safety questions
    await supabase
      .from("driver_safety_questions")
      .delete()
      .eq("form_id", formId);
    await supabase.from("driver_safety_questions").insert({
      form_id: formId,
      denied_license: formData.denied_license,
      denied_license_details: formData.denied_license_details,
      license_suspended: formData.license_suspended,
      license_suspended_details: formData.license_suspended_details,
      convicted_cmv_crime: formData.convicted_cmv_crime,
      convicted_cmv_crime_details: formData.convicted_cmv_crime_details,
      convicted_law_violation: formData.convicted_law_violation,
      convicted_law_violation_details: formData.convicted_law_violation_details,
    });

    // Save driver experience
    if (formData.driver_experience.length > 0) {
      await supabase.from("driver_experience").delete().eq("form_id", formId);
      await supabase
        .from("driver_experience")
        .insert(
          formData.driver_experience.map((exp) => ({ ...exp, form_id: formId }))
        );
    }

    // Save accident history
    if (formData.accident_history.length > 0) {
      await supabase
        .from("driver_accident_history")
        .delete()
        .eq("form_id", formId);
      await supabase
        .from("driver_accident_history")
        .insert(
          formData.accident_history.map((acc) => ({ ...acc, form_id: formId }))
        );
    }

    // Save traffic violations
    if (formData.traffic_violations.length > 0) {
      await supabase
        .from("driver_traffic_violations")
        .delete()
        .eq("form_id", formId);
      await supabase.from("driver_traffic_violations").insert(
        formData.traffic_violations.map((vio) => ({
          ...vio,
          form_id: formId,
        }))
      );
    }

    // Save employment history
    if (formData.employment_history.length > 0) {
      await supabase
        .from("driver_employment_history")
        .delete()
        .eq("form_id", formId);
      await supabase.from("driver_employment_history").insert(
        formData.employment_history.map((emp) => ({
          ...emp,
          form_id: formId,
        }))
      );
    }

    // Save employment gaps
    if (formData.employment_gaps.length > 0) {
      await supabase
        .from("driver_employment_gaps")
        .delete()
        .eq("form_id", formId);
      await supabase
        .from("driver_employment_gaps")
        .insert(
          formData.employment_gaps.map((gap) => ({ ...gap, form_id: formId }))
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Application Submitted!</h1>
          <p className="text-muted-foreground">
            Thank you for completing your driver application. Our HR team will
            review your information and contact you soon.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Driver Application Form</h1>
          <p className="text-muted-foreground">
            Please complete all sections of this application form.
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              Step {currentStep + 1} of {STEPS.length}
            </span>
            <span className="text-sm text-muted-foreground">
              {STEPS[currentStep]}
            </span>
          </div>
          <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Form Content */}
        <Card className="p-6 md:p-8">{renderStep()}</Card>

        {/* Validation Message */}
        {!isStepValid(currentStep) && (
          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              ⚠️ Please complete all required fields (marked with{" "}
              <span className="text-red-500">*</span>) to continue to the next
              step.
            </p>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          {currentStep === STEPS.length - 1 ? (
            <Button
              onClick={handleSubmit}
              disabled={submitting || !isStepValid(currentStep)}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Application"
              )}
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={!isStepValid(currentStep)}>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  function renderStep() {
    switch (currentStep) {
      case 0:
        return renderApplicantInformation();
      case 1:
        return renderWorkAuthorization();
      case 2:
        return renderEmergencyContact();
      case 3:
        return renderDriverLicense();
      case 4:
        return renderDriverExperience();
      case 5:
        return renderSafetyQuestions();
      case 6:
        return renderAccidentHistory();
      case 7:
        return renderTrafficViolations();
      case 8:
        return renderEmploymentHistory();
      case 9:
        return renderEmploymentGaps();
      case 10:
        return renderDeclarations();
      case 11:
        return renderFCRADisclosure();
      case 12:
        return renderDocumentUpload();
      default:
        return null;
    }
  }

  function renderApplicantInformation() {
    const showPreviousAddress1 = formData.years_at_current_address < 3;
    const showPreviousAddress2 =
      formData.years_at_current_address < 3 && formData.previous_address_1;

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Step 1 — Applicant Information</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="first_name">
              First Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="first_name"
              value={formData.first_name}
              onChange={(e) =>
                setFormData({ ...formData, first_name: e.target.value })
              }
              required
            />
          </div>
          <div>
            <Label htmlFor="middle_name">Middle Name</Label>
            <Input
              id="middle_name"
              value={formData.middle_name}
              onChange={(e) =>
                setFormData({ ...formData, middle_name: e.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor="last_name">
              Last Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="last_name"
              value={formData.last_name}
              onChange={(e) =>
                setFormData({ ...formData, last_name: e.target.value })
              }
              required
            />
          </div>
        </div>

        <div>
          <Label htmlFor="current_address">
            Current Address (Street, City, State, Zip){" "}
            <span className="text-red-500">*</span>
          </Label>
          <Input
            id="current_address"
            value={formData.current_address}
            onChange={(e) =>
              setFormData({ ...formData, current_address: e.target.value })
            }
            placeholder="123 Main St, City, State 12345"
            required
          />
        </div>

        <div>
          <Label htmlFor="years_at_current_address">
            Years at Current Address <span className="text-red-500">*</span>
          </Label>
          <Input
            id="years_at_current_address"
            type="number"
            min="0"
            step="0.1"
            value={formData.years_at_current_address}
            onChange={(e) =>
              setFormData({
                ...formData,
                years_at_current_address: parseFloat(e.target.value) || 0,
              })
            }
            required
          />
        </div>

        {showPreviousAddress1 && (
          <div>
            <Label htmlFor="previous_address_1">
              Previous Address #1 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="previous_address_1"
              value={formData.previous_address_1}
              onChange={(e) =>
                setFormData({ ...formData, previous_address_1: e.target.value })
              }
              placeholder="Previous address (if lived < 3 years at current)"
              required
            />
          </div>
        )}

        {showPreviousAddress2 && (
          <div>
            <Label htmlFor="previous_address_2">Previous Address #2</Label>
            <Input
              id="previous_address_2"
              value={formData.previous_address_2}
              onChange={(e) =>
                setFormData({ ...formData, previous_address_2: e.target.value })
              }
              placeholder="Additional previous address if needed"
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="phone_number">
              Phone Number <span className="text-red-500">*</span>
            </Label>
            <Input
              id="phone_number"
              type="tel"
              value={formData.phone_number}
              onChange={(e) =>
                setFormData({ ...formData, phone_number: e.target.value })
              }
              placeholder="(555) 123-4567"
              required
            />
          </div>
          <div>
            <Label htmlFor="date_of_birth">
              Date of Birth <span className="text-red-500">*</span>
            </Label>
            <Input
              id="date_of_birth"
              type="date"
              max={maxDate}
              value={formData.date_of_birth || maxDate}
              onChange={(e) =>
                setFormData({ ...formData, date_of_birth: e.target.value })
              }
              required
            />
          </div>
        </div>

        <div>
          <Label htmlFor="ssn">
            Social Security Number <span className="text-red-500">*</span>
          </Label>
          <Input
            id="ssn"
            type="text"
            value={formData.ssn}
            onChange={(e) => setFormData({ ...formData, ssn: e.target.value })}
            placeholder="XXX-XX-XXXX"
            maxLength={11}
            required
          />
          <p className="text-xs text-muted-foreground mt-1">
            Your SSN is encrypted and stored securely.
          </p>
        </div>
      </div>
    );
  }

  function renderWorkAuthorization() {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Step 2 — Work Authorization</h2>

        <div className="space-y-4">
          <Label>
            Are you legally authorized to work in the U.S.?{" "}
            <span className="text-red-500">*</span>
          </Label>
          <div className="flex gap-4">
            <Button
              type="button"
              variant={
                formData.legally_authorized_to_work === true
                  ? "default"
                  : "outline"
              }
              onClick={() =>
                setFormData({ ...formData, legally_authorized_to_work: true })
              }
            >
              Yes
            </Button>
            <Button
              type="button"
              variant={
                formData.legally_authorized_to_work === false
                  ? "default"
                  : "outline"
              }
              onClick={() =>
                setFormData({ ...formData, legally_authorized_to_work: false })
              }
            >
              No
            </Button>
          </div>

          {formData.legally_authorized_to_work === false && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ You must be legally authorized to work in the U.S. to be
                eligible for this position.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderEmergencyContact() {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Step 3 — Emergency Contact</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="emergency_contact_name">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="emergency_contact_name"
              value={formData.emergency_contact_name}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  emergency_contact_name: e.target.value,
                })
              }
              required
            />
          </div>
          <div>
            <Label htmlFor="emergency_contact_relation">
              Relation <span className="text-red-500">*</span>
            </Label>
            <Input
              id="emergency_contact_relation"
              value={formData.emergency_contact_relation}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  emergency_contact_relation: e.target.value,
                })
              }
              required
            />
          </div>
        </div>
        <div>
          <Label htmlFor="emergency_contact_address">
            Address <span className="text-red-500">*</span>
          </Label>
          <Input
            id="emergency_contact_address"
            value={formData.emergency_contact_address}
            onChange={(e) =>
              setFormData({
                ...formData,
                emergency_contact_address: e.target.value,
              })
            }
            required
          />
        </div>
        <div>
          <Label htmlFor="emergency_contact_phone">
            Phone Number <span className="text-red-500">*</span>
          </Label>
          <Input
            id="emergency_contact_phone"
            type="tel"
            value={formData.emergency_contact_phone}
            onChange={(e) =>
              setFormData({
                ...formData,
                emergency_contact_phone: e.target.value,
              })
            }
            required
          />
        </div>
      </div>
    );
  }

  function renderDriverLicense() {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">
          Step 4 — Driver License Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="dl_number">
              License Number <span className="text-red-500">*</span>
            </Label>
            <Input
              id="dl_number"
              value={formData.dl_number}
              onChange={(e) =>
                setFormData({ ...formData, dl_number: e.target.value })
              }
              required
            />
          </div>
          <div>
            <Label htmlFor="dl_state">
              State <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.dl_state}
              onValueChange={(value) =>
                setFormData({ ...formData, dl_state: value })
              }
            >
              <SelectTrigger id="dl_state">
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map((state) => (
                  <SelectItem key={state} value={state}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="dl_type">
              Type <span className="text-red-500">*</span>
            </Label>
            <Input
              id="dl_type"
              value={formData.dl_type}
              onChange={(e) =>
                setFormData({ ...formData, dl_type: e.target.value })
              }
              placeholder="e.g., CDL-A"
              required
            />
          </div>
          <div>
            <Label htmlFor="dl_expiration_date">
              Expiration Date <span className="text-red-500">*</span>
            </Label>
            <Input
              id="dl_expiration_date"
              type="date"
              value={formData.dl_expiration_date}
              min={minDateToday}
              onChange={(e) =>
                setFormData({ ...formData, dl_expiration_date: e.target.value })
              }
              required
            />
          </div>
        </div>
      </div>
    );
  }

  function renderDriverExperience() {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Step 5 — Driver Experience</h2>
        <p className="text-sm text-muted-foreground">
          Add your driving experience with different equipment types.
        </p>

        {formData.driver_experience.map((exp, index) => (
          <Card key={index} className="p-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Experience #{index + 1}</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const updated = formData.driver_experience.filter(
                      (_, i) => i !== index
                    );
                    setFormData({ ...formData, driver_experience: updated });
                  }}
                >
                  Remove
                </Button>
              </div>

              <div>
                <Label htmlFor={`equipment_type_${index}`}>
                  Equipment Type <span className="text-red-500">*</span>
                </Label>
                <Input
                  id={`equipment_type_${index}`}
                  value={exp.equipment_type}
                  onChange={(e) => {
                    const updated = [...formData.driver_experience];
                    updated[index].equipment_type = e.target.value;
                    setFormData({ ...formData, driver_experience: updated });
                  }}
                  placeholder="e.g., Tractor-Trailer, Straight Truck, etc."
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`from_date_${index}`}>
                    From Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id={`from_date_${index}`}
                    type="date"
                    value={exp.from_date}
                    max={dateToday}
                    onChange={(e) => {
                      const updated = [...formData.driver_experience];
                      updated[index].from_date = e.target.value;
                      setFormData({ ...formData, driver_experience: updated });
                    }}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor={`to_date_${index}`}>
                    To Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id={`to_date_${index}`}
                    type="date"
                    value={exp.to_date}
                    max={dateToday}
                    onChange={(e) => {
                      const updated = [...formData.driver_experience];
                      updated[index].to_date = e.target.value;
                      setFormData({ ...formData, driver_experience: updated });
                    }}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor={`approx_miles_${index}`}>
                  Approximate Miles <span className="text-red-500">*</span>
                </Label>
                <Input
                  id={`approx_miles_${index}`}
                  type="number"
                  value={exp.approx_miles}
                  onChange={(e) => {
                    const updated = [...formData.driver_experience];
                    updated[index].approx_miles = parseInt(e.target.value) || 0;
                    setFormData({ ...formData, driver_experience: updated });
                  }}
                  placeholder="Total miles driven"
                  required
                />
              </div>
            </div>
          </Card>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={() =>
            setFormData({
              ...formData,
              driver_experience: [
                ...formData.driver_experience,
                {
                  equipment_type: "",
                  from_date: "",
                  to_date: "",
                  approx_miles: 0,
                },
              ],
            })
          }
        >
          Add Experience
        </Button>

        {formData.driver_experience.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No experience added yet. Click "Add Experience" to begin.
          </p>
        )}
      </div>
    );
  }

  function renderSafetyQuestions() {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">
          Step 6 — Required Safety Questions
        </h2>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id="denied_license"
              checked={formData.denied_license}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, denied_license: checked as boolean })
              }
            />
            <Label htmlFor="denied_license" className="font-normal">
              Have you ever been denied a license, permit, or privilege to
              operate a motor vehicle?
            </Label>
          </div>
          {formData.denied_license && (
            <Textarea
              placeholder="Please explain..."
              value={formData.denied_license_details}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  denied_license_details: e.target.value,
                })
              }
            />
          )}
        </div>
      </div>
    );
  }

  function renderAccidentHistory() {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">
          Step 7 — Accident History (Past 3 Years)
        </h2>
        <p className="text-sm text-muted-foreground">
          List any accidents in the past 3 years. If none, leave this section
          empty.
        </p>

        {formData.accident_history.map((accident, index) => (
          <Card key={index} className="p-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Accident #{index + 1}</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const updated = formData.accident_history.filter(
                      (_, i) => i !== index
                    );
                    setFormData({ ...formData, accident_history: updated });
                  }}
                >
                  Remove
                </Button>
              </div>

              <div>
                <Label htmlFor={`accident_date_${index}`}>
                  Accident Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id={`accident_date_${index}`}
                  type="date"
                  value={accident.accident_date}
                  max={dateToday}
                  onChange={(e) => {
                    const updated = [...formData.accident_history];
                    updated[index].accident_date = e.target.value;
                    setFormData({ ...formData, accident_history: updated });
                  }}
                  required
                />
              </div>

              <div>
                <Label htmlFor={`accident_description_${index}`}>
                  Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id={`accident_description_${index}`}
                  value={accident.description}
                  onChange={(e) => {
                    const updated = [...formData.accident_history];
                    updated[index].description = e.target.value;
                    setFormData({ ...formData, accident_history: updated });
                  }}
                  placeholder="Describe what happened..."
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`injuries_${index}`}>
                    Number of Injuries <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id={`injuries_${index}`}
                    type="number"
                    min="0"
                    value={accident.injuries}
                    onChange={(e) => {
                      const updated = [...formData.accident_history];
                      updated[index].injuries = parseInt(e.target.value) || 0;
                      setFormData({ ...formData, accident_history: updated });
                    }}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor={`fatalities_${index}`}>
                    Number of Fatalities <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id={`fatalities_${index}`}
                    type="number"
                    min="0"
                    value={accident.fatalities}
                    onChange={(e) => {
                      const updated = [...formData.accident_history];
                      updated[index].fatalities = parseInt(e.target.value) || 0;
                      setFormData({ ...formData, accident_history: updated });
                    }}
                    required
                  />
                </div>
              </div>
            </div>
          </Card>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={() =>
            setFormData({
              ...formData,
              accident_history: [
                ...formData.accident_history,
                {
                  accident_date: "",
                  description: "",
                  injuries: 0,
                  fatalities: 0,
                },
              ],
            })
          }
        >
          Add Accident
        </Button>

        {formData.accident_history.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No accidents reported.
          </p>
        )}
      </div>
    );
  }

  function renderTrafficViolations() {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">
          Step 8 — Traffic Violations (Past 3 Years)
        </h2>
        <p className="text-sm text-muted-foreground">
          List any traffic violations in the past 3 years. If none, leave this
          section empty.
        </p>

        {formData.traffic_violations.map((violation, index) => (
          <Card key={index} className="p-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Violation #{index + 1}</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const updated = formData.traffic_violations.filter(
                      (_, i) => i !== index
                    );
                    setFormData({ ...formData, traffic_violations: updated });
                  }}
                >
                  Remove
                </Button>
              </div>

              <div>
                <Label htmlFor={`violation_date_${index}`}>
                  Violation Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id={`violation_date_${index}`}
                  type="date"
                  value={violation.violation_date}
                  max={dateToday}
                  onChange={(e) => {
                    const updated = [...formData.traffic_violations];
                    updated[index].violation_date = e.target.value;
                    setFormData({ ...formData, traffic_violations: updated });
                  }}
                  required
                />
              </div>

              <div>
                <Label htmlFor={`location_${index}`}>
                  Location <span className="text-red-500">*</span>
                </Label>
                <Input
                  id={`location_${index}`}
                  value={violation.location}
                  onChange={(e) => {
                    const updated = [...formData.traffic_violations];
                    updated[index].location = e.target.value;
                    setFormData({ ...formData, traffic_violations: updated });
                  }}
                  placeholder="City, State"
                  required
                />
              </div>

              <div>
                <Label htmlFor={`charge_${index}`}>
                  Charge <span className="text-red-500">*</span>
                </Label>
                <Input
                  id={`charge_${index}`}
                  value={violation.charge}
                  onChange={(e) => {
                    const updated = [...formData.traffic_violations];
                    updated[index].charge = e.target.value;
                    setFormData({ ...formData, traffic_violations: updated });
                  }}
                  placeholder="e.g., Speeding, Failure to Signal"
                  required
                />
              </div>

              <div>
                <Label htmlFor={`penalty_${index}`}>
                  Penalty <span className="text-red-500">*</span>
                </Label>
                <Input
                  id={`penalty_${index}`}
                  value={violation.penalty}
                  onChange={(e) => {
                    const updated = [...formData.traffic_violations];
                    updated[index].penalty = e.target.value;
                    setFormData({ ...formData, traffic_violations: updated });
                  }}
                  placeholder="e.g., Fine, Points, License Suspension"
                  required
                />
              </div>
            </div>
          </Card>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={() =>
            setFormData({
              ...formData,
              traffic_violations: [
                ...formData.traffic_violations,
                { violation_date: "", location: "", charge: "", penalty: "" },
              ],
            })
          }
        >
          Add Violation
        </Button>

        {formData.traffic_violations.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No violations reported.
          </p>
        )}
      </div>
    );
  }

  function renderEmploymentHistory() {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Step 9 — Employment History</h2>
        {/*
        <p className="text-sm text-muted-foreground">
          DOT requires 10 years  of employment history for CMV drivers.
        </p>
        */}
        <div className="flex items-start gap-3">
          <Checkbox
            id="no_previous_dot_employment"
            checked={formData.no_previous_dot_employment}
            onCheckedChange={(checked) =>
              setFormData({
                ...formData,
                no_previous_dot_employment: checked as boolean,
              })
            }
          />
          <Label htmlFor="no_previous_dot_employment" className="font-normal">
            Check here if no previous employment experience working for a
            DOT-regulated employer in the last 3 years.
          </Label>
        </div>

        {!formData.no_previous_dot_employment &&
          formData.employment_history.map((employment, index) => (
            <Card key={index} className="p-4">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">Employment #{index + 1}</h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const updated = formData.employment_history.filter(
                        (_, i) => i !== index
                      );
                      setFormData({ ...formData, employment_history: updated });
                    }}
                  >
                    Remove
                  </Button>
                </div>

                <div>
                  <Label htmlFor={`employer_name_${index}`}>
                    Employer Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id={`employer_name_${index}`}
                    value={employment.employer_name}
                    onChange={(e) => {
                      const updated = [...formData.employment_history];
                      updated[index].employer_name = e.target.value;
                      setFormData({ ...formData, employment_history: updated });
                    }}
                    placeholder="Company name"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor={`employer_address_${index}`}>
                    Employer Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id={`employer_address_${index}`}
                    value={employment.employer_address}
                    onChange={(e) => {
                      const updated = [...formData.employment_history];
                      updated[index].employer_address = e.target.value;
                      setFormData({ ...formData, employment_history: updated });
                    }}
                    placeholder="Street, City, State, Zip"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor={`employer_phone_${index}`}>
                    Employer Phone <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id={`employer_phone_${index}`}
                    value={employment.employer_phone}
                    onChange={(e) => {
                      const updated = [...formData.employment_history];
                      updated[index].employer_phone = e.target.value;
                      setFormData({ ...formData, employment_history: updated });
                    }}
                    placeholder="(555) 123-4567"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`emp_from_date_${index}`}>
                      From Date <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id={`emp_from_date_${index}`}
                      type="date"
                      value={employment.from_date}
                      max={dateToday}
                      onChange={(e) => {
                        const updated = [...formData.employment_history];
                        updated[index].from_date = e.target.value;
                        setFormData({
                          ...formData,
                          employment_history: updated,
                        });
                      }}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor={`emp_to_date_${index}`}>
                      To Date <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id={`emp_to_date_${index}`}
                      type="date"
                      value={employment.to_date}
                      max={dateToday}
                      onChange={(e) => {
                        const updated = [...formData.employment_history];
                        updated[index].to_date = e.target.value;
                        setFormData({
                          ...formData,
                          employment_history: updated,
                        });
                      }}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor={`position_${index}`}>
                    Position <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id={`position_${index}`}
                    value={employment.position}
                    onChange={(e) => {
                      const updated = [...formData.employment_history];
                      updated[index].position = e.target.value;
                      setFormData({ ...formData, employment_history: updated });
                    }}
                    placeholder="Job title"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor={`reason_for_leaving_${index}`}>
                    Reason for Leaving <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id={`reason_for_leaving_${index}`}
                    value={employment.reason_for_leaving}
                    onChange={(e) => {
                      const updated = [...formData.employment_history];
                      updated[index].reason_for_leaving = e.target.value;
                      setFormData({ ...formData, employment_history: updated });
                    }}
                    placeholder="Why did you leave this position?"
                    rows={2}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id={`subject_to_fmcsrs_${index}`}
                      checked={employment.subject_to_fmcsrs}
                      onCheckedChange={(checked) => {
                        const updated = [...formData.employment_history];
                        updated[index].subject_to_fmcsrs = checked as boolean;
                        setFormData({
                          ...formData,
                          employment_history: updated,
                        });
                      }}
                    />
                    <Label
                      htmlFor={`subject_to_fmcsrs_${index}`}
                      className="font-normal"
                    >
                      Subject to FMCSRs (Federal Motor Carrier Safety
                      Regulations)
                    </Label>
                  </div>
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id={`subject_to_drug_testing_${index}`}
                      checked={employment.subject_to_drug_testing}
                      onCheckedChange={(checked) => {
                        const updated = [...formData.employment_history];
                        updated[index].subject_to_drug_testing =
                          checked as boolean;
                        setFormData({
                          ...formData,
                          employment_history: updated,
                        });
                      }}
                    />
                    <Label
                      htmlFor={`subject_to_drug_testing_${index}`}
                      className="font-normal"
                    >
                      Subject to DOT drug and alcohol testing
                    </Label>
                  </div>
                </div>
              </div>
            </Card>
          ))}

        <Button
          type="button"
          variant="outline"
          disabled={formData.no_previous_dot_employment}
          onClick={() =>
            setFormData({
              ...formData,
              employment_history: [
                ...formData.employment_history,
                {
                  employer_name: "",
                  employer_address: "",
                  employer_phone: "",
                  from_date: "",
                  to_date: "",
                  position: "",
                  reason_for_leaving: "",
                  subject_to_fmcsrs: false,
                  subject_to_drug_testing: false,
                },
              ],
            })
          }
        >
          Add Employment
        </Button>

        {!formData.no_previous_dot_employment &&
          formData.employment_history.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No employment history added yet.
            </p>
          )}
      </div>
    );
  }

  function renderEmploymentGaps() {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Step 10 — Employment Gaps</h2>
        <p className="text-sm text-muted-foreground">
          Explain any gaps in your employment history. If none, leave this
          section empty.
        </p>

        {formData.employment_gaps.map((gap, index) => (
          <Card key={index} className="p-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Gap #{index + 1}</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const updated = formData.employment_gaps.filter(
                      (_, i) => i !== index
                    );
                    setFormData({ ...formData, employment_gaps: updated });
                  }}
                >
                  Remove
                </Button>
              </div>

              <div>
                <Label htmlFor={`activity_description_${index}`}>
                  Activity Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id={`activity_description_${index}`}
                  value={gap.activity_description}
                  onChange={(e) => {
                    const updated = [...formData.employment_gaps];
                    updated[index].activity_description = e.target.value;
                    setFormData({ ...formData, employment_gaps: updated });
                  }}
                  placeholder="What were you doing during this time?"
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`gap_from_date_${index}`}>
                    From Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id={`gap_from_date_${index}`}
                    type="date"
                    value={gap.from_date}
                    max={dateToday}
                    onChange={(e) => {
                      const updated = [...formData.employment_gaps];
                      updated[index].from_date = e.target.value;
                      setFormData({ ...formData, employment_gaps: updated });
                    }}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor={`gap_to_date_${index}`}>
                    To Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id={`gap_to_date_${index}`}
                    type="date"
                    value={gap.to_date}
                    max={dateToday}
                    onChange={(e) => {
                      const updated = [...formData.employment_gaps];
                      updated[index].to_date = e.target.value;
                      setFormData({ ...formData, employment_gaps: updated });
                    }}
                    required
                  />
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id={`was_unemployed_${index}`}
                  checked={gap.was_unemployed}
                  onCheckedChange={(checked) => {
                    const updated = [...formData.employment_gaps];
                    updated[index].was_unemployed = checked as boolean;
                    setFormData({ ...formData, employment_gaps: updated });
                  }}
                />
                <Label
                  htmlFor={`was_unemployed_${index}`}
                  className="font-normal"
                >
                  I was unemployed during this period
                </Label>
              </div>
            </div>
          </Card>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={() =>
            setFormData({
              ...formData,
              employment_gaps: [
                ...formData.employment_gaps,
                {
                  activity_description: "",
                  from_date: "",
                  to_date: "",
                  was_unemployed: false,
                },
              ],
            })
          }
        >
          Add Gap
        </Button>

        {formData.employment_gaps.length === 0 && (
          <p className="text-sm text-muted-foreground">No gaps reported.</p>
        )}
      </div>
    );
  }

  function renderDeclarations() {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">
          Step 11 — Applicant Declarations & Consents
        </h2>
        <div className="space-y-4 text-sm">
          <p>
            I authorize investigation of my employment, financial, medical, and
            related history.
          </p>
          <p>I understand false information may result in discharge.</p>
          <p>
            I authorize employers to release information regarding safety
            performance history, drug/alcohol results, etc.
          </p>
        </div>
        <div>
          <Label htmlFor="applicant_print_name">
            Print Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="applicant_print_name"
            value={formData.applicant_print_name}
            onChange={(e) =>
              setFormData({ ...formData, applicant_print_name: e.target.value })
            }
            required
          />
        </div>
        <div>
          <Label htmlFor="applicant_signature">
            Signature (Type your full name){" "}
            <span className="text-red-500">*</span>
          </Label>
          <Input
            id="applicant_signature"
            value={formData.applicant_signature}
            onChange={(e) =>
              setFormData({ ...formData, applicant_signature: e.target.value })
            }
            placeholder="Type your full name as signature"
            required
          />
        </div>
      </div>
    );
  }

  function renderFCRADisclosure() {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">
          Step 12 — Fair Credit Reporting Act (FCRA) Disclosure
        </h2>
        <div className="space-y-4 text-sm">
          <p>
            By signing below, you acknowledge that you have read and understand
            the FCRA disclosure.
          </p>
        </div>
        <div>
          <Label htmlFor="fcra_print_name">
            Print Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="fcra_print_name"
            value={formData.fcra_print_name}
            onChange={(e) =>
              setFormData({ ...formData, fcra_print_name: e.target.value })
            }
            required
          />
        </div>
        <div>
          <Label htmlFor="fcra_signature">
            Signature (Type your full name){" "}
            <span className="text-red-500">*</span>
          </Label>
          <Input
            id="fcra_signature"
            value={formData.fcra_signature}
            onChange={(e) =>
              setFormData({ ...formData, fcra_signature: e.target.value })
            }
            placeholder="Type your full name as signature"
            required
          />
        </div>
      </div>
    );
  }

  function renderDocumentUpload() {
    if (!applicationId || !candidateId || !complianceId) {
      return (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Step 13 — Document Upload</h2>
          <p className="text-sm text-muted-foreground">
            Loading document upload...
          </p>
        </div>
      );
    }

    const isOwnerOperator = positionType === "OWNER_OPERATOR";

    const handleDocumentUpload = async (
      documentType: "dl" | "medical_card" | "ssn",
      fileUrl: string
    ) => {
      // Update the compliance record with the new file URL
      const columnMap = {
        dl: "drivers_license_url",
        medical_card: "medical_card_url",
        ssn: "ssn_url",
      };

      const { error } = await supabase
        .from("driver_compliance")
        .update({ [columnMap[documentType]]: fileUrl })
        .eq("id", complianceId);

      if (error) {
        console.error("Error updating document:", error);
        toast({
          title: "Error",
          description: "Failed to save document",
          variant: "destructive",
        });
      }
    };

    const handleVerificationChange = async (
      documentType: "dl" | "medical_card" | "ssn",
      verified: boolean
    ) => {
      // This is handled by HR, not by the driver
      // We can leave this as a no-op for the driver form
    };

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Step 13 — Document Upload</h2>
        <p className="text-sm text-muted-foreground">
          Please upload all required documents.
        </p>

        <div className="space-y-4">
          <DocumentUpload
            candidateId={candidateId}
            complianceId={complianceId}
            documentType="dl"
            label="Driver License"
            onUploadComplete={(url) => handleDocumentUpload("dl", url)}
            onVerificationChange={(verified) =>
              handleVerificationChange("dl", verified)
            }
          />
          <DocumentUpload
            candidateId={candidateId}
            complianceId={complianceId}
            documentType="ssn"
            label="Social Security Card"
            onUploadComplete={(url) => handleDocumentUpload("ssn", url)}
            onVerificationChange={(verified) =>
              handleVerificationChange("ssn", verified)
            }
          />
          {!isOwnerOperator && (
            <DocumentUpload
              candidateId={candidateId}
              complianceId={complianceId}
              documentType="medical_card"
              label="Medical Card"
              onUploadComplete={(url) =>
                handleDocumentUpload("medical_card", url)
              }
              onVerificationChange={(verified) =>
                handleVerificationChange("medical_card", verified)
              }
            />
          )}
        </div>
      </div>
    );
  }
}
