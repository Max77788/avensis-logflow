import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle, XCircle, Eye, Edit2 } from "lucide-react";
import { Card } from "@/components/ui/card";

interface TruckWithCompliance {
  id: string;
  truck_id: string;
  carrier_id: string;
  status: string;
  compliance_status: string;
  admin_notes: string | null;
  last_inspection_date: string | null;
  last_inspection_status: string | null;
  license_plate: string | null;
  license_state: string | null;
  truck_type: string | null;
  vin: string | null;
  created_at: string;
  carrier_name?: string;
  issues_count?: number;
}

interface InspectionIssue {
  item_name: string;
  notes: string;
  status: string;
  checked_at: string;
}

export const AdminFleetComplianceTab = () => {
  const [trucks, setTrucks] = useState<TruckWithCompliance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTruck, setSelectedTruck] = useState<TruckWithCompliance | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [inspectionDialogOpen, setInspectionDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [editForm, setEditForm] = useState({
    compliance_status: "",
    admin_notes: "",
  });

  const [inspectionIssues, setInspectionIssues] = useState<InspectionIssue[]>([]);

  useEffect(() => {
    loadFleetData();
  }, []);

  const loadFleetData = async () => {
    setIsLoading(true);
    try {
      // Get all trucks with their carrier info and latest inspection data
      const { data: trucksData, error: trucksError } = await supabase
        .from("trucks")
        .select(`
          *,
          carrier:companies!trucks_carrier_id_fkey_companies(name)
        `)
        .order("created_at", { ascending: false });

      if (trucksError) throw trucksError;

      // For each truck, get the count of "not_working" items from latest inspection
      const trucksWithIssues = await Promise.all(
        (trucksData || []).map(async (truck) => {
          // Get latest inspection for this truck
          const { data: latestInspection } = await supabase
            .from("truck_daily_inspections")
            .select("id, inspection_date")
            .eq("truck_id", truck.id)
            .order("inspection_date", { ascending: false })
            .limit(1)
            .single();

          let issuesCount = 0;
          if (latestInspection) {
            // Count "not_working" items
            const { count } = await supabase
              .from("truck_inspection_item_status")
              .select("*", { count: "exact", head: true })
              .eq("inspection_id", latestInspection.id)
              .eq("status", "not_working");

            issuesCount = count || 0;
          }

          return {
            ...truck,
            carrier_name: (truck.carrier as any)?.name || "Unknown",
            issues_count: issuesCount,
          };
        })
      );

      setTrucks(trucksWithIssues);
    } catch (error: any) {
      console.error("Error loading fleet data:", error);
      toast({
        title: "Error",
        description: "Failed to load fleet data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = (truck: TruckWithCompliance) => {
    setSelectedTruck(truck);
    setEditForm({
      compliance_status: truck.compliance_status || "active",
      admin_notes: truck.admin_notes || "",
    });
    setEditDialogOpen(true);
  };

  const handleViewInspection = async (truck: TruckWithCompliance) => {
    setSelectedTruck(truck);
    
    try {
      // Get latest inspection
      const { data: latestInspection } = await supabase
        .from("truck_daily_inspections")
        .select("id, inspection_date")
        .eq("truck_id", truck.id)
        .order("inspection_date", { ascending: false })
        .limit(1)
        .single();

      if (!latestInspection) {
        toast({
          title: "No Inspection Found",
          description: "This truck has no inspection records yet.",
        });
        return;
      }

      // Get all "not_working" items from the inspection
      const { data: issues } = await supabase
        .from("truck_inspection_item_status")
        .select(`
          status,
          notes,
          checked_at,
          item:truck_inspection_items(item_name)
        `)
        .eq("inspection_id", latestInspection.id)
        .eq("status", "not_working");

      const formattedIssues = (issues || []).map((issue: any) => ({
        item_name: issue.item?.item_name || "Unknown Item",
        notes: issue.notes || "No notes provided",
        status: issue.status,
        checked_at: issue.checked_at,
      }));

      setInspectionIssues(formattedIssues);
      setInspectionDialogOpen(true);
    } catch (error: any) {
      console.error("Error loading inspection:", error);
      toast({
        title: "Error",
        description: "Failed to load inspection details",
        variant: "destructive",
      });
    }
  };

  const handleSaveChanges = async () => {
    if (!selectedTruck) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("trucks")
        .update({
          compliance_status: editForm.compliance_status,
          admin_notes: editForm.admin_notes,
        })
        .eq("id", selectedTruck.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Truck compliance status updated successfully",
      });

      setEditDialogOpen(false);
      loadFleetData(); // Reload data
    } catch (error: any) {
      console.error("Error updating truck:", error);
      toast({
        title: "Error",
        description: "Failed to update truck status",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getComplianceBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500">Active</Badge>;
      case "restricted":
        return <Badge className="bg-red-500">Restricted</Badge>;
      case "inactive":
        return <Badge className="bg-gray-500">Inactive</Badge>;
      default:
        return <Badge className="bg-gray-500">{status}</Badge>;
    }
  };

  const getInspectionStatusIcon = (issuesCount: number) => {
    if (issuesCount === 0) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else {
      return <AlertTriangle className="h-5 w-5 text-red-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Fleet Compliance Management</h3>
        <p className="text-sm text-muted-foreground">
          Monitor truck inspections and manage compliance status. Trucks with reported issues are automatically flagged for admin review.
        </p>
      </div>

      {/* Trucks Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Truck ID</TableHead>
              <TableHead>Carrier</TableHead>
              <TableHead>License Plate</TableHead>
              <TableHead>VIN</TableHead>
              <TableHead>Inspection Status</TableHead>
              <TableHead>Issues</TableHead>
              <TableHead>Compliance Status</TableHead>
              <TableHead>Last Inspection</TableHead>
              <TableHead>Admin Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : trucks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">
                  No trucks found
                </TableCell>
              </TableRow>
            ) : (
              trucks.map((truck) => (
                <TableRow key={truck.id}>
                  <TableCell className="font-medium">{truck.truck_id}</TableCell>
                  <TableCell>{truck.carrier_name}</TableCell>
                  <TableCell>{truck.license_plate || "-"}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {truck.vin || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getInspectionStatusIcon(truck.issues_count || 0)}
                      {truck.issues_count === 0 ? "No Issues" : `${truck.issues_count} Issue(s)`}
                    </div>
                  </TableCell>
                  <TableCell>
                    {truck.issues_count && truck.issues_count > 0 ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewInspection(truck)}
                        className="gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                    ) : (
                      <span className="text-muted-foreground text-sm">None</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {getComplianceBadge(truck.compliance_status || "active")}
                  </TableCell>
                  <TableCell>
                    {truck.last_inspection_date
                      ? new Date(truck.last_inspection_date).toLocaleDateString()
                      : "-"}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {truck.admin_notes || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditClick(truck)}
                      className="gap-2"
                    >
                      <Edit2 className="h-4 w-4" />
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Compliance Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Truck Compliance Status</DialogTitle>
            <DialogDescription>
              Update the compliance status and add admin notes for truck{" "}
              <span className="font-semibold">{selectedTruck?.truck_id}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Compliance Status */}
            <div className="space-y-2">
              <Label htmlFor="compliance_status">Compliance Status</Label>
              <Select
                value={editForm.compliance_status}
                onValueChange={(value) =>
                  setEditForm({ ...editForm, compliance_status: value })
                }
              >
                <SelectTrigger id="compliance_status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active (Ready to Use)</SelectItem>
                  <SelectItem value="restricted">
                    Restricted (Has Issues - Admin Review)
                  </SelectItem>
                  <SelectItem value="inactive">Inactive (Not Available)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Active: Truck is ready for use | Restricted: Issues reported, needs review | Inactive: Truck not available
              </p>
            </div>

            {/* Admin Notes */}
            <div className="space-y-2">
              <Label htmlFor="admin_notes">Admin Notes</Label>
              <Textarea
                id="admin_notes"
                placeholder="Add notes about compliance issues, restrictions, or actions taken..."
                value={editForm.admin_notes}
                onChange={(e) =>
                  setEditForm({ ...editForm, admin_notes: e.target.value })
                }
                rows={6}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Document any issues, actions taken, or reasons for status changes
              </p>
            </div>

            {/* Current Issue Count */}
            {selectedTruck && selectedTruck.issues_count !== undefined && (
              <Card className="p-4 bg-muted/50">
                <div className="flex items-center gap-2">
                  {getInspectionStatusIcon(selectedTruck.issues_count)}
                  <div>
                    <p className="text-sm font-medium">
                      Latest Inspection: {selectedTruck.issues_count === 0 ? "No Issues Reported" : `${selectedTruck.issues_count} Issue(s) Reported`}
                    </p>
                    {selectedTruck.last_inspection_date && (
                      <p className="text-xs text-muted-foreground">
                        Last inspected on {new Date(selectedTruck.last_inspection_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveChanges} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Inspection Issues Dialog */}
      <Dialog open={inspectionDialogOpen} onOpenChange={setInspectionDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Inspection Issues - {selectedTruck?.truck_id}</DialogTitle>
            <DialogDescription>
              Problems reported during the most recent inspection
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {inspectionIssues.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No issues found in the latest inspection
              </div>
            ) : (
              inspectionIssues.map((issue, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-start gap-3">
                    <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                    <div className="flex-1 space-y-1">
                      <h4 className="font-semibold">{issue.item_name}</h4>
                      <p className="text-sm text-muted-foreground">{issue.notes}</p>
                      <p className="text-xs text-muted-foreground">
                        Reported: {new Date(issue.checked_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setInspectionDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

