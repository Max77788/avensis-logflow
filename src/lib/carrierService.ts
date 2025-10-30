import { supabase } from "./supabase";

export interface Carrier {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Truck {
  id: string;
  truck_id: string;
  carrier_id: string;
  created_at: string;
  updated_at: string;
}

export interface Driver {
  id: string;
  name: string;
  carrier_id: string;
  created_at: string;
  updated_at: string;
}

export const carrierService = {
  // ============================================================================
  // CARRIERS
  // ============================================================================

  async getAllCarriers(): Promise<Carrier[]> {
    try {
      const { data, error } = await supabase
        .from("carriers")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching carriers:", error);
      return [];
    }
  },

  async createCarrier(name: string): Promise<{ success: boolean; data?: Carrier; error?: string }> {
    try {
      const { data, error } = await supabase
        .from("carriers")
        .insert({ name })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to create carrier";
      console.error("Error creating carrier:", error);
      return { success: false, error: errorMessage };
    }
  },

  // ============================================================================
  // TRUCKS
  // ============================================================================

  async getTrucksByCarrier(carrierId: string): Promise<Truck[]> {
    try {
      const { data, error } = await supabase
        .from("trucks")
        .select("*")
        .eq("carrier_id", carrierId)
        .order("truck_id", { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching trucks:", error);
      return [];
    }
  },

  async createTruck(
    truckId: string,
    carrierId: string
  ): Promise<{ success: boolean; data?: Truck; error?: string }> {
    try {
      const { data, error } = await supabase
        .from("trucks")
        .insert({ truck_id: truckId, carrier_id: carrierId })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to create truck";
      console.error("Error creating truck:", error);
      return { success: false, error: errorMessage };
    }
  },

  // ============================================================================
  // DRIVERS
  // ============================================================================

  async getDriversByCarrier(carrierId: string): Promise<Driver[]> {
    try {
      const { data, error } = await supabase
        .from("drivers")
        .select("*")
        .eq("carrier_id", carrierId)
        .order("name", { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching drivers:", error);
      return [];
    }
  },

  async createDriver(
    name: string,
    carrierId: string
  ): Promise<{ success: boolean; data?: Driver; error?: string }> {
    try {
      const { data, error } = await supabase
        .from("drivers")
        .insert({ name, carrier_id: carrierId })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to create driver";
      console.error("Error creating driver:", error);
      return { success: false, error: errorMessage };
    }
  },

  // ============================================================================
  // COMBINED OPERATIONS
  // ============================================================================

  async getCarrierWithTrucksAndDrivers(
    carrierId: string
  ): Promise<{
    carrier: Carrier | null;
    trucks: Truck[];
    drivers: Driver[];
  }> {
    try {
      const { data: carrier, error: carrierError } = await supabase
        .from("carriers")
        .select("*")
        .eq("id", carrierId)
        .single();

      if (carrierError) throw carrierError;

      const trucks = await this.getTrucksByCarrier(carrierId);
      const drivers = await this.getDriversByCarrier(carrierId);

      return { carrier, trucks, drivers };
    } catch (error) {
      console.error("Error fetching carrier details:", error);
      return { carrier: null, trucks: [], drivers: [] };
    }
  },
};

