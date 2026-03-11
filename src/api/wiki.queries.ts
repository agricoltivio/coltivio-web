import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "./client";

type WikiLocale = "de" | "en" | "it" | "fr";

export const wikiEntriesQueryOptions = (params?: {
  locale?: WikiLocale;
  categorySlug?: string;
  tagSlug?: string;
  search?: string;
}) =>
  queryOptions({
    queryKey: ["wiki", "entries", params],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/wiki", {
        params: { query: params },
      });
      if (response.error) throw new Error("Failed to fetch wiki entries");
      return response.data.data;
    },
  });


export const myWikiEntriesQueryOptions = () =>
  queryOptions({
    queryKey: ["wiki", "myEntries"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/wiki/myEntries");
      if (response.error) throw new Error("Failed to fetch my wiki entries");
      return response.data.data;
    },
  });

export const myChangeRequestsQueryOptions = () =>
  queryOptions({
    queryKey: ["wiki", "myChangeRequests"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/wiki/myChangeRequests");
      if (response.error) throw new Error("Failed to fetch my change requests");
      return response.data.data;
    },
  });

export const wikiCategoriesQueryOptions = () =>
  queryOptions({
    queryKey: ["wiki", "categories"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/wiki/categories");
      if (response.error) throw new Error("Failed to fetch wiki categories");
      return response.data.data;
    },
  });

export const wikiTagsQueryOptions = () =>
  queryOptions({
    queryKey: ["wiki", "tags"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/wiki/tags");
      if (response.error) throw new Error("Failed to fetch wiki tags");
      return response.data.data;
    },
  });

export const reviewQueueQueryOptions = () =>
  queryOptions({
    queryKey: ["wiki", "reviewQueue"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/wiki/reviewQueue");
      if (response.error) throw new Error("Failed to fetch review queue");
      return response.data.data;
    },
  });

export const changeRequestByIdQueryOptions = (changeRequestId: string) =>
  queryOptions({
    queryKey: ["wiki", "changeRequests", changeRequestId],
    queryFn: async () => {
      const response = await apiClient.GET(
        "/v1/wiki/changeRequests/byId/{changeRequestId}",
        { params: { path: { changeRequestId } } },
      );
      if (response.error) throw new Error("Failed to fetch change request");
      return response.data.data;
    },
  });

export const changeRequestNotesQueryOptions = (changeRequestId: string) =>
  queryOptions({
    queryKey: ["wiki", "changeRequests", changeRequestId, "notes"],
    queryFn: async () => {
      const response = await apiClient.GET(
        "/v1/wiki/changeRequests/byId/{changeRequestId}/notes",
        { params: { path: { changeRequestId } } },
      );
      if (response.error) throw new Error("Failed to fetch notes");
      return response.data.data;
    },
  });

export const myChangeRequestDraftNotesQueryOptions = (changeRequestId: string) =>
  queryOptions({
    queryKey: ["wiki", "myChangeRequestDrafts", changeRequestId, "notes"],
    queryFn: async () => {
      const response = await apiClient.GET(
        "/v1/wiki/myChangeRequestDrafts/byId/{changeRequestId}/notes",
        { params: { path: { changeRequestId } } },
      );
      if (response.error) throw new Error("Failed to fetch draft CR notes");
      return response.data.data;
    },
  });

export const wikiEntryByIdQueryOptions = (entryId: string) =>
  queryOptions({
    queryKey: ["wiki", "byId", entryId],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/wiki/byId/{entryId}", {
        params: { path: { entryId } },
      });
      if (response.error) throw new Error("Failed to fetch wiki entry");
      return response.data.data;
    },
  });
