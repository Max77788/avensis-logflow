import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Eye, EyeOff, RefreshCw } from "lucide-react";
import * as CryptoJS from "crypto-js";

const ROLES = [
  { value: "driver", label: "Driver" },
  { value: "attendant", label: "Scalehouse (Attendant)" },
];

export const AddUserDialog = ({ open, onOpenChange, onSuccess }: { open: boolean; onOpenChange: (v: boolean) => void; onSuccess?: () => void; }) => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "driver",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const generatePassword = () => Math.random().toString(36).slice(-10) + Math.random().toString(36).toUpperCase().slice(-2);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleRoleChange = (role: string) => {
    setForm(f => ({ ...f, role }));
  };

  const handleGeneratePassword = () => {
    setForm(f => ({ ...f, password: generatePassword() }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (!form.name || !form.email || !form.password) {
        toast({ title: "All fields are required.", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }
      // Hash password
      const password_hash = CryptoJS.SHA256(form.password).toString();
      // Call backend/userService to create user; replace with real service
      const res = await fetch("/api/admin/users", { // Or use a real service
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, password_hash }),
      });
      if (!res.ok) throw new Error("Failed to create user");
      toast({ title: "User created successfully!", description: `A new ${form.role} account was created.`, variant: "default" });
      setForm({ name: "", email: "", password: "", role: "driver" });
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add User (Driver or Scalehouse)</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input name="name" value={form.name} onChange={handleChange} placeholder="Full Name" autoComplete="off" required />
          <Input name="email" type="email" value={form.email} onChange={handleChange} placeholder="Email (username)" autoComplete="off" required />
          <div className="flex gap-2">
            <Input
              name="password"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={handleChange}
              placeholder="Password"
              autoComplete="off"
              required
            />
            <Button type="button" variant="ghost" onClick={() => setShowPassword(v => !v)}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button type="button" variant="ghost" onClick={handleGeneratePassword}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline">{ROLES.find(r => r.value === form.role)?.label || ROLES[0].label}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {ROLES.map(r => (
                <DropdownMenuItem key={r.value} onClick={() => handleRoleChange(r.value)}>{r.label}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Adding..." : "Add User"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
export default AddUserDialog;

