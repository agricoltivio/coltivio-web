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
