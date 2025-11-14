// src/lib/driverService.ts

export type Driver = {
  id: string;
  name: string;
  email?: string;
  status?: "active" | "inactive" | string;
  closed_tickets_today?: number;
  // add any other fields you already have on your Driver model
};

export type DriversOverviewParams = {
  limit?: number; // page size
  page?: number; // 1-based page index
};

export type DriversOverviewResponse = {
  drivers: Driver[];
  total: number; // total number of matching drivers in DB
  page: number; // current page (echo from backend)
  pageSize: number; // page size used by backend
};

export const driverService = {
  async getDriversOverview(
    params: DriversOverviewParams = {}
  ): Promise<DriversOverviewResponse> {
    const { limit = 50, page = 1 } = params;

    const query = new URLSearchParams();
    query.set("limit", String(limit));
    query.set("page", String(page));

    // adjust the URL if your API route is different
    const res = await fetch(`/api/drivers/overview?${query.toString()}`);

    if (!res.ok) {
      throw new Error(`Failed to load drivers overview: ${res.statusText}`);
    }

    const data = (await res.json()) as DriversOverviewResponse;
    return data;
  },
};