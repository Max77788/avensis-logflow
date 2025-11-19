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
  driver_id?: string | null; // UUID of assigned driver, null if no driver assigned
  status?: "active" | "inactive";
  created_at: string;
  updated_at: string;
}

export interface Driver {
  id: string;
  name: string;
  email: string;
  carrier_id: string;
  default_truck_id: string;
  driver_qr_code: string;
  status: "active" | "inactive";
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

  async createCarrier(
    name: string
  ): Promise<{ success: boolean; data?: Carrier; error?: string }> {
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

  async getCarrierById(id: string): Promise<Carrier | null> {
    try {
      const { data, error } = await supabase
        .from("carriers")
        .select("*")
        .eq("id", id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data || null;
    } catch (error) {
      console.error("Error fetching carrier by id:", error);
      return null;
    }
  },

  async getCarrierByName(name: string): Promise<Carrier | null> {
    try {

      console.log("getCarrierByName called with:", name);

      const { data, error } = await supabase
        .from("carriers")
        .select("*")
        .eq("name", name)
        .single();
      
      console.log("getCarrierByName response:", { data, error });

      if (error && error.code !== "PGRST116") throw error;
      return data || null;
    } catch (error) {
      console.error("Error fetching carrier by name:", error);
      return null;
    }
  },

  async getOrCreateCarrier(
    name: string
  ): Promise<{ success: boolean; data?: Carrier; error?: string }> {
    try {
      // First try to find existing carrier
      const existing = await this.getCarrierByName(name);
      if (existing) {
        return { success: true, data: existing };
      }

      // If not found, create it
      return await this.createCarrier(name);
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to get or create carrier";
      console.error("Error in getOrCreateCarrier:", error);
      return { success: false, error: errorMessage };
    }
  },

  // ============================================================================
  // TRUCKS
  // ============================================================================

  async getTrucksByCarrier(carrierId: string): Promise<Truck[]> {
    try {
      // Get all trucks for the carrier
      const { data: trucks, error: trucksError } = await supabase
        .from("trucks")
        .select("*")
        .eq("carrier_id", carrierId)
        .order("truck_id", { ascending: true });

      if (trucksError) throw trucksError;

      return trucks || [];
    } catch (error) {
      console.error("Error fetching trucks:", error);
      return [];
    }
  },

  async getAvailableTrucksByCarrier(carrierId: string): Promise<Truck[]> {
    try {
      // Get all trucks for the carrier that don't have a driver_id assigned
      const { data: trucks, error: trucksError } = await supabase
        .from("trucks")
        .select("*")
        .eq("carrier_id", carrierId)
        .is("driver_id", null) // Only trucks without a driver assigned
        .order("truck_id", { ascending: true });

      console.log("Available trucks:", trucks);

      if (trucksError) throw trucksError;

      // Add status field to each truck (all available trucks are inactive since no driver is assigned)
      const trucksWithStatus = (trucks || []).map((truck: any) => ({
        ...truck,
        status: "inactive",
      }));

      return trucksWithStatus;
    } catch (error) {
      console.error("Error fetching available trucks:", error);
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

  async getTruckById(truckUuid: string): Promise<Truck | null> {
    try {
      const { data, error } = await supabase
        .from("trucks")
        .select("*")
        .eq("id", truckUuid)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data || null;
    } catch (error) {
      console.error("Error fetching truck by UUID:", error);
      return null;
    }
  },

  async getTruckByIdAndCarrier(
    truckId: string,
    carrierId: string
  ): Promise<Truck | null> {
    try {
      const { data, error } = await supabase
        .from("trucks")
        .select("*")
        .eq("truck_id", truckId)
        .eq("carrier_id", carrierId)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data || null;
    } catch (error) {
      console.error("Error fetching truck:", error);
      return null;
    }
  },

  async getOrCreateTruck(
    truckId: string,
    carrierId: string
  ): Promise<{ success: boolean; data?: Truck; error?: string }> {
    try {
      // First try to find existing truck
      const existing = await this.getTruckByIdAndCarrier(truckId, carrierId);
      if (existing) {
        return { success: true, data: existing };
      }

      // If not found, create it
      return await this.createTruck(truckId, carrierId);
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to get or create truck";
      console.error("Error in getOrCreateTruck:", error);
      return { success: false, error: errorMessage };
    }
  },

  async assignDriverToTruck(
    truckId: string,
    driverId: string
  ): Promise<{ success: boolean; data?: Truck; error?: string }> {
    try {
      const { data, error } = await supabase
        .from("trucks")
        .update({ driver_id: driverId })
        .eq("id", truckId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to assign driver to truck";
      console.error("Error assigning driver to truck:", error);
      return { success: false, error: errorMessage };
    }
  },

  async releaseDriverFromTruck(
    truckId: string
  ): Promise<{ success: boolean; data?: Truck; error?: string }> {
    try {
      const { data, error } = await supabase
        .from("trucks")
        .update({ driver_id: null })
        .eq("id", truckId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      const errorMessage =
        error?.message || "Failed to release driver from truck";
      console.error("Error releasing driver from truck:", error);
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
    carrierId: string,
    email: string,
    defaultTruckId: string
  ): Promise<{ success: boolean; data?: Driver; error?: string }> {
    try {
      // Generate driver QR code
      const driverQrCode = `DRIVER-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const { data, error } = await supabase
        .from("drivers")
        .insert({
          name,
          email,
          carrier_id: carrierId,
          default_truck_id: defaultTruckId,
          driver_qr_code: driverQrCode,
          status: "inactive",
        })
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

  async getDriverByEmail(email: string): Promise<Driver | null> {
    try {
      const { data, error } = await supabase
        .from("drivers")
        .select("*")
        .eq("email", email)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data || null;
    } catch (error) {
      console.error("Error fetching driver by email:", error);
      return null;
    }
  },

  async getDriverByQRCode(qrCode: string): Promise<Driver | null> {
    try {
      const { data, error } = await supabase
        .from("drivers")
        .select("*")
        .eq("driver_qr_code", qrCode)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data || null;
    } catch (error) {
      console.error("Error fetching driver by QR code:", error);
      return null;
    }
  },

  async getDriverById(driverId: string): Promise<Driver | null> {
    try {
      const { data, error } = await supabase
        .from("drivers")
        .select("*")
        .eq("id", driverId)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data || null;
    } catch (error) {
      console.error("Error fetching driver by ID:", error);
      return null;
    }
  },

  async updateDriverStatus(
    driverId: string,
    status: "active" | "inactive"
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from("drivers")
        .update({ status })
        .eq("id", driverId);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to update driver status";
      console.error("Error updating driver status:", error);
      return { success: false, error: errorMessage };
    }
  },

  async updateDriverProfile(
    driverId: string,
    updates: {
      default_truck_id?: string;
      carrier_id?: string;
    }
  ): Promise<{ success: boolean; data?: Driver; error?: string }> {
    try {
      console.log("updateDriverProfile called with:", { driverId, updates });

      // Perform the update directly without checking first
      const { data, error } = await supabase
        .from("drivers")
        .update(updates)
        .eq("id", driverId)
        .select();

      console.log("Update response:", { data, error });

      if (error) {
        console.error("Update error:", error);
        throw error;
      }

      // Return the first updated record (should be only one)
      if (!data || data.length === 0) {
        throw new Error("Update returned no rows - driver may not exist");
      }

      console.log("Update successful:", data[0]);
      return { success: true, data: data[0] };
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to update driver profile";
      console.error("Error updating driver profile:", error);
      return { success: false, error: errorMessage };
    }
  },

  async getAllDrivers(): Promise<Driver[]> {
    try {
      const { data, error } = await supabase
        .from("drivers")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching all drivers:", error);
      return [];
    }
  },

  // ============================================================================
  // COMBINED OPERATIONS
  // ============================================================================

  async getCarrierWithTrucksAndDrivers(carrierId: string): Promise<{
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
