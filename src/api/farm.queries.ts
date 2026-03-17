import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "./client";

export const farmQueryOptions = (enabled = true) => {
  return queryOptions({
    queryKey: ["farm"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/farm");
      // null = authenticated but no farm created yet (handled in _authed layout)
      if (response.error) return null;
      return response.data.data;
    },
    enabled,
  });
};

export const farmFieldEventsQueryOptions = (fromDate: string, toDate: string) => {
  return queryOptions({
    queryKey: ["farm", "fieldEvents", fromDate, toDate],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/farm/fieldEvents", {
        params: { query: { fromDate, toDate } },
      });
      if (response.error) throw new Error("Failed to fetch field events");
      return response.data.data.result;
    },
  });
};

export const farmDashboardQueryOptions = (year: number) => {
  return queryOptions({
    queryKey: ["farm", "dashboard", year],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/farm/dashboard", {
        params: { query: { year: String(year) } },
      });
      if (response.error) throw new Error("Failed to fetch dashboard");
      return response.data.data;
    },
  });
};
