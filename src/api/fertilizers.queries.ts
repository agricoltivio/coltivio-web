import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "./client";

export const fertilizersQueryOptions = () => {
  return queryOptions({
    queryKey: ["fertilizers"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/fertilizers");
      if (response.error) {
        throw new Error("Failed to fetch fertilizers");
      }
      return response.data.data;
    },
  });
};

export const fertilizerQueryOptions = (fertilizerId: string) => {
  return queryOptions({
    queryKey: ["fertilizers", "byId", fertilizerId],
    queryFn: async () => {
      const response = await apiClient.GET(
        "/v1/fertilizers/byId/{fertilizerId}",
        { params: { path: { fertilizerId } } },
      );
      if (response.error) {
        throw new Error("Failed to fetch fertilizer");
      }
      return response.data.data;
    },
  });
};

export const fertilizerInUseQueryOptions = (fertilizerId: string) => {
  return queryOptions({
    queryKey: ["fertilizers", "byId", fertilizerId, "inUse"],
    queryFn: async () => {
      const response = await apiClient.GET(
        "/v1/fertilizers/byId/{fertilizerId}/inUse",
        { params: { path: { fertilizerId } } },
      );
      if (response.error) {
        throw new Error("Failed to check if fertilizer is in use");
      }
      return response.data.data;
    },
  });
};
