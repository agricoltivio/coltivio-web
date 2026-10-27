import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "./client";

export const parasiteChecksQueryOptions = (herdId?: string) => {
  return queryOptions({
    queryKey: ["parasiteChecks", "list", herdId ?? null],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/parasiteChecks", {
        params: { query: { herdId } },
      });
      if (response.error) {
        throw new Error("Failed to fetch parasite checks");
      }
      return response.data.data.result;
    },
  });
};

export const parasiteCheckQueryOptions = (checkId: string) => {
  return queryOptions({
    queryKey: ["parasiteChecks", "byId", checkId],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/parasiteChecks/byId/{checkId}", {
        params: { path: { checkId } },
      });
      if (response.error) {
        throw new Error("Failed to fetch parasite check");
      }
      return response.data.data;
    },
  });
};

export const animalParasiteHistoryQueryOptions = (animalId: string) => {
  return queryOptions({
    queryKey: ["parasiteChecks", "animalHistory", animalId],
    queryFn: async () => {
      const response = await apiClient.GET(
        "/v1/animals/byId/{animalId}/parasiteHistory",
        { params: { path: { animalId } } },
      );
      if (response.error) {
        throw new Error("Failed to fetch parasite history");
      }
      return response.data.data;
    },
  });
};

export const herdParasiteOverviewQueryOptions = (herdId: string) => {
  return queryOptions({
    queryKey: ["parasiteChecks", "herdOverview", herdId],
    queryFn: async () => {
      const response = await apiClient.GET(
        "/v1/animals/herds/byId/{herdId}/parasiteOverview",
        { params: { path: { herdId } } },
      );
      if (response.error) {
        throw new Error("Failed to fetch herd parasite overview");
      }
      return response.data.data.result;
    },
  });
};
