import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "./client";

export const treatmentsQueryOptions = () => {
  return queryOptions({
    queryKey: ["treatments"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/treatments");
      if (response.error) {
        throw new Error("Failed to fetch treatments");
      }
      return response.data.data;
    },
  });
};

export const treatmentQueryOptions = (treatmentId: string) => {
  return queryOptions({
    queryKey: ["treatments", "byId", treatmentId],
    queryFn: async () => {
      const response = await apiClient.GET(
        "/v1/treatments/byId/{treatmentId}",
        {
          params: { path: { treatmentId } },
        },
      );
      if (response.error) {
        throw new Error("Failed to fetch treatment");
      }
      return response.data.data;
    },
  });
};

