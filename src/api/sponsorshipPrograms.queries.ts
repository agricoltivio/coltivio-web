import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "./client";

export const sponsorshipProgramsQueryOptions = () => {
  return queryOptions({
    queryKey: ["sponsorshipPrograms"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/sponsorshipPrograms");
      if (response.error) {
        throw new Error("Failed to fetch sponsorship types");
      }
      return response.data.data;
    },
  });
};

export const sponsorshipProgramQueryOptions = (
  sponsorshipProgramId: string,
) => {
  return queryOptions({
    queryKey: ["sponsorshipPrograms", "byId", sponsorshipProgramId],
    queryFn: async () => {
      const response = await apiClient.GET(
        "/v1/sponsorshipPrograms/byId/{sponsorshipProgramId}",
        {
          params: { path: { sponsorshipProgramId } },
        },
      );
      if (response.error) {
        throw new Error("Failed to fetch sponsorship type");
      }
      return response.data.data;
    },
  });
};
