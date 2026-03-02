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
