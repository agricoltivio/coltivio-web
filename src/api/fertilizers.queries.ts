import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "./client";

export const fertilizersQueryOptions = () => {
  return queryOptions({
    queryKey: ["fertilizers"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/fertilizers");
      if (response.error) {
        throw new Error("Failed to fetch fertilizers");
      }
      return response.data.data;
    },
  });
};
