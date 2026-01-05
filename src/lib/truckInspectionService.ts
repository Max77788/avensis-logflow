import { supabase } from "./supabase";

export interface InspectionItem {
  id: string;
  item_name: string;
  item_key: string;
  display_order: number;
  description?: string;
  category?: string;
  risk_level?: number; // 1 = critical DOT shut-down, 2 = full walk-around
  location_order?: number; // Order for location-based flow (front to back)
  risk_order?: number; // Order for risk-first flow
}

export interface InspectionItemStatus {
  id: string;
  item_id: string;
  status: "working" | "not_working";
  notes?: string;
  image_urls?: string[];
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
            image_urls: itemStatus.image_urls || [],
            checked_at: itemStatus.checked_at,
          },
        ])
      );

      const items = (allItems || []).map((item) => ({
        ...item,
        status: statusMap.get(item.id),
      }));

      // Default to location-based order (original behavior)
      const orderedItems = this.reorderItemsByFlowType(items as any, 'location-based');

      return {
        success: true,
        data: {
          ...inspection,
          items: orderedItems as any,
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
    notes?: string,
    imageUrls?: string[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get existing record to merge image URLs
      const { data: existing } = await supabase
        .from("truck_inspection_item_status")
        .select("image_urls")
        .eq("inspection_id", inspectionId)
        .eq("item_id", itemId)
        .single();

      const existingUrls = existing?.image_urls || [];
      const mergedUrls = imageUrls 
        ? [...new Set([...existingUrls, ...imageUrls])] 
        : existingUrls;

      const { error } = await supabase
        .from("truck_inspection_item_status")
        .upsert(
          {
            inspection_id: inspectionId,
            item_id: itemId,
            status,
            notes: notes || null,
            image_urls: mergedUrls.length > 0 ? mergedUrls : null,
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

  /**
   * Reorder items based on inspection flow type
   * flowType: 'risk-first' | 'location-based'
   */
  reorderItemsByFlowType(
    items: Array<InspectionItem & { status?: any }>,
    flowType: 'risk-first' | 'location-based'
  ): Array<InspectionItem & { status?: any }> {
    // Risk-first order mapping based on user specification
    const riskFirstOrder: Record<string, number> = {
      // Section 1 - Critical DOT Shut-Down Items
      'headlights_low_beam': 1,
      'headlights_high_beam': 2,
      'turn_signals': 3,
      'brake_lights': 4,
      'marker_clearance_lights': 5,
      'trailer_lights': 6,
      'tire_condition': 7,
      'tire_inflation': 8,
      'tread_depth': 9,
      'lug_nuts': 10,
      'rims': 11,
      'air_lines': 12,
      'brake_chambers': 13,
      'brake_damage': 14,
      'air_leaks': 15,
      'fuel_leaks': 16,
      'oil_leaks': 17,
      'coolant_leaks': 18,
      'air_leaks_visual': 19,
      'fifth_wheel_mounted': 20,
      'fifth_wheel_jaws': 21,
      'fifth_wheel_damage': 22,
      'coupling_lines': 23,
      // Section 2 - Full Walk-Around
      'windshield': 24,
      'wipers': 25,
      'mirrors': 26,
      'door': 27,
      'fuel_tank': 28,
      'def_tank': 29,
      'suspension': 30,
      'frame': 31,
      'exhaust': 32,
      'trailer_tires': 33,
      'trailer_brakes': 34,
      'trailer_lights': 35,
      'trailer_reflectors': 36,
      'trailer_doors': 37,
      'trailer_floor': 38,
      'rear_lights': 39,
      'reflectors': 40,
      'bumper': 41,
      'fire_extinguisher': 42,
      'warning_triangles': 43,
      'spare_fuses': 44,
    };

    // Location-based order (front to back)
    const locationOrder: Record<string, number> = {
      'windshield': 1,
      'wipers': 2,
      'headlights_low_beam': 3,
      'headlights_high_beam': 4,
      'turn_signals': 5,
      'front_wheels': 6,
      'mirrors': 7,
      'side_windows': 8,
      'fuel_tank': 9,
      'side_lights': 10,
      'rear_wheels': 11,
      'brake_lights': 12,
      'rear_lights': 13,
      'bumper': 14,
      'brakes': 15,
      'steering': 16,
      'horn': 17,
      'fluid_levels': 18,
      'dashboard_indicators': 19,
      'seatbelt': 20,
    };

    const orderMap = flowType === 'risk-first' ? riskFirstOrder : locationOrder;

    // Sort items based on the selected flow type
    const sorted = [...items].sort((a, b) => {
      const orderA = orderMap[a.item_key] ?? (flowType === 'risk-first' ? 999 : a.display_order);
      const orderB = orderMap[b.item_key] ?? (flowType === 'risk-first' ? 999 : b.display_order);
      return orderA - orderB;
    });

    return sorted;
  },
};
