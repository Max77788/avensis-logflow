import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Plus, Lock, Unlock, RotateCw, Loader2, Copy } from "lucide-react";
import { adminService, PortalUser, Company } from "@/lib/adminService";
import { toast } from "@/hooks/use-toast";

interface CompanyPortalUsersTabProps {
  companyId: string;
  company: Company;
}

export const CompanyPortalUsersTab = ({
  companyId,
  company,
}: CompanyPortalUsersTabProps) => {
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    loadUsers();
  }, [companyId]);

  const loadUsers = async () => {
    setIsLoading(true);
    const data = await adminService.getPortalUsers(companyId);
    setUsers(data);
    setIsLoading(false);
  };

  const handleCreateUser = async () => {
    if (!newUserEmail) return;

    setIsSaving(true);
    try {
      const result = await adminService.createPortalUser({
        company_id: companyId,
        email: newUserEmail,
      });

      if (result.success && result.data) {
        setNewPassword(result.data.temp_password);
        setShowPasswordDialog(true);
        setShowCreateDialog(false);
        setNewUserEmail("");
        loadUsers();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create user",
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

  const handleResetPassword = async (userId: string) => {
    const result = await adminService.resetPortalUserPassword(userId);
    if (result.success && result.temp_password) {
      setNewPassword(result.temp_password);
      setShowPasswordDialog(true);
      toast({
        title: "Success",
        description: "Password reset successfully",
      });
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to reset password",
        variant: "destructive",
      });
    }
  };

  const handleToggleLock = async (userId: string, currentlyLocked: boolean) => {
    const result = await adminService.togglePortalUserLock(userId, !currentlyLocked);
    if (result.success) {
      toast({
        title: "Success",
        description: `User ${currentlyLocked ? "unlocked" : "locked"} successfully`,
      });
      loadUsers();
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to update user",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Copied to clipboard",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Portal Users</h3>
          <p className="text-sm text-muted-foreground">
            Manage portal access credentials for this company
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create User
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  No portal users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {user.is_locked ? (
                        <Badge variant="destructive">Locked</Badge>
                      ) : user.is_enabled ? (
                        <Badge className="bg-green-500">Enabled</Badge>
                      ) : (
                        <Badge variant="secondary">Disabled</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.last_login_at
                      ? new Date(user.last_login_at).toLocaleDateString()
                      : "Never"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResetPassword(user.id)}
                        title="Reset Password"
                      >
                        <RotateCw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleLock(user.id, user.is_locked)}
                        title={user.is_locked ? "Unlock User" : "Lock User"}
                      >
                        {user.is_locked ? (
                          <Unlock className="h-4 w-4" />
                        ) : (
                          <Lock className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Portal User</DialogTitle>
            <DialogDescription>
              Create a new portal user for {company.name}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateUser} disabled={isSaving || !newUserEmail}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Display Dialog */}
      <AlertDialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Temporary Password Generated</AlertDialogTitle>
            <AlertDialogDescription>
              Please save this password. It will not be shown again.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="bg-muted p-4 rounded-md">
            <div className="flex items-center justify-between">
              <code className="text-lg font-mono">{newPassword}</code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(newPassword)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowPasswordDialog(false)}>
              I've Saved the Password
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

