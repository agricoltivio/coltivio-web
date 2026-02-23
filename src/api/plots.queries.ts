import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "./client";

export const plotsQueryOptions = () => {
  return queryOptions({
    queryKey: ["plots"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/plots");
      if (response.error) {
        throw new Error("Failed to fetch plots");
      }
      return response.data.data;
    },
  });
};

export const plotQueryOptions = (plotId: string) => {
  return queryOptions({
    queryKey: ["plots", "byId", plotId],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/plots/byId/{plotId}", {
        params: { path: { plotId } },
      });
      if (response.error) {
        throw new Error("Failed to fetch plot");
      }
      return response.data.data;
    },
  });
};
