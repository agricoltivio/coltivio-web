import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "./client";

export const farmQueryOptions = () => {
  return queryOptions({
    queryKey: ["farm"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/farm");
      if (response.error) throw new Error("Failed to fetch farm");
      return response.data.data;
    },
  });
};
