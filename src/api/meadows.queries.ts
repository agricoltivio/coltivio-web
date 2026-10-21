import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { apiClient } from "./client";

// Archived meadows are left out unless includeArchived is set
export const meadowsQueryOptions = (includeArchived: boolean = false) => {
  return queryOptions({
    queryKey: includeArchived ? ["meadows", "includingArchived"] : ["meadows"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/meadows", {
        params: { query: { includeArchived: includeArchived ? "true" : "false" } },
      });
      if (response.error) {
        throw new Error("Failed to fetch meadows");
      }
      return response.data.data.result;
    },
  });
};

export const meadowQueryOptions = (meadowId: string) => {
  return queryOptions({
    queryKey: ["meadows", meadowId],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/meadows/byId/{meadowId}", {
        params: { path: { meadowId } },
      });
      if (response.error) {
        throw new Error("Failed to fetch meadow");
      }
      return response.data.data;
    },
  });
};

// Up to 10 years back until 3 years ahead, as date-only strings
const currentYear = new Date().getFullYear();
const usageFromDate = `${currentYear - 10}-01-01`;
const usageToDate = `${currentYear + 3}-12-31`;

export const meadowUsageQueryOptions = (meadowId: string) => {
  return queryOptions({
    queryKey: ["meadows", meadowId, "usage", usageFromDate, usageToDate],
    queryFn: async () => {
      const response = await apiClient.GET(
        "/v1/meadows/byId/{meadowId}/usage",
        {
          params: {
            path: { meadowId },
            query: { fromDate: usageFromDate, toDate: usageToDate },
          },
        },
      );
      if (response.error) {
        throw new Error("Failed to fetch meadow usage");
      }
      return response.data.data.result;
    },
  });
};

type MeadowGeometry = { type: "MultiPolygon"; coordinates: number[][][][] };

// Meadow name/size is embedded in herd schedules and the outdoor journal, so those
// caches are invalidated on every meadow change too
function useInvalidateMeadowQueries() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["meadows"] });
    void queryClient.invalidateQueries({ queryKey: ["herds"] });
    void queryClient.invalidateQueries({ queryKey: ["outdoorJournal"] });
  };
}

export function useCreateMeadowMutation() {
  const invalidate = useInvalidateMeadowQueries();
  return useMutation({
    mutationFn: async (body: {
      name: string;
      geometry: MeadowGeometry;
      additionalNotes?: string | null;
    }) => {
      const response = await apiClient.POST("/v1/meadows", { body });
      if (response.error) throw new Error("Failed to create meadow");
      return response.data.data;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateMeadowMutation() {
  const invalidate = useInvalidateMeadowQueries();
  return useMutation({
    mutationFn: async ({
      meadowId,
      body,
    }: {
      meadowId: string;
      body: {
        name?: string;
        geometry?: MeadowGeometry;
        additionalNotes?: string | null;
        archived?: boolean;
      };
    }) => {
      const response = await apiClient.PATCH("/v1/meadows/byId/{meadowId}", {
        params: { path: { meadowId } },
        body,
      });
      if (response.error) throw new Error("Failed to update meadow");
      return response.data.data;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteMeadowMutation() {
  const invalidate = useInvalidateMeadowQueries();
  return useMutation({
    mutationFn: async (meadowId: string) => {
      const response = await apiClient.DELETE("/v1/meadows/byId/{meadowId}", {
        params: { path: { meadowId } },
      });
      if (response.error) throw new Error("Failed to delete meadow");
    },
    onSuccess: invalidate,
  });
}
