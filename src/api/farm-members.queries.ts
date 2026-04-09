import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "./client";

export const farmInvitesQueryOptions = () =>
  queryOptions({
    queryKey: ["farm", "invites"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/farm/invites");
      if (response.error) throw new Error("Failed to fetch farm invites");
      return response.data.data;
    },
  });

export const farmMemberPermissionsQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ["farm", "members", userId, "permissions"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/farm/members/byId/{userId}/permissions", {
        params: { path: { userId } },
      });
      if (response.error) throw new Error("Failed to fetch member permissions");
      return response.data.data.result;
    },
  });
