import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "./client";

export const tillagesQueryOptions = () => {
  return queryOptions({
    queryKey: ["tillages"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/tillages");
      if (response.error) {
        throw new Error("Failed to fetch tillages");
      }
      return response.data.data;
    },
  });
};

export const tillageQueryOptions = (tillageId: string) => {
  return queryOptions({
    queryKey: ["tillages", "byId", tillageId],
    queryFn: async () => {
      const response = await apiClient.GET(
        "/v1/tillages/byId/{tillageId}",
        {
          params: { path: { tillageId } },
        },
      );
      if (response.error) {
        throw new Error("Failed to fetch tillage");
      }
      return response.data.data;
    },
  });
};

export const plotTillagesQueryOptions = (plotId: string) => {
  return queryOptions({
    queryKey: ["plots", "byId", plotId, "tillages"],
    queryFn: async () => {
      const response = await apiClient.GET(
        "/v1/plots/byId/{plotId}/tillages",
        {
          params: { path: { plotId } },
        },
      );
      if (response.error) {
        throw new Error("Failed to fetch plot tillages");
      }
      return response.data.data;
    },
  });
};
