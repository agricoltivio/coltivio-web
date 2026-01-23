import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "./client";

export const ordersQueryOptions = () => {
  return queryOptions({
    queryKey: ["orders"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/orders");
      if (response.error) {
        throw new Error("Failed to fetch orders");
      }
      return response.data.data;
    },
  });
};

export const orderQueryOptions = (orderId: string) => {
  return queryOptions({
    queryKey: ["orders", "byId", orderId],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/orders/byId/{orderId}", {
        params: { path: { orderId } },
      });
      if (response.error) {
        throw new Error("Failed to fetch order");
      }
      return response.data.data;
    },
  });
};
