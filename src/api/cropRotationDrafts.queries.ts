import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "./client";

export const draftPlansQueryOptions = () => {
  return queryOptions({
    queryKey: ["cropRotations", "draftPlans"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/cropRotations/draftPlans");
      if (response.error) {
        throw new Error("Failed to fetch draft plans");
      }
      return response.data.data;
    },
  });
};

export const draftPlanQueryOptions = (draftPlanId: string) => {
  return queryOptions({
    queryKey: ["cropRotations", "draftPlans", "byId", draftPlanId],
    queryFn: async () => {
      const response = await apiClient.GET(
        "/v1/cropRotations/draftPlans/byId/{draftPlanId}",
        {
          params: { path: { draftPlanId } },
        },
      );
      if (response.error) {
        throw new Error("Failed to fetch draft plan");
      }
      return response.data.data;
    },
  });
};
