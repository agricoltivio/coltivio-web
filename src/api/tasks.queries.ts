import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "./client";
import type { components } from "./schema";

type TaskStatus = components["schemas"]["GetV1TasksParameterStatus"];

export const tasksQueryOptions = (params?: {
  status?: TaskStatus;
  assigneeId?: string;
  label?: string;
}) => {
  return queryOptions({
    queryKey: ["tasks", params ?? {}],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/tasks", {
        params: { query: params },
      });
      if (response.error) {
        throw new Error("Failed to fetch tasks");
      }
      return response.data.data;
    },
  });
};

export const taskQueryOptions = (taskId: string) => {
  return queryOptions({
    queryKey: ["tasks", "byId", taskId],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/tasks/byId/{taskId}", {
        params: { path: { taskId } },
      });
      if (response.error) {
        throw new Error("Failed to fetch task");
      }
      return response.data.data;
    },
  });
};
