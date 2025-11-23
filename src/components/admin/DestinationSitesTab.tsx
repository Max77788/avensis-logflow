import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit, Trash2, Loader2, Search } from "lucide-react";
import { adminService, DestinationSite, Company } from "@/lib/adminService";
import { toast } from "@/hooks/use-toast";

export const DestinationSitesTab = () => {
  const [sites, setSites] = useState<DestinationSite[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingSite, setEditingSite] = useState<DestinationSite | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    company_id: "",
    name: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    default_email: "",
    gps_location: "",
    notes: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      console.log("Starting to load data...");

      const sitesData = await adminService.getAllDestinationSites();
      console.log("Loaded destination sites:", sitesData.length, sitesData);

      const companiesData = await adminService.getAllCompanies();
      console.log("Loaded companies:", companiesData.length, companiesData);

      setSites(sitesData);
      setCompanies(companiesData);

      console.log(
        "State updated - sites:",
        sitesData.length,
        "companies:",
        companiesData.length
      );
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingSite(null);
    setFormData({
      company_id: "",
      name: "",
      address: "",
      city: "",
      state: "",
      zip: "",
      default_email: "",
      gps_location: "",
      notes: "",
    });
    setShowDialog(true);
  };

  const handleEdit = (site: DestinationSite) => {
    setEditingSite(site);
    setFormData({
      company_id: site.company_id,
      name: site.name,
      address: site.address || "",
      city: site.city || "",
      state: site.state || "",
      zip: site.zip || "",
      default_email: site.default_email || "",
      gps_location: site.gps_location || "",
      notes: site.notes || "",
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.company_id || !formData.name) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      let result;
      if (editingSite) {
        result = await adminService.updateDestinationSite(
          editingSite.id,
          formData
        );
      } else {
        result = await adminService.createDestinationSite(formData);
      }

      if (result.success) {
        toast({
          title: "Success",
          description: `Site ${
            editingSite ? "updated" : "created"
          } successfully`,
        });
        setShowDialog(false);
        loadData();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to save site",
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

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this site?")) return;

    const result = await adminService.deleteDestinationSite(id);
    if (result.success) {
      toast({
        title: "Success",
        description: "Site deleted successfully",
      });
      loadData();
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to delete site",
        variant: "destructive",
      });
    }
  };

  const filteredSites = sites.filter(
    (site) =>
      site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      site.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      site.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCompanyName = (companyId: string) => {
    const company = companies.find((c) => c.id === companyId);
    return company?.name || "Unknown";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search sites..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Site
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Site Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>City</TableHead>
              <TableHead>State</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredSites.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  No sites found
                </TableCell>
              </TableRow>
            ) : (
              filteredSites.map((site) => (
                <TableRow key={site.id}>
                  <TableCell className="font-medium">{site.name}</TableCell>
                  <TableCell>{getCompanyName(site.company_id)}</TableCell>
                  <TableCell>{site.address || "-"}</TableCell>
                  <TableCell>{site.city || "-"}</TableCell>
                  <TableCell>{site.state || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(site)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(site.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSite ? "Edit Destination Site" : "Add Destination Site"}
            </DialogTitle>
            <DialogDescription>
              {editingSite
                ? "Update destination site information"
                : "Add a new destination site"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="company_id">Company *</Label>
              <Select
                value={formData.company_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, company_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      companies.length === 0
                        ? "Loading companies..."
                        : "Select company"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {companies.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No companies available
                    </div>
                  ) : (
                    companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name">Site Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="grid gap-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
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
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="default_email">Default Email</Label>
              <Input
                id="default_email"
                type="email"
                value={formData.default_email}
                onChange={(e) =>
                  setFormData({ ...formData, default_email: e.target.value })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="gps_location">GPS Location</Label>
              <Input
                id="gps_location"
                value={formData.gps_location}
                onChange={(e) =>
                  setFormData({ ...formData, gps_location: e.target.value })
                }
                placeholder="lat,long"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !formData.company_id || !formData.name}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingSite ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
