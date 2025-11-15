// src/lib/driverService.ts
import { supabase } from "./supabase";

export type Driver = {
  id: string;
  name: string;
  email?: string;
  status?: "active" | "inactive" | string;
  closed_tickets_today?: number;
};

export type DriversOverviewParams = {
  limit?: number;
  page?: number;
};

export type DriversOverviewResponse = {
  drivers: Driver[];
  total: number;
  page: number;
  pageSize: number;
};

export const driverService = {
  async getDriversOverview(
    params?: DriversOverviewParams
  ): Promise<DriversOverviewResponse> {
    const pageSize = params?.limit ?? 50;
    const page = params?.page ?? 1;
    const fromIndex = (page - 1) * pageSize;
    const toIndex = fromIndex + pageSize - 1;

    if (!supabase) {
      throw new Error("Supabase client not initialized");
    }

    const { data, error, count } = await supabase
      .from("drivers")
      .select("*", { count: "exact" })
      .order("name", { ascending: true })
      .range(fromIndex, toIndex);

    if (error) {
      console.error("getDriversOverview Supabase error:", error);
      throw new Error(error.message || "Failed to load drivers");
    }

    const drivers = (data ?? []) as Driver[];
    const total = count ?? drivers.length;

    return {
      drivers,
      total,
      page,
      pageSize,
    };
  },
};
