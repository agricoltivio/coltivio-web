import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "./client";

export const outdoorJournalQueryOptions = (fromDate: string, toDate: string) => {
  return queryOptions({
    queryKey: ["outdoorJournal", fromDate, toDate],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/animals/outdoorJournal", {
        params: { query: { fromDate, toDate } },
      });
      if (response.error) {
        throw new Error("Failed to fetch outdoor journal");
      }
      return response.data.data;
    },
  });
};
