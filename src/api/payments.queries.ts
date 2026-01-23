import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "./client";

export const paymentsQueryOptions = () => {
  return queryOptions({
    queryKey: ["payments"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/payments");
      if (response.error) {
        throw new Error("Failed to fetch payments");
      }
      return response.data.data;
    },
  });
};

export const paymentQueryOptions = (paymentId: string) => {
  return queryOptions({
    queryKey: ["payments", "byId", paymentId],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/payments/byId/{paymentId}", {
        params: { path: { paymentId } },
      });
      if (response.error) {
        throw new Error("Failed to fetch payment");
      }
      return response.data.data;
    },
  });
};
