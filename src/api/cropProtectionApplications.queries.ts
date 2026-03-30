import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "./client";

export const cropProtectionApplicationsQueryOptions = () => {
  return queryOptions({
    queryKey: ["cropProtectionApplications"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/cropProtectionApplications");
      if (response.error) {
        throw new Error("Failed to fetch crop protection applications");
      }
      return response.data.data;
    },
  });
};

export const plotCropProtectionApplicationsQueryOptions = (plotId: string) => {
  return queryOptions({
    queryKey: ["plots", "byId", plotId, "cropProtectionApplications"],
    queryFn: async () => {
      const response = await apiClient.GET(
        "/v1/plots/byId/{plotId}/cropProtectionApplications",
        {
          params: { path: { plotId } },
        },
      );
      if (response.error) {
        throw new Error("Failed to fetch plot crop protection applications");
      }
      return response.data.data;
    },
  });
};

export const cropProtectionApplicationSummariesQueryOptions = () =>
  queryOptions({
    queryKey: ["cropProtectionApplications", "summaries"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/cropProtectionApplications/summaries");
      if (response.error) throw new Error("Failed to fetch crop protection application summaries");
      return response.data.data;
    },
  });

export const cropProtectionApplicationYearsQueryOptions = () =>
  queryOptions({
    queryKey: ["cropProtectionApplications", "years"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/cropProtectionApplications/years");
      if (response.error) throw new Error("Failed to fetch crop protection application years");
      return response.data.data.result;
    },
  });

export const cropProtectionApplicationPresetsQueryOptions = () => {
  return queryOptions({
    queryKey: ["cropProtectionApplications", "presets"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/cropProtectionApplications/presets");
      if (response.error) {
        throw new Error("Failed to fetch crop protection application presets");
      }
      return response.data.data;
    },
  });
};
