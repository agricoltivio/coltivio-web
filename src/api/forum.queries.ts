import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "./client";
import type { components } from "./schema";

type ForumThreadType = components["schemas"]["GetV1ForumThreadsParameterType"];
type ForumThreadStatus = components["schemas"]["GetV1ForumThreadsParameterStatus"];

export const forumThreadsQueryOptions = (params?: {
  type?: ForumThreadType;
  status?: ForumThreadStatus;
  search?: string;
}) => {
  return queryOptions({
    queryKey: ["forum", "threads", params ?? {}],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/forum/threads", {
        params: { query: params },
      });
      if (response.error) {
        throw new Error("Failed to fetch forum threads");
      }
      return response.data.data;
    },
  });
};

export const forumThreadQueryOptions = (threadId: string) => {
  return queryOptions({
    queryKey: ["forum", "threads", "byId", threadId],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/forum/threads/byId/{threadId}", {
        params: { path: { threadId } },
      });
      if (response.error) {
        throw new Error("Failed to fetch forum thread");
      }
      return response.data.data;
    },
  });
};

export const forumRepliesQueryOptions = (threadId: string) => {
  return queryOptions({
    queryKey: ["forum", "threads", "byId", threadId, "replies"],
    queryFn: async () => {
      const response = await apiClient.GET(
        "/v1/forum/threads/byId/{threadId}/replies",
        { params: { path: { threadId } } },
      );
      if (response.error) {
        throw new Error("Failed to fetch forum replies");
      }
      return response.data.data;
    },
  });
};
