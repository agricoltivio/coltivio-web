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
