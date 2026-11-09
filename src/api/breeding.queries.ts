import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "./client";

export const animalWeightsQueryOptions = (animalId: string) =>
  queryOptions({
    queryKey: ["breeding", "weights", animalId],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/animals/byId/{animalId}/weights", {
        params: { path: { animalId } },
      });
      if (response.error) throw new Error("Failed to fetch weights");
      return response.data.data.result;
    },
  });

export const animalHeatsQueryOptions = (animalId: string) =>
  queryOptions({
    queryKey: ["breeding", "heats", animalId],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/animals/byId/{animalId}/heats", {
        params: { path: { animalId } },
      });
      if (response.error) throw new Error("Failed to fetch heats");
      return response.data.data.result;
    },
  });

export const breedingCalendarQueryOptions = (from: string, to: string) =>
  queryOptions({
    queryKey: ["breeding", "calendar", from, to],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/animals/breedingCalendar", {
        params: { query: { from, to } },
      });
      if (response.error) throw new Error("Failed to fetch breeding calendar");
      return response.data.data.result;
    },
  });

export const gestationSettingsQueryOptions = () =>
  queryOptions({
    queryKey: ["breeding", "gestationSettings"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/animals/breedingCalendar/gestationSettings");
      if (response.error) throw new Error("Failed to fetch gestation settings");
      return response.data.data.result;
    },
  });
