import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "./client";

export const sowingsQueryOptions = () => {
  return queryOptions({
    queryKey: ["sowings"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/sowings");
      if (response.error) {
        throw new Error("Failed to fetch sowings");
      }
      return response.data.data;
    },
  });
};

export const plotSowingsQueryOptions = (plotId: string) => {
  return queryOptions({
    queryKey: ["plots", "byId", plotId, "sowings"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/plots/byId/{plotId}/sowings", {
        params: { path: { plotId } },
      });
      if (response.error) {
        throw new Error("Failed to fetch plot sowings");
      }
      return response.data.data;
    },
  });
};

export const sowingQueryOptions = (sowingId: string) =>
  queryOptions({
    queryKey: ["sowings", "byId", sowingId],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/sowings/byId/{sowingId}", {
        params: { path: { sowingId } },
      });
      if (response.error) throw new Error("Failed to fetch sowing");
      return response.data.data;
    },
  });

export const sowingSummariesQueryOptions = () =>
  queryOptions({
    queryKey: ["sowings", "summaries"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/sowings/summaries");
      if (response.error) throw new Error("Failed to fetch sowing summaries");
      return response.data.data;
    },
  });

export const sowingYearsQueryOptions = () =>
  queryOptions({
    queryKey: ["sowings", "years"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/sowings/years");
      if (response.error) throw new Error("Failed to fetch sowing years");
      return response.data.data.result;
    },
  });

// unit -> quantity kind / per-area map, the single source of truth for unit filtering
export const sowingUnitsQueryOptions = () =>
  queryOptions({
    queryKey: ["sowings", "units"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/sowings/units");
      if (response.error) throw new Error("Failed to fetch sowing units");
      return response.data.data.result;
    },
    staleTime: Infinity,
  });

export const sowingPresetsQueryOptions = () => {
  return queryOptions({
    queryKey: ["sowings", "presets"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/sowings/presets");
      if (response.error) {
        throw new Error("Failed to fetch sowing presets");
      }
      return response.data.data;
    },
  });
};
