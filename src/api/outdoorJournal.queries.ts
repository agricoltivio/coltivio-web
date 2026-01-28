import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "./client";

export const outdoorJournalQueryOptions = () => {
  return queryOptions({
    queryKey: ["outdoorJournal"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/outdoorJournal");
      if (response.error) {
        throw new Error("Failed to fetch outdoor journal");
      }
      return response.data.data;
    },
  });
};

export const outdoorJournalEntryQueryOptions = (entryId: string) => {
  return queryOptions({
    queryKey: ["outdoorJournal", entryId],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/outdoorJournal/byId/{entryId}", {
        params: { path: { entryId } },
      });
      if (response.error) {
        throw new Error("Failed to fetch outdoor journal entry");
      }
      return response.data.data;
    },
  });
};

export const outdoorJournalCalendarQueryOptions = (from: string, to: string) => {
  return queryOptions({
    queryKey: ["outdoorJournal", "calendar", from, to],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/outdoorJournal/calendar", {
        params: { query: { from, to } },
      });
      if (response.error) {
        throw new Error("Failed to fetch outdoor journal calendar");
      }
      return response.data.data;
    },
  });
};
