import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "./client";

export const herdsQueryOptions = () => {
  return queryOptions({
    queryKey: ["herds"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/animals/herds");
      if (response.error) {
        throw new Error("Failed to fetch herds");
      }
      return response.data.data;
    },
  });
};

export const herdQueryOptions = (herdId: string) => {
  return queryOptions({
    queryKey: ["herds", herdId],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/animals/herds/byId/{herdId}", {
        params: { path: { herdId } },
      });
      if (response.error) {
        throw new Error("Failed to fetch herd");
      }
      return response.data.data;
    },
  });
};

export const herdOutdoorSchedulesQueryOptions = (herdId: string) => {
  return queryOptions({
    queryKey: ["herds", herdId, "outdoorSchedules"],
    queryFn: async () => {
      const response = await apiClient.GET(
        "/v1/animals/herds/byId/{herdId}/outdoorSchedules",
        {
          params: { path: { herdId } },
        },
      );
      if (response.error) {
        throw new Error("Failed to fetch herd outdoor schedules");
      }
      return response.data.data;
    },
  });
};

// First day a herd change can take effect for each of these animals (null: no herd history).
// Edits with an earlier effective date are rejected by the API.
export const earliestHerdChangeDatesQueryOptions = (animalIds: string[]) => {
  const sortedAnimalIds = [...animalIds].sort();
  return queryOptions({
    queryKey: ["herds", "earliestChangeDates", sortedAnimalIds],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/animals/herds/earliestChangeDates", {
        params: { query: { animalIds: sortedAnimalIds } },
      });
      if (response.error) {
        throw new Error("Failed to fetch earliest herd change dates");
      }
      return response.data.data.result;
    },
  });
};
