import { supabase } from "./supabase";

export interface InspectionItem {
  id: string;
  item_name: string;
  item_key: string;
  display_order: number;
  description?: string;
}

export interface InspectionItemStatus {
  id: string;
  item_id: string;
  status: "working" | "not_working";
  notes?: string;
  checked_at: string;
}

export interface DailyInspection {
  id: string;
  truck_id: string;
  driver_id?: string;
  inspection_date: string;
  items?: Array<InspectionItem & { status?: InspectionItemStatus }>;
}

export const truckInspectionService = {
  /**
   * Get or create today's inspection for a truck
   * If no inspection exists for today, creates a new one with all items set to "working"
   */
  async getOrCreateTodayInspection(
    truckId: string,
    driverId?: string
  ): Promise<{ success: boolean; data?: DailyInspection; error?: string }> {
    try {
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

      // Check if inspection exists for today
      const { data: existingInspection, error: fetchError } = await supabase
        .from("truck_daily_inspections")
        .select("*")
        .eq("truck_id", truckId)
        .eq("inspection_date", today)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        throw fetchError;
      }

      if (existingInspection) {
        // Load the inspection with items and their statuses
        return await this.getInspectionWithItems(existingInspection.id);
      }

      // Create new inspection for today
      const { data: newInspection, error: createError } = await supabase
        .from("truck_daily_inspections")
        .insert({
          truck_id: truckId,
          driver_id: driverId || null,
          inspection_date: today,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Get all inspection items
      const { data: items, error: itemsError } = await supabase
        .from("truck_inspection_items")
        .select("*")
        .order("display_order", { ascending: true });

      if (itemsError) throw itemsError;

      // Create default "working" status for all items
      if (items && items.length > 0) {
        const statusInserts = items.map((item) => ({
          inspection_id: newInspection.id,
          item_id: item.id,
          status: "working" as const,
        }));

        const { error: statusError } = await supabase
          .from("truck_inspection_item_status")
          .insert(statusInserts);

        if (statusError) throw statusError;
      }

      // Return the full inspection with items
      return await this.getInspectionWithItems(newInspection.id);
    } catch (error: any) {
      console.error("Error getting or creating inspection:", error);
      return { success: false, error: error.message || "Failed to get inspection" };
    }
  },

  /**
   * Get inspection with all items and their statuses
   */
  async getInspectionWithItems(
    inspectionId: string
  ): Promise<{ success: boolean; data?: DailyInspection; error?: string }> {
    try {
      // Get inspection
      const { data: inspection, error: inspectionError } = await supabase
        .from("truck_daily_inspections")
        .select("*")
        .eq("id", inspectionId)
        .single();

      if (inspectionError) throw inspectionError;

      // Get all items with their statuses for this inspection
      const { data: itemsWithStatus, error: itemsError } = await supabase
        .from("truck_inspection_item_status")
        .select(
          `
          *,
          item:truck_inspection_items(*)
        `
        )
        .eq("inspection_id", inspectionId);

      if (itemsError) throw itemsError;

      // Get all items to ensure we have everything (in case some weren't initialized)
      const { data: allItems, error: allItemsError } = await supabase
        .from("truck_inspection_items")
        .select("*")
        .order("display_order", { ascending: true });

      if (allItemsError) throw allItemsError;

      // Map items with their statuses
      const statusMap = new Map(
        (itemsWithStatus || []).map((itemStatus: any) => [
          itemStatus.item_id,
          {
            id: itemStatus.id,
            item_id: itemStatus.item_id,
            status: itemStatus.status,
            notes: itemStatus.notes,
            checked_at: itemStatus.checked_at,
          },
        ])
      );

      const items = (allItems || []).map((item) => ({
        ...item,
        status: statusMap.get(item.id),
      }));

      return {
        success: true,
        data: {
          ...inspection,
          items: items as any,
        },
      };
    } catch (error: any) {
      console.error("Error getting inspection with items:", error);
      return { success: false, error: error.message || "Failed to get inspection" };
    }
  },

  /**
   * Update the status of an inspection item
   */
  async updateItemStatus(
    inspectionId: string,
    itemId: string,
    status: "working" | "not_working",
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from("truck_inspection_item_status")
        .upsert(
          {
            inspection_id: inspectionId,
            item_id: itemId,
            status,
            notes: notes || null,
            checked_at: new Date().toISOString(),
          },
          {
            onConflict: "inspection_id,item_id",
          }
        );

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error("Error updating item status:", error);
      return { success: false, error: error.message || "Failed to update item status" };
    }
  },

  /**
   * Get all inspection items (for reference)
   */
  async getAllInspectionItems(): Promise<{
    success: boolean;
    data?: InspectionItem[];
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from("truck_inspection_items")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error: any) {
      console.error("Error getting inspection items:", error);
      return { success: false, error: error.message || "Failed to get inspection items" };
    }
  },
};
