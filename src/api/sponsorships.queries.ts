import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "./client";

export const sponsorshipsQueryOptions = () => {
  return queryOptions({
    queryKey: ["sponsorships"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/sponsorships");
      if (response.error) {
        throw new Error("Failed to fetch sponsorships");
      }
      return response.data.data;
    },
  });
};

export const sponsorshipQueryOptions = (sponsorshipId: string) => {
  return queryOptions({
    queryKey: ["sponsorships", "byId", sponsorshipId],
    queryFn: async () => {
      const response = await apiClient.GET(
        "/v1/sponsorships/byId/{sponsorshipId}",
        {
          params: { path: { sponsorshipId } },
        },
      );
      if (response.error) {
        throw new Error("Failed to fetch sponsorship");
      }
      return response.data.data;
    },
  });
};
