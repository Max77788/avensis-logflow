import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Mail, CheckCircle2, Circle, Loader2, Send } from "lucide-react";
import { adminService, Company, OnboardingEmail, PortalUser } from "@/lib/adminService";
import { toast } from "@/hooks/use-toast";

interface CompanyOnboardingTabProps {
  company: Company;
  onUpdate: () => void;
}

export const CompanyOnboardingTab = ({
  company,
  onUpdate,
}: CompanyOnboardingTabProps) => {
  const [emails, setEmails] = useState<OnboardingEmail[]>([]);
  const [portalUsers, setPortalUsers] = useState<PortalUser[]>([]);
  const [stats, setStats] = useState({
    trucks_count: 0,
    drivers_count: 0,
    contacts_count: 0,
    destination_sites_count: 0,
    pickup_sites_count: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [emailTo, setEmailTo] = useState("");

  useEffect(() => {
    loadData();
  }, [company.id]);

  const loadData = async () => {
    setIsLoading(true);
    const [emailsData, usersData, statsData] = await Promise.all([
      adminService.getOnboardingEmails(company.id),
      adminService.getPortalUsers(company.id),
      adminService.getCompanyStats(company.id),
    ]);
    setEmails(emailsData);
    setPortalUsers(usersData);
    setStats(statsData);
    setIsLoading(false);
  };

  const handleSendEmail = async () => {
    if (!emailTo) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    if (portalUsers.length === 0) {
      toast({
        title: "Error",
        description: "Please create a portal user first",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const user = portalUsers[0];
      const result = await adminService.sendOnboardingEmail({
        company_id: company.id,
        company_name: company.name,
        sent_to: emailTo,
        sent_by: "Admin",
        username: user.email,
        temp_password: user.temp_password || "********",
      });

      if (result.success) {
        toast({
          title: "Success",
          description: "Onboarding email sent successfully",
        });
        setShowEmailDialog(false);
        setEmailTo("");
        loadData();
        onUpdate();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to send email",
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
      setIsSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Complete":
        return <Badge className="bg-green-500">Complete</Badge>;
      case "In Progress":
        return <Badge className="bg-blue-500">In Progress</Badge>;
      case "Not Started":
        return <Badge variant="secondary">Not Started</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Onboarding Progress */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Onboarding Progress</h3>
        <div className="space-y-4">
          {/* Agreement Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {company.agreement_status === "Accepted" ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">Agreement</p>
                <p className="text-sm text-muted-foreground">
                  {company.agreement_accepted_at
                    ? `Accepted on ${new Date(company.agreement_accepted_at).toLocaleDateString()}`
                    : "Not accepted yet"}
                </p>
              </div>
            </div>
            {getStatusBadge(company.agreement_status)}
          </div>

          {/* Company Details */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {company.company_details_status === "Complete" ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">Company Details</p>
              </div>
            </div>
            {getStatusBadge(company.company_details_status)}
          </div>

          {/* Contacts */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {company.contacts_status === "Complete" ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">Contacts</p>
                <p className="text-sm text-muted-foreground">
                  {stats.contacts_count} contact(s)
                </p>
              </div>
            </div>
            {getStatusBadge(company.contacts_status)}
          </div>

          {/* Fleet */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {company.fleet_status === "Complete" ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">Fleet</p>
                <p className="text-sm text-muted-foreground">
                  {stats.trucks_count} truck(s)
                </p>
              </div>
            </div>
            {getStatusBadge(company.fleet_status)}
          </div>

          {/* Drivers */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {company.drivers_status === "Complete" ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">Drivers</p>
                <p className="text-sm text-muted-foreground">
                  {stats.drivers_count} driver(s)
                </p>
              </div>
            </div>
            {getStatusBadge(company.drivers_status)}
          </div>

          {/* Portal Access */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {company.portal_access_enabled ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">Portal Access</p>
                <p className="text-sm text-muted-foreground">
                  {company.portal_activated_at
                    ? `Activated on ${new Date(company.portal_activated_at).toLocaleDateString()}`
                    : "Not activated"}
                </p>
              </div>
            </div>
            <Badge
              className={
                company.portal_access_enabled ? "bg-green-500" : "bg-gray-500"
              }
            >
              {company.portal_access_enabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Send Onboarding Email */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Onboarding Email</h3>
            <p className="text-sm text-muted-foreground">
              Send onboarding email with portal credentials
            </p>
          </div>
          <Button onClick={() => setShowEmailDialog(true)}>
            <Send className="h-4 w-4 mr-2" />
            Send Email
          </Button>
        </div>

        {/* Email History */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sent To</TableHead>
                <TableHead>Sent By</TableHead>
                <TableHead>Sent At</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {emails.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    No emails sent yet
                  </TableCell>
                </TableRow>
              ) : (
                emails.map((email) => (
                  <TableRow key={email.id}>
                    <TableCell>{email.sent_to}</TableCell>
                    <TableCell>{email.sent_by}</TableCell>
                    <TableCell>
                      {new Date(email.sent_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-green-500">{email.email_status}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Send Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Onboarding Email</DialogTitle>
            <DialogDescription>
              Send onboarding email to {company.name}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email_to">Send To *</Label>
              <Input
                id="email_to"
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder={company.contact_email || "email@example.com"}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEmailDialog(false)}
              disabled={isSending}
            >
              Cancel
            </Button>
            <Button onClick={handleSendEmail} disabled={isSending || !emailTo}>
              {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

