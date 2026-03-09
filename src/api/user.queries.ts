import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "./client";

export const meQueryOptions = () =>
  queryOptions({
    queryKey: ["me"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/me");
      if (response.error) throw new Error("Failed to fetch current user");
      return response.data.data;
    },
  });
