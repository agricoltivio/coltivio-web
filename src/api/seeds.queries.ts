import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "./client";

export const seedsQueryOptions = () => {
  return queryOptions({
    queryKey: ["seeds"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/seeds");
      if (response.error) {
        throw new Error("Failed to fetch seeds");
      }
      return response.data.data;
    },
  });
};

export const seedQueryOptions = (seedId: string) => {
  return queryOptions({
    queryKey: ["seeds", "byId", seedId],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/seeds/byId/{seedId}", {
        params: { path: { seedId } },
      });
      if (response.error) {
        throw new Error("Failed to fetch seed");
      }
      return response.data.data;
    },
  });
};

export const seedInUseQueryOptions = (seedId: string) => {
  return queryOptions({
    queryKey: ["seeds", "byId", seedId, "inUse"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/seeds/byId/{seedId}/inUse", {
        params: { path: { seedId } },
      });
      if (response.error) {
        throw new Error("Failed to check if seed is in use");
      }
      return response.data.data;
    },
  });
};
