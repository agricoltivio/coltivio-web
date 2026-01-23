import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "./client";

export const contactsQueryOptions = () => {
  return queryOptions({
    queryKey: ["contacts"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/contacts");
      if (response.error) {
        throw new Error("Failed to fetch contacts");
      }
      return response.data.data;
    },
  });
};

export const contactQueryOptions = (contactId: string) => {
  return queryOptions({
    queryKey: ["contacts", "byId", contactId],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/contacts/byId/{contactId}", {
        params: { path: { contactId } },
      });
      if (response.error) {
        throw new Error("Failed to fetch contact");
      }
      return response.data.data;
    },
  });
};
