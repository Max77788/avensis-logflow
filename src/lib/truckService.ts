// src/lib/truckService.ts
import { supabase } from "./supabase";

export type Truck = {
  id: string;
  truck_id: string;
  carrier_id: string;
  created_at?: string;
  updated_at?: string;
  carrier_name?: string;
  status?: string;
  driver_name?: string;
  active?: boolean;
};

export type TrucksOverviewParams = {
  limit?: number;
  page?: number;
};

export type TrucksOverviewResponse = {
  trucks: Truck[];
  total: number;
  page: number;
  pageSize: number;
};

export const truckService = {
  async getTrucksOverview(
    params?: TrucksOverviewParams
  ): Promise<TrucksOverviewResponse> {
    const pageSize = params?.limit ?? 50;
    const page = params?.page ?? 1;
    const fromIndex = (page - 1) * pageSize;
    const toIndex = fromIndex + pageSize - 1;

    if (!supabase) {
      throw new Error("Supabase client not initialized");
    }

    try {
      // Select trucks with carrier information
      let query = supabase
        .from("trucks")
        .select(
          "id, truck_id, carrier_id, created_at, updated_at, carriers(name)",
          {
            count: "exact",
          }
        )
        .order("truck_id", { ascending: true })
        .range(fromIndex, toIndex)
        .filter("driver_id", "not.is", null);

      const { data, error, count } = await query;

      if (error) {
        console.error("getTrucksOverview Supabase error:", error);
        throw new Error(error.message || "Failed to load trucks");
      }

      // Map the data to include carrier_name
      let trucks = (data ?? []).map((truck: any) => ({
        ...truck,
        carrier_name: truck.carriers?.name || "Unknown",
      })) as Truck[];
      const total = count ?? trucks.length;

      // Fetch driver information for each truck
      try {
        const { data: drivers, error: driversError } = await supabase
          .from("drivers")
          .select("id, name, default_truck_id, status");

        if (!driversError && drivers) {
          // Create maps for driver_name and active status
          const driverMap = new Map<string, string>();
          const activeMap = new Map<string, boolean>();

          drivers.forEach((driver: any) => {
            if (driver.default_truck_id) {
              driverMap.set(driver.default_truck_id, driver.name);
              // Truck is active if the assigned driver is active
              activeMap.set(
                driver.default_truck_id,
                driver.status === "active"
              );
            }
          });

          // Add driver_name and active status to trucks
          trucks = trucks.map((truck) => ({
            ...truck,
            driver_name: driverMap.get(truck.id) || undefined,
            active: activeMap.get(truck.id) ?? false, // Default to false if no driver assigned
          }));
        }
      } catch (error) {
        console.error("Error fetching driver information:", error);
        // Continue without driver info if fetch fails
      }

      console.log("Trucks:", trucks);

      console.log(
        `Loaded ${trucks.length} trucks (page ${page}, total: ${total})`
      );

      return {
        trucks,
        total,
        page,
        pageSize,
      };
    } catch (error: any) {
      console.error("getTrucksOverview error:", error);
      throw error;
    }
  },

  async getActiveTrucksOverview(
    params?: TrucksOverviewParams
  ): Promise<TrucksOverviewResponse> {
    const pageSize = params?.limit ?? 50;
    const page = params?.page ?? 1;
    const fromIndex = (page - 1) * pageSize;
    const toIndex = fromIndex + pageSize - 1;

    if (!supabase) {
      throw new Error("Supabase client not initialized");
    }

    try {
      // Select trucks with carrier information and filter by driver status
      let query = supabase
        .from("trucks")
        .select(
          `
    id,
    truck_id,
    carrier_id,
    created_at,
    updated_at,
    carriers(name),
    active_driver:drivers!trucks_driver_id_fkey(*)
  `,
          { count: "exact" }
        )
        // Use .filter() method with the full path as a string
        // .filter("status!drivers_default_truck_id_fkey", "eq", "active")
        .not("driver_id", "is", null)
        .order("truck_id", { ascending: true })
        .range(fromIndex, toIndex);

      const { data, error, count } = await supabase.rpc(
        "get_trucks_overview_filtered",
        {
          from_index: fromIndex,
          to_index: toIndex,
        }
      );

      // console.log("Active trucks data:", data);

      if (error) {
        console.error("getTrucksOverview Supabase error:", error);
        throw new Error(error.message || "Failed to load trucks");
      }

      console.log("Active trucks data:", data);

      // The 'data' object already has 'trucks' (array) and 'total' (count) properties
      const result: TrucksOverviewResponse = {
        trucks: data.trucks || [],
        total: data.total || 0,
        page,
        pageSize,
      };

      return result;
    } catch (error: any) {
      console.error("getTrucksOverview error:", error);
      throw error;
    }
  },
};
