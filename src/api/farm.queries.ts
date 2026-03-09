import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "./client";

export const farmQueryOptions = () => {
  return queryOptions({
    queryKey: ["farm"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/farm");
      if (response.error) throw new Error("Failed to fetch farm");
      return response.data.data;
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
