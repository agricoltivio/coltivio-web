import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "./client";

export const cropsQueryOptions = () => {
  return queryOptions({
    queryKey: ["crops"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/crops");
      if (response.error) {
        throw new Error("Failed to fetch crops");
      }
      return response.data.data;
    },
  });
};

export const cropQueryOptions = (cropId: string) => {
  return queryOptions({
    queryKey: ["crops", "byId", cropId],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/crops/byId/{cropId}", {
        params: { path: { cropId } },
      });
      if (response.error) {
        throw new Error("Failed to fetch crop");
      }
      return response.data.data;
    },
  });
};

export const cropInUseQueryOptions = (cropId: string) => {
  return queryOptions({
    queryKey: ["crops", "byId", cropId, "inUse"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/crops/byId/{cropId}/inUse", {
        params: { path: { cropId } },
      });
      if (response.error) {
        throw new Error("Failed to check if crop is in use");
      }
      return response.data.data;
    },
  });
};

export const cropFamiliesQueryOptions = () => {
  return queryOptions({
    queryKey: ["cropFamilies"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/crops/families");
      if (response.error) {
        throw new Error("Failed to fetch crop families");
      }
      return response.data.data;
    },
  });
};

export const cropFamilyQueryOptions = (familyId: string) => {
  return queryOptions({
    queryKey: ["cropFamilies", "byId", familyId],
    queryFn: async () => {
      const response = await apiClient.GET(
        "/v1/crops/families/byId/{familyId}",
        { params: { path: { familyId } } },
      );
      if (response.error) {
        throw new Error("Failed to fetch crop family");
      }
      return response.data.data;
    },
  });
};

export const cropFamilyInUseQueryOptions = (familyId: string) => {
  return queryOptions({
    queryKey: ["cropFamilies", "byId", familyId, "inUse"],
    queryFn: async () => {
      const response = await apiClient.GET(
        "/v1/crops/families/byId/{familyId}/inUse",
        { params: { path: { familyId } } },
      );
      if (response.error) {
        throw new Error("Failed to check if crop family is in use");
      }
      return response.data.data;
    },
  });
};
