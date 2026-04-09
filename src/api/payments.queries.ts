import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "./client";

export const orderPaymentQueryOptions = (orderId: string, paymentId: string) =>
  queryOptions({
    queryKey: ["orders", "byId", orderId, "payments", "byId", paymentId],
    queryFn: async () => {
      const response = await apiClient.GET(
        "/v1/orders/byId/{orderId}/payments/byId/{paymentId}",
        { params: { path: { orderId, paymentId } } },
      );
      if (response.error) throw new Error("Failed to fetch payment");
      return response.data.data;
    },
  });

export const sponsorshipPaymentQueryOptions = (
  sponsorshipId: string,
  paymentId: string,
) =>
  queryOptions({
    queryKey: [
      "sponsorships",
      "byId",
      sponsorshipId,
      "payments",
      "byId",
      paymentId,
    ],
    queryFn: async () => {
      const response = await apiClient.GET(
        "/v1/sponsorships/byId/{sponsorshipId}/payments/byId/{paymentId}",
        { params: { path: { sponsorshipId, paymentId } } },
      );
      if (response.error) throw new Error("Failed to fetch payment");
      return response.data.data;
    },
  });
