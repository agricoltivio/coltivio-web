import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "./client";

export const cropsQueryOptions = () => {
  return queryOptions({
    queryKey: ["crops"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/crops");
      if (response.error) {
        throw new Error("Failed to fetch crops");
      }
      return response.data.data;
    },
  });
};
