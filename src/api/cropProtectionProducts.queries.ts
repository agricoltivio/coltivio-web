import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "./client";

export const cropProtectionProductsQueryOptions = () => {
  return queryOptions({
    queryKey: ["cropProtectionProducts"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/cropProtectionProducts");
      if (response.error) {
        throw new Error("Failed to fetch crop protection products");
      }
      return response.data.data;
    },
  });
};

export const cropProtectionProductQueryOptions = (
  cropProtectionProductId: string,
) => {
  return queryOptions({
    queryKey: ["cropProtectionProducts", "byId", cropProtectionProductId],
    queryFn: async () => {
      const response = await apiClient.GET(
        "/v1/cropProtectionProducts/byId/{cropProtectionProductId}",
        { params: { path: { cropProtectionProductId } } },
      );
      if (response.error) {
        throw new Error("Failed to fetch crop protection product");
      }
      return response.data.data;
    },
  });
};

export const cropProtectionProductInUseQueryOptions = (
  cropProtectionProductId: string,
) => {
  return queryOptions({
    queryKey: [
      "cropProtectionProducts",
      "byId",
      cropProtectionProductId,
      "inUse",
    ],
    queryFn: async () => {
      const response = await apiClient.GET(
        "/v1/cropProtectionProducts/byId/{cropProtectionProductId}/inUse",
        { params: { path: { cropProtectionProductId } } },
      );
      if (response.error) {
        throw new Error(
          "Failed to check if crop protection product is in use",
        );
      }
      return response.data.data;
    },
  });
};
