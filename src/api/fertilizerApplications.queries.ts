import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "./client";

export const fertilizerApplicationsQueryOptions = () => {
  return queryOptions({
    queryKey: ["fertilizerApplications"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/fertilizerApplications");
      if (response.error) {
        throw new Error("Failed to fetch fertilizer applications");
      }
      return response.data.data;
    },
  });
};

export const plotFertilizerApplicationsQueryOptions = (plotId: string) => {
  return queryOptions({
    queryKey: ["plots", "byId", plotId, "fertilizerApplications"],
    queryFn: async () => {
      const response = await apiClient.GET(
        "/v1/plots/byId/{plotId}/fertilizerApplications",
        {
          params: { path: { plotId } },
        },
      );
      if (response.error) {
        throw new Error("Failed to fetch plot fertilizer applications");
      }
      return response.data.data;
    },
  });
};

export const fertilizerApplicationSummariesQueryOptions = () =>
  queryOptions({
    queryKey: ["fertilizerApplications", "summaries"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/fertilizerApplications/summaries");
      if (response.error) throw new Error("Failed to fetch fertilizer application summaries");
      return response.data.data;
    },
  });

export const fertilizerApplicationYearsQueryOptions = () =>
  queryOptions({
    queryKey: ["fertilizerApplications", "years"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/fertilizerApplications/years");
      if (response.error) throw new Error("Failed to fetch fertilizer application years");
      return response.data.data.result;
    },
  });

export const fertilizerApplicationPresetsQueryOptions = () => {
  return queryOptions({
    queryKey: ["fertilizerApplications", "presets"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/fertilizerApplications/presets");
      if (response.error) {
        throw new Error("Failed to fetch fertilizer application presets");
      }
      return response.data.data;
    },
  });
};
