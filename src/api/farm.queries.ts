import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import type { components } from "./schema";

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
