// src/lib/truckService.ts
import { supabase } from "./supabase";

export type Truck = {
  id: string;
  truck_id: string;
  carrier_id: string;
  created_at?: string;
  updated_at?: string;
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
      // Select only necessary fields for faster query
      let query = supabase
        .from("trucks")
        .select("id, truck_id, carrier_id, created_at, updated_at", {
          count: "exact",
        })
        .order("truck_id", { ascending: true })
        .range(fromIndex, toIndex);

      const { data, error, count } = await query;

      if (error) {
        console.error("getTrucksOverview Supabase error:", error);
        throw new Error(error.message || "Failed to load trucks");
      }

      const trucks = (data ?? []) as Truck[];
      const total = count ?? trucks.length;

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
};

