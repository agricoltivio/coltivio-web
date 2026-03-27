import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "./client";

export const cropRotationsQueryOptions = (fromDate: string, toDate: string) => {
  return queryOptions({
    queryKey: ["cropRotations", fromDate, toDate],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/cropRotations", {
        params: { query: { fromDate, toDate } },
      });
      if (response.error) {
        throw new Error("Failed to fetch crop rotations");
      }
      return response.data.data;
    },
  });
};

export const cropRotationQueryOptions = (rotationId: string) => {
  return queryOptions({
    queryKey: ["cropRotations", "byId", rotationId],
    queryFn: async () => {
      const response = await apiClient.GET(
        "/v1/cropRotations/byId/{rotationId}",
        {
          params: { path: { rotationId } },
        },
      );
      if (response.error) {
        throw new Error("Failed to fetch crop rotation");
      }
      return response.data.data;
    },
  });
};

export const plotCropRotationsQueryOptions = (plotId: string, fromDate: string, toDate: string) => {
  return queryOptions({
    queryKey: ["plots", "byId", plotId, "cropRotations", fromDate, toDate],
    queryFn: async () => {
      const response = await apiClient.GET(
        "/v1/plots/byId/{plotId}/cropRotations",
        {
          params: {
            path: { plotId },
            query: { fromDate, toDate },
          },
        },
      );
      if (response.error) {
        throw new Error("Failed to fetch plot crop rotations");
      }
      return response.data.data;
    },
  });
};

// Used by the draft creation flow: fetches base rotations for multiple plots at once.
export const multiPlotPlanCropRotationsQueryOptions = (plotIds: string[]) => {
  const fromDate = new Date(new Date().getFullYear() - 10, 0, 1).toISOString();
  const toDate = new Date(new Date().getFullYear() + 25, 11, 31).toISOString();
  return queryOptions({
    queryKey: ["plots", "cropRotations", "plan", plotIds.slice().sort()],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/cropRotations/plots", {
        params: {
          query: {
            plotIds: plotIds as unknown,
            onlyCurrent: "false",
            expand: "false",
            withRecurrences: "true",
            fromDate,
            toDate,
          },
        },
      });
      if (response.error) {
        throw new Error("Failed to fetch crop rotations for planning");
      }
      return response.data.data;
    },
  });
};

// Used by the plan screen: fetches base rotations (not expanded) with recurrence rules.
// expand=false means recurring rotations are returned once with their recurrence rule,
// not as multiple individual occurrences.
export const plotPlanCropRotationsQueryOptions = (plotId: string) => {
  const fromDate = new Date(new Date().getFullYear() - 10, 0, 1).toISOString();
  const toDate = new Date(new Date().getFullYear() + 25, 11, 31).toISOString();
  return queryOptions({
    queryKey: ["plots", "byId", plotId, "cropRotations", "plan"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/cropRotations/plots", {
        params: {
          query: {
            plotIds: plotId as unknown,
            onlyCurrent: "false",
            expand: "false",
            withRecurrences: "true",
            fromDate,
            toDate,
          },
        },
      });
      if (response.error) {
        throw new Error("Failed to fetch plot crop rotations for planning");
      }
      return response.data.data;
    },
  });
};
