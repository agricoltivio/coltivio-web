import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "./client";

export const animalGroupsQueryOptions = () => {
  return queryOptions({
    queryKey: ["animalGroups"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/animalGroups");
      if (response.error) {
        throw new Error("Failed to fetch animal groups");
      }
      return response.data.data;
    },
  });
};

export const animalGroupQueryOptions = (groupId: string) => {
  return queryOptions({
    queryKey: ["animalGroups", groupId],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/animalGroups/byId/{groupId}", {
        params: { path: { groupId } },
      });
      if (response.error) {
        throw new Error("Failed to fetch animal group");
      }
      return response.data.data;
    },
  });
};
