import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "./client";

export const membershipStatusQueryOptions = () => {
  return queryOptions({
    queryKey: ["membership", "status"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/membership/status");
      if (response.error) throw new Error("Failed to fetch membership status");
      return response.data.data;
    },
  });
};

export const membershipPaymentsQueryOptions = () => {
  return queryOptions({
    queryKey: ["membership", "payments"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/membership/payments");
      if (response.error) throw new Error("Failed to fetch membership payments");
      return response.data.data;
    },
  });
};
