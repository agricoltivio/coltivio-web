import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "./client";

export const drugsQueryOptions = () => {
  return queryOptions({
    queryKey: ["drugs"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/drugs");
      if (response.error) {
        throw new Error("Failed to fetch drugs");
      }
      return response.data.data;
    },
  });
};

export const drugQueryOptions = (drugId: string) => {
  return queryOptions({
    queryKey: ["drugs", "byId", drugId],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/drugs/byId/{drugId}", {
        params: { path: { drugId } },
      });
      if (response.error) {
        throw new Error("Failed to fetch drug");
      }
      return response.data.data;
    },
  });
};

export const drugInUseQueryOptions = (drugId: string) => {
  return queryOptions({
    queryKey: ["drugs", "byId", drugId, "inUse"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/drugs/byId/{drugId}/inUse", {
        params: { path: { drugId } },
      });
      if (response.error) {
        throw new Error("Failed to check if drug is in use");
      }
      return response.data.data;
    },
  });
};
