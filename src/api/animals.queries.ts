import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "./client";

export const animalsQueryOptions = (onlyLiving?: boolean) => {
  return queryOptions({
    queryKey: ["animals", onlyLiving],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/animals", {
        params: { query: { onlyLiving: String(onlyLiving) } },
      });
      if (response.error) {
        throw new Error("Failed to fetch animals");
      }
      return response.data.data;
    },
  });
};

export const animalFamilyTreeQueryOptions = (type: string) => {
  return queryOptions({
    queryKey: ["animals", "familyTree", type],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/animals/familyTree", {
        params: {
          query: {
            type: type as
              | "goat"
              | "sheep"
              | "cow"
              | "horse"
              | "donkey"
              | "pig"
              | "deer",
          },
        },
      });
      if (response.error) {
        throw new Error("Failed to fetch family tree");
      }
      return response.data.data;
    },
  });
};

export const animalQueryOptions = (animalId: string) => {
  return queryOptions({
    queryKey: ["animals", "byid", animalId],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/animals/byId/{animalId}", {
        params: { path: { animalId } },
      });
      if (response.error) {
        throw new Error("Failed to fetch animal");
      }
      return response.data.data;
    },
  });
};
