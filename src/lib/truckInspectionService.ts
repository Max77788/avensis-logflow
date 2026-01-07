import { supabase } from "./supabase";

export interface InspectionItem {
  id: string;
  item_name: string;
  item_key: string;
  display_order: number;
  description?: string;
  category?: string;
  section?: string; // Section name for grouping
  section_order?: number; // Order of section
  item_order_in_section?: number; // Order within section
  risk_level?: number; // 1 = critical DOT shut-down, 2 = full walk-around
  location_order?: number; // Order for location-based flow (front to back)
  risk_order?: number; // Order for risk-first flow
}

export interface InspectionGroup {
  name: string;
  order: number;
  items: Array<InspectionItem & { status?: InspectionItemStatus }>;
}

export interface InspectionSection {
  name: string;
  order: number;
  items: Array<InspectionItem & { status?: InspectionItemStatus }>;
  groups?: InspectionGroup[];
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
    notes?: string,
    imageUrls?: string[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // If imageUrls is provided, use it directly (replace, don't merge)
      // This allows for both adding new images and removing existing ones
      const finalImageUrls = imageUrls !== undefined 
        ? (imageUrls.length > 0 ? imageUrls : null)
        : undefined;

      // If imageUrls is undefined, we need to preserve existing images
      // Otherwise, replace with the new array
      let imageUrlsToSave = finalImageUrls;
      
      if (finalImageUrls === undefined) {
        // Get existing record to preserve image URLs if not provided
        const { data: existing } = await supabase
          .from("truck_inspection_item_status")
          .select("image_urls")
          .eq("inspection_id", inspectionId)
          .eq("item_id", itemId)
          .single();

        imageUrlsToSave = existing?.image_urls || null;
      }

      const { error } = await supabase
        .from("truck_inspection_item_status")
        .upsert(
          {
            inspection_id: inspectionId,
            item_id: itemId,
            status,
            notes: notes !== undefined ? (notes || null) : undefined,
            image_urls: imageUrlsToSave,
            checked_at: new Date().toISOString(),
          },
          {
            onConflict: "inspection_id,item_id",
          }
        );

      if (error) throw error;

      // Update truck compliance status if an issue is reported
      if (status === "not_working") {
        await this.updateTruckComplianceStatus(inspectionId);
      }

      return { success: true };
    } catch (error: any) {
      console.error("Error updating item status:", error);
      return { success: false, error: error.message || "Failed to update item status" };
    }
  },

  /**
   * Update truck compliance status based on inspection results
   */
  async updateTruckComplianceStatus(
    inspectionId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get the inspection to find the truck_id
      const { data: inspection, error: inspectionError } = await supabase
        .from("truck_daily_inspections")
        .select("truck_id, inspection_date")
        .eq("id", inspectionId)
        .single();

      if (inspectionError) throw inspectionError;

      // Count the number of "not_working" items
      const { count: issuesCount, error: countError } = await supabase
        .from("truck_inspection_item_status")
        .select("*", { count: "exact", head: true })
        .eq("inspection_id", inspectionId)
        .eq("status", "not_working");

      if (countError) throw countError;

      // Determine compliance status
      const compliance_status = (issuesCount && issuesCount > 0) ? "restricted" : "active";
      const last_inspection_status = (issuesCount && issuesCount > 0) ? "issues_reported" : "passed";

      // Update the truck
      const { error: updateError } = await supabase
        .from("trucks")
        .update({
          compliance_status,
          last_inspection_date: inspection.inspection_date,
          last_inspection_status,
        })
        .eq("id", inspection.truck_id);

      if (updateError) throw updateError;

      return { success: true };
    } catch (error: any) {
      console.error("Error updating truck compliance:", error);
      return { success: false, error: error.message || "Failed to update truck compliance" };
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
   * Group items by sections and groups for the given inspection mode
   * mode: 'critical-issue-first' | 'location-based'
   */
  groupItemsBySections(
    items: Array<InspectionItem & { status?: any }>,
    mode: 'critical-issue-first' | 'location-based'
  ): InspectionSection[] {
    // Define sections and groups for location-based mode (Option 1 - Standard Clockwise Walk-Around)
    const locationBasedStructure = [
      {
        name: 'Front / Engine Area',
        order: 1,
        groups: [
          { name: 'Front / Engine Area', order: 1, itemKeys: ['air_compressor', 'engine', 'radiator', 'oil_pressure', 'belts_hoses'] },
        ],
      },
      {
        name: 'Cab / Interior',
        order: 2,
        groups: [
          { name: 'Cab / Interior', order: 1, itemKeys: ['horn', 'mirrors', 'windshield', 'windshield_wipers', 'defroster', 'heater', 'on_board_recorder'] },
        ],
      },
      {
        name: 'Driver Side',
        order: 3,
        groups: [
          { name: 'Driver Side', order: 1, itemKeys: ['fuel_tanks', 'battery', 'drive_line', 'exhaust_muffler'] },
        ],
      },
      {
        name: 'Axles & Wheels',
        order: 4,
        groups: [
          { name: 'Axles & Wheels', order: 1, itemKeys: ['front_axle', 'rear_end', 'tires', 'wheels', 'springs'] },
        ],
      },
      {
        name: 'Brakes & Air',
        order: 5,
        groups: [
          { name: 'Brakes & Air', order: 1, itemKeys: ['brakes', 'brake_accessories', 'air_lines'] },
        ],
      },
      {
        name: 'Coupling Area',
        order: 6,
        groups: [
          { name: 'Coupling Area', order: 1, itemKeys: ['fifth_wheel'] },
        ],
      },
      {
        name: 'Lights & Visibility',
        order: 7,
        groups: [
          { name: 'Lights & Visibility', order: 1, itemKeys: ['headlights', 'tail_dash', 'turn_indicators', 'reflectors'] },
        ],
      },
      {
        name: 'Safety',
        order: 8,
        groups: [
          { name: 'Safety', order: 1, itemKeys: ['safety_equipment', 'fire_extinguisher', 'flags_flares_fuses', 'spare_bulbs_fuses'] },
        ],
      },
      {
        name: 'Trailer Section',
        order: 9,
        groups: [
          { name: 'Trailer Section', order: 1, itemKeys: ['brake_connection', 'trailer_brakes', 'coupling_king_pin', 'landing_gear', 'trailer_lights_all', 'trailer_tires', 'trailer_wheels', 'trailer_doors', 'trailer_roof', 'trailer_tarpaulin', 'trailer_springs'] },
        ],
      },
    ];

    // Define sections and groups for critical-issue-first mode (Option 2 - Risk-First Walk-Around)
    const criticalIssueFirstStructure = [
      {
        name: 'Phase 1 – Critical DOT Shut-Down Items',
        order: 1,
        groups: [
          { 
            name: 'Lights', 
            order: 1, 
            itemKeys: ['lights', 'head_stop', 'tail_dash', 'turn_indicators', 'reflectors', 'trailer_lights_all']
          },
          { 
            name: 'Tires & Wheels', 
            order: 2, 
            itemKeys: ['tires', 'wheels']
          },
          { 
            name: 'Brakes & Air', 
            order: 3, 
            itemKeys: ['brakes', 'brake_accessories', 'air_lines']
          },
          { 
            name: 'Leaks / Powertrain', 
            order: 4, 
            itemKeys: ['engine', 'oil_pressure', 'fuel_tanks', 'drive_line']
          },
          { 
            name: 'Coupling', 
            order: 5, 
            itemKeys: ['fifth_wheel', 'coupling_king_pin']
          },
        ],
      },
      {
        name: 'Phase 2 – Remaining DVIR Items',
        order: 2,
        groups: [
          { 
            name: 'Cab & Controls', 
            order: 1, 
            itemKeys: ['horn', 'mirrors', 'windshield', 'windshield_wipers', 'defroster', 'heater', 'on_board_recorder']
          },
          { 
            name: 'Mechanical', 
            order: 2, 
            itemKeys: ['air_compressor', 'battery', 'radiator', 'muffler', 'transmission', 'clutch', 'starter', 'steering']
          },
          { 
            name: 'Suspension & Structure', 
            order: 3, 
            itemKeys: ['front_axle', 'rear_end', 'springs', 'frame_roof']
          },
          { 
            name: 'Safety', 
            order: 4, 
            itemKeys: ['safety_equipment', 'fire_extinguisher', 'flags_flares_fuses', 'spare_bulbs_fuses']
          },
          { 
            name: 'Trailer', 
            order: 5, 
            itemKeys: ['brake_connection', 'landing_gear', 'trailer_doors', 'trailer_tarpaulin']
          },
        ],
      },
    ];

    const structure = mode === 'critical-issue-first' ? criticalIssueFirstStructure : locationBasedStructure;

    const groupedSections: InspectionSection[] = structure.map((sectionDef) => {
      const sectionGroups: InspectionGroup[] = sectionDef.groups.map((groupDef) => {
        const groupItems = groupDef.itemKeys
          .map((key) => items.find((item) => item.item_key === key))
          .filter((item): item is InspectionItem & { status?: any } => item !== undefined);

        return {
          name: groupDef.name,
          order: groupDef.order,
          items: groupItems,
        };
      }); // Remove filter to show all groups, even if empty

      // Flatten groups into items for backward compatibility
      const allSectionItems = sectionGroups.flatMap((group) => group.items);

      return {
        name: sectionDef.name,
        order: sectionDef.order,
        items: allSectionItems,
        groups: sectionGroups,
      };
    }); // Remove filter to show all sections, even if empty

    return groupedSections;
  },

  /**
   * Reorder items based on inspection flow type (legacy method, kept for backward compatibility)
   * flowType: 'critical-issue-first' | 'location-based'
   */
  reorderItemsByFlowType(
    items: Array<InspectionItem & { status?: any }>,
    flowType: 'critical-issue-first' | 'location-based'
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

    const orderMap = flowType === 'critical-issue-first' ? riskFirstOrder : locationOrder;

    // Sort items based on the selected flow type
    const sorted = [...items].sort((a, b) => {
      const orderA = orderMap[a.item_key] ?? (flowType === 'critical-issue-first' ? 999 : a.display_order);
      const orderB = orderMap[b.item_key] ?? (flowType === 'critical-issue-first' ? 999 : b.display_order);
      return orderA - orderB;
    });

    return sorted;
  },
};
