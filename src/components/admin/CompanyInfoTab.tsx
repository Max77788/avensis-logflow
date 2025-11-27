import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  adminService,
  Company,
  CompanyType,
  CompanyStatus,
} from "@/lib/adminService";
import {
  Loader2,
  Save,
  Lock,
  KeyRound,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { SetPasswordDialog } from "./SetPasswordDialog";
import { OnboardingRibbon } from "./OnboardingRibbon";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CompanyInfoTabProps {
  company: Company;
  onUpdate: () => void;
}

export const CompanyInfoTab = ({ company, onUpdate }: CompanyInfoTabProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showPortalAccessDialog, setShowPortalAccessDialog] = useState(false);
  const [isTogglingPortalAccess, setIsTogglingPortalAccess] = useState(false);
  const [formData, setFormData] = useState({
    name: company.name,
    type: company.type,
    status: company.status,
    business_address: (company as any).business_address || "",
    city: company.city || "",
    state: company.state || "",
    zip: company.zip || "",
    legal_name_for_invoicing: (company as any).legal_name_for_invoicing || "",
    mailing_address: (company as any).mailing_address || "",
    mc_number: (company as any).mc_number || "",
    dot_number: (company as any).dot_number || "",
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await adminService.updateCompany(company.id, formData);

      if (result.success) {
        toast({
          title: "Success",
          description: "Company updated successfully",
        });
        setIsEditing(false);
        onUpdate();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update company",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: company.name,
      type: company.type,
      status: company.status,
      business_address: (company as any).business_address || "",
      city: company.city || "",
      state: company.state || "",
      zip: company.zip || "",
      legal_name_for_invoicing: (company as any).legal_name_for_invoicing || "",
      mailing_address: (company as any).mailing_address || "",
      mc_number: (company as any).mc_number || "",
      dot_number: (company as any).dot_number || "",
    });
    setIsEditing(false);
  };

  const handleTogglePortalAccess = async () => {
    setIsTogglingPortalAccess(true);
    try {
      const newStatus = !company.portal_access_enabled;
      const result = await adminService.enablePortalAccess(
        company.id,
        newStatus
      );

      if (result.success) {
        toast({
          title: "Success",
          description: `Portal access ${
            newStatus ? "enabled" : "disabled"
          } successfully`,
        });
        setShowPortalAccessDialog(false);
        onUpdate();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update portal access",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsTogglingPortalAccess(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Onboarding Progress Ribbon */}
      <OnboardingRibbon company={company} />

      {/* Portal Access Control */}
      <div className="bg-muted/50 border border-border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {company.portal_access_enabled ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <h4 className="font-semibold">Portal Access</h4>
              <p className="text-sm text-muted-foreground">
                {company.portal_access_enabled
                  ? `Enabled on ${
                      company.portal_activated_at
                        ? new Date(
                            company.portal_activated_at
                          ).toLocaleDateString()
                        : "N/A"
                    }`
                  : "Portal access is currently disabled"}
              </p>
            </div>
          </div>
          <Button
            variant={company.portal_access_enabled ? "destructive" : "default"}
            onClick={() => setShowPortalAccessDialog(true)}
            className="gap-2"
          >
            {company.portal_access_enabled ? (
              <>
                <XCircle className="h-4 w-4" />
                Disable Access
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Enable Access
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Company Information</h3>
        <div className="flex gap-2">
          {/* Password Management Button */}
          <Button
            variant="outline"
            onClick={() => setShowPasswordDialog(true)}
            className="gap-2"
          >
            {company.password_hash ? (
              <>
                <KeyRound className="h-4 w-4" />
                Change Password
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                Set Password
              </>
            )}
          </Button>

          {/* Edit/Save Buttons */}
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)}>Edit</Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4">
        {/* Company Name */}
        <div className="grid gap-2">
          <Label htmlFor="name">Company Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            disabled={!isEditing}
          />
        </div>

        {/* Company Type */}
        <div className="grid gap-2">
          <Label htmlFor="company_type">Company Type</Label>
          <Select
            value={formData.type}
            onValueChange={(value) =>
              setFormData({ ...formData, type: value as CompanyType })
            }
            disabled={!isEditing}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Carrier">Carrier</SelectItem>
              <SelectItem value="Scale House">Scale House</SelectItem>
              <SelectItem value="Destination Client">
                Destination Client
              </SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status */}
        <div className="grid gap-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value) =>
              setFormData({ ...formData, status: value as CompanyStatus })
            }
            disabled={!isEditing}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Draft">Draft</SelectItem>
              <SelectItem value="Onboarding Invited">
                Onboarding Invited
              </SelectItem>
              <SelectItem value="Onboarding In Progress">
                Onboarding In Progress
              </SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Address 
        <div className="grid gap-2">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            value={formData.address}
            onChange={(e) =>
              setFormData({ ...formData, address: e.target.value })
            }
            disabled={!isEditing}
          />
        </div>
        */}

        {/* City, State, Zip */}
        <div className="grid grid-cols-3 gap-2">
          <div className="grid gap-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) =>
                setFormData({ ...formData, city: e.target.value })
              }
              disabled={!isEditing}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              value={formData.state}
              onChange={(e) =>
                setFormData({ ...formData, state: e.target.value })
              }
              disabled={!isEditing}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="zip">Zip</Label>
            <Input
              id="zip"
              value={formData.zip}
              onChange={(e) =>
                setFormData({ ...formData, zip: e.target.value })
              }
              disabled={!isEditing}
            />
          </div>
        </div>

        {/* Business Address */}
        <div className="grid gap-2">
          <Label htmlFor="business_address">Business Address</Label>
          <Input
            id="business_address"
            value={formData.business_address}
            onChange={(e) =>
              setFormData({ ...formData, business_address: e.target.value })
            }
            disabled={!isEditing}
          />
        </div>

        {/* Legal Name for Invoicing */}
        <div className="grid gap-2">
          <Label htmlFor="legal_name_for_invoicing">
            Legal Name for Invoicing
          </Label>
          <Input
            id="legal_name_for_invoicing"
            value={formData.legal_name_for_invoicing}
            onChange={(e) =>
              setFormData({
                ...formData,
                legal_name_for_invoicing: e.target.value,
              })
            }
            disabled={!isEditing}
          />
        </div>

        {/* Mailing Address */}
        <div className="grid gap-2">
          <Label htmlFor="mailing_address">
            Mailing Address (if different)
          </Label>
          <Input
            id="mailing_address"
            value={formData.mailing_address}
            onChange={(e) =>
              setFormData({ ...formData, mailing_address: e.target.value })
            }
            disabled={!isEditing}
          />
        </div>

        {/* MC Number and DOT Number */}
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-2">
            <Label htmlFor="mc_number">MC Number</Label>
            <Input
              id="mc_number"
              value={formData.mc_number}
              onChange={(e) =>
                setFormData({ ...formData, mc_number: e.target.value })
              }
              disabled={!isEditing}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="dot_number">DOT Number</Label>
            <Input
              id="dot_number"
              value={formData.dot_number}
              onChange={(e) =>
                setFormData({ ...formData, dot_number: e.target.value })
              }
              disabled={!isEditing}
            />
          </div>
        </div>

        {/* File URLs (Read-only) */}
        {((company as any).coi_file_url || (company as any).w9_file_url) && (
          <div className="grid gap-2">
            <Label>Uploaded Documents</Label>
            <div className="space-y-2">
              {(company as any).coi_file_url && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">COI:</span>
                  <a
                    href={(company as any).coi_file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    View Certificate of Insurance
                  </a>
                </div>
              )}
              {(company as any).w9_file_url && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">W9:</span>
                  <a
                    href={(company as any).w9_file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    View W9 Form
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Password Management Dialog */}
      <SetPasswordDialog
        open={showPasswordDialog}
        onOpenChange={setShowPasswordDialog}
        company={company}
        onSuccess={onUpdate}
      />

      {/* Portal Access Confirmation Dialog */}
      <AlertDialog
        open={showPortalAccessDialog}
        onOpenChange={setShowPortalAccessDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {company.portal_access_enabled
                ? "Disable Portal Access"
                : "Enable Portal Access"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {company.portal_access_enabled ? (
                <>
                  Are you sure you want to disable portal access for{" "}
                  <strong>{company.name}</strong>? Users will no longer be able
                  to log in to the carrier portal.
                </>
              ) : (
                <>
                  Are you sure you want to enable portal access for{" "}
                  <strong>{company.name}</strong>? This will allow authorized
                  users to log in to the carrier portal.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isTogglingPortalAccess}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTogglePortalAccess}
              disabled={isTogglingPortalAccess}
              className={
                company.portal_access_enabled
                  ? "bg-destructive hover:bg-destructive/90"
                  : ""
              }
            >
              {isTogglingPortalAccess && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {company.portal_access_enabled ? "Disable" : "Enable"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
