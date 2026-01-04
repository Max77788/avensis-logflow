import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { truckInspectionService, type DailyInspection, type InspectionItem } from "@/lib/truckInspectionService";
import { toast } from "@/hooks/use-toast";

interface TruckInspectionChecklistProps {
  truckId: string;
  driverId?: string;
}

export const TruckInspectionChecklist = ({
  truckId,
  driverId,
}: TruckInspectionChecklistProps) => {
  const [inspection, setInspection] = useState<DailyInspection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  useEffect(() => {
    loadInspection();
  }, [truckId, driverId]);

  const loadInspection = async () => {
    if (!truckId) return;

    setIsLoading(true);
    const result = await truckInspectionService.getOrCreateTodayInspection(
      truckId,
      driverId
    );

    if (result.success && result.data) {
      setInspection(result.data);
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to load inspection",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const handleItemToggle = async (itemId: string, currentStatus: string) => {
    if (!inspection) return;

    const newStatus = currentStatus === "working" ? "not_working" : "working";
    setIsUpdating(itemId);

    const result = await truckInspectionService.updateItemStatus(
      inspection.id,
      itemId,
      newStatus
    );

    if (result.success) {
      // Update local state
      setInspection({
        ...inspection,
        items: inspection.items?.map((item) => {
          if (item.id === itemId) {
            return {
              ...item,
              status: item.status
                ? {
                    ...item.status,
                    status: newStatus,
                    checked_at: new Date().toISOString(),
                  }
                : {
                    id: "",
                    item_id: itemId,
                    status: newStatus,
                    checked_at: new Date().toISOString(),
                  },
            };
          }
          return item;
        }),
      });

      toast({
        title: "Updated",
        description: `Item marked as ${newStatus === "working" ? "working" : "not working"}`,
      });
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to update item",
        variant: "destructive",
      });
    }

    setIsUpdating(null);
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  if (!inspection || !inspection.items || inspection.items.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground text-center py-4">
          No inspection items found
        </p>
      </Card>
    );
  }

  const workingCount = inspection.items.filter(
    (item) => item.status?.status === "working"
  ).length;
  const notWorkingCount = inspection.items.filter(
    (item) => item.status?.status === "not_working"
  ).length;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Truck Inspection Checklist</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Daily inspection - {new Date(inspection.inspection_date).toLocaleDateString()}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadInspection}
          disabled={isLoading}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary */}
      <div className="flex gap-4 mb-6 pb-4 border-b">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium">
            {workingCount} Working
          </span>
        </div>
        <div className="flex items-center gap-2">
          <XCircle className="h-4 w-4 text-red-600" />
          <span className="text-sm font-medium">
            {notWorkingCount} Not Working
          </span>
        </div>
      </div>

      {/* Checklist Items */}
      <div className="space-y-3">
        {inspection.items.map((item) => {
          const status = item.status?.status || "working";
          const isWorking = status === "working";
          const isUpdatingItem = isUpdating === item.id;

          return (
            <div
              key={item.id}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                isWorking
                  ? "bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800"
                  : "bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800"
              }`}
            >
              <Checkbox
                id={`item-${item.id}`}
                checked={isWorking}
                onCheckedChange={() => handleItemToggle(item.id, status)}
                disabled={isUpdatingItem}
                className="h-5 w-5"
              />
              <label
                htmlFor={`item-${item.id}`}
                className="flex-1 cursor-pointer flex items-center gap-2"
              >
                {isWorking ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                )}
                <span className="font-medium">{item.item_name}</span>
                {item.description && (
                  <span className="text-sm text-muted-foreground">
                    - {item.description}
                  </span>
                )}
              </label>
              {isUpdatingItem && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          );
        })}
      </div>

      {notWorkingCount > 0 && (
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ {notWorkingCount} item{notWorkingCount !== 1 ? "s" : ""} marked as not working.
            Please report any issues to maintenance.
          </p>
        </div>
      )}
    </Card>
  );
};
