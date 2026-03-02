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
