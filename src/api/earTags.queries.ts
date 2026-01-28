import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "./client";

export const earTagsQueryOptions = () => {
  return queryOptions({
    queryKey: ["earTags"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/earTags");
      if (response.error) {
        throw new Error("Failed to fetch ear tags");
      }
      return response.data.data;
    },
  });
};

export const availableEarTagsQueryOptions = () => {
  return queryOptions({
    queryKey: ["earTags", "available"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/earTags/available");
      if (response.error) {
        throw new Error("Failed to fetch ear tags");
      }
      return response.data.data;
    },
  });
};
