import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "./client";

export const harvestsQueryOptions = () => {
  return queryOptions({
    queryKey: ["harvests"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/harvests");
      if (response.error) {
        throw new Error("Failed to fetch harvests");
      }
      return response.data.data;
    },
  });
};

export const harvestQueryOptions = (harvestId: string) => {
  return queryOptions({
    queryKey: ["harvests", "byId", harvestId],
    queryFn: async () => {
      const response = await apiClient.GET(
        "/v1/harvests/byId/{harvestId}",
        {
          params: { path: { harvestId } },
        },
      );
      if (response.error) {
        throw new Error("Failed to fetch harvest");
      }
      return response.data.data;
    },
  });
};

export const plotHarvestsQueryOptions = (plotId: string) => {
  return queryOptions({
    queryKey: ["plots", "byId", plotId, "harvests"],
    queryFn: async () => {
      const response = await apiClient.GET(
        "/v1/plots/byId/{plotId}/harvests",
        {
          params: { path: { plotId } },
        },
      );
      if (response.error) {
        throw new Error("Failed to fetch plot harvests");
      }
      return response.data.data;
    },
  });
};

export const harvestPresetsQueryOptions = () => {
  return queryOptions({
    queryKey: ["harvests", "presets"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/harvests/presets");
      if (response.error) {
        throw new Error("Failed to fetch harvest presets");
      }
      return response.data.data;
    },
  });
};
