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
import { Loader2, Save, Lock, KeyRound } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { SetPasswordDialog } from "./SetPasswordDialog";
import { OnboardingRibbon } from "./OnboardingRibbon";

interface CompanyInfoTabProps {
  company: Company;
  onUpdate: () => void;
}

export const CompanyInfoTab = ({ company, onUpdate }: CompanyInfoTabProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: company.name,
    company_type: company.company_type,
    status: company.status,
    address: company.address || "",
    city: company.city || "",
    state: company.state || "",
    zip: company.zip || "",
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
      company_type: company.company_type,
      status: company.status,
      address: company.address || "",
      city: company.city || "",
      state: company.state || "",
      zip: company.zip || "",
    });
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      {/* Onboarding Progress Ribbon */}
      <OnboardingRibbon company={company} />

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
            value={formData.company_type}
            onValueChange={(value) =>
              setFormData({ ...formData, company_type: value as CompanyType })
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

        {/* Address */}
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
      </div>

      {/* Password Management Dialog */}
      <SetPasswordDialog
        open={showPasswordDialog}
        onOpenChange={setShowPasswordDialog}
        company={company}
        onSuccess={onUpdate}
      />
    </div>
  );
};
