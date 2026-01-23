import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "./client";

export const productsQueryOptions = () => {
  return queryOptions({
    queryKey: ["products"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/products");
      if (response.error) {
        throw new Error("Failed to fetch products");
      }
      return response.data.data;
    },
  });
};

export const productQueryOptions = (productId: string) => {
  return queryOptions({
    queryKey: ["products", "byId", productId],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/products/byId/{productId}", {
        params: { path: { productId } },
      });
      if (response.error) {
        throw new Error("Failed to fetch product");
      }
      return response.data.data;
    },
  });
};

export const activeProductsQueryOptions = () => {
  return queryOptions({
    queryKey: ["products", "active"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/products/active");
      if (response.error) {
        throw new Error("Failed to fetch active products");
      }
      return response.data.data;
    },
  });
};
