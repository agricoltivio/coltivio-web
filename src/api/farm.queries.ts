import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import type { components } from "./schema";

// List of farms the current user belongs to — drives the farm switcher and the
// pick-a-farm gate. Not farm-scoped itself.
export const farmsQueryOptions = () => {
  return queryOptions({
    queryKey: ["farms"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/farms");
      if (response.error) throw new Error("Failed to fetch farms");
      return response.data.data; // { result, count }
    },
  });
};

export const farmQueryOptions = (enabled = true) => {
  return queryOptions({
    queryKey: ["farm"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/farm");
      // null = authenticated but no farm created yet (handled in _authed layout)
      if (response.error) return null;
      return response.data.data;
    },
    enabled,
  });
};

export const farmFieldEventsQueryOptions = (fromDate: string, toDate: string) => {
  return queryOptions({
    queryKey: ["farm", "fieldEvents", fromDate, toDate],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/farm/fieldEvents", {
        params: { query: { fromDate, toDate } },
      });
      if (response.error) throw new Error("Failed to fetch field events");
      return response.data.data.result;
    },
  });
};

export function useCreateFarmMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: components["schemas"]["PostV1FarmRequestBody"]) => {
      const response = await apiClient.POST("/v1/farm", { body });
      if (response.error) throw new Error("Failed to create farm");
      return response.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["me"] });
      void queryClient.invalidateQueries({ queryKey: ["farm"] });
      void queryClient.invalidateQueries({ queryKey: ["farms"] });
    },
  });
}

// Leave the currently active farm (works for owners and members; the backend rejects
// e.g. the last remaining owner). Farm-scoped via the x-farm-id header.
export function useLeaveFarmMutation() {
  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.DELETE("/v1/farm/members/me");
      if (response.error) {
        throw new Error(response.error.error || "Failed to leave farm");
      }
      return response.data.data;
    },
  });
}

// Permanently delete the currently active farm and all its data (owners only).
export function useDeleteFarmMutation() {
  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.DELETE("/v1/farm", {
        params: { query: { deleteAccount: "false" } },
      });
      if (response.error) {
        throw new Error(response.error.error || "Failed to delete farm");
      }
      return response.data.data;
    },
  });
}

export function useAcceptFarmInviteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const response = await apiClient.POST("/v1/farm/invites/accept", { body: { code } });
      if (response.error) throw new Error("invalid_code");
      return response.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["me"] });
      void queryClient.invalidateQueries({ queryKey: ["farms"] });
    },
  });
}

export const farmDashboardQueryOptions = (year: number) => {
  return queryOptions({
    queryKey: ["farm", "dashboard", year],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/farm/dashboard", {
        params: { query: { year: String(year) } },
      });
      if (response.error) throw new Error("Failed to fetch dashboard");
      return response.data.data;
    },
  });
};
