import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

// The openapi-ts code-gen for these two endpoints produces a broken discriminated union
// where the `strategy` field is typed as the schema name literal (e.g. "PostV1PlotsMergeRequestBody")
// instead of the actual API values ("keep_reference" | "delete_and_migrate").
// We define local types matching the real API contract and suppress at the apiClient call.

type SubPlotGeometry = { type: "MultiPolygon"; coordinates: number[][][][]; };
type SubPlot = { geometry: SubPlotGeometry; name: string; size: number };

export type SplitPlotBody =
  | { strategy: "keep_reference"; originalPlotName?: string; subPlots: SubPlot[] }
  | { strategy: "delete_and_migrate"; migrateToIndex: number; subPlots: SubPlot[] };

export type MergePlotsBody =
  | { strategy: "keep_reference"; plotIds: string[]; name: string; localId?: string; usage?: number; cuttingDate?: string | null; additionalNotes?: string }
  | { strategy: "delete_and_migrate"; plotIds: string[]; name: string; localId?: string; usage?: number; cuttingDate?: string | null; additionalNotes?: string };

export const plotsQueryOptions = () => {
  return queryOptions({
    queryKey: ["plots"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/plots");
      if (response.error) {
        throw new Error("Failed to fetch plots");
      }
      return response.data.data;
    },
  });
};

export const plotQueryOptions = (plotId: string) => {
  return queryOptions({
    queryKey: ["plots", "byId", plotId],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/plots/byId/{plotId}", {
        params: { path: { plotId } },
      });
      if (response.error) {
        throw new Error("Failed to fetch plot");
      }
      return response.data.data;
    },
  });
};

export function useSplitPlotMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ plotId, body }: { plotId: string; body: SplitPlotBody }) => {
      const response = await apiClient.POST("/v1/plots/byId/{plotId}/split", {
        params: { path: { plotId } },
        // @ts-expect-error — generated discriminated union type is broken (Record<string, never> intersection)
        body,
      });
      if (response.error) throw new Error("Failed to split plot");
      return response.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["plots"] });
    },
  });
}

export function useCreatePlotMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      name: string;
      geometry: { type: "MultiPolygon"; coordinates: number[][][][]; };
      size: number;
      localId?: string;
      usage?: number;
      cuttingDate?: string | null;
      additionalNotes?: string;
    }) => {
      const response = await apiClient.POST("/v1/plots", { body });
      if (response.error) throw new Error("Failed to create plot");
      return response.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["plots"] });
    },
  });
}

export function useUpdatePlotMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ plotId, body }: {
      plotId: string;
      body: {
        name?: string;
        geometry?: { type: "MultiPolygon"; coordinates: number[][][][]; };
        size?: number;
        localId?: string;
        usage?: number;
        cuttingDate?: string | null;
        additionalNotes?: string;
      };
    }) => {
      const response = await apiClient.PATCH("/v1/plots/byId/{plotId}", {
        params: { path: { plotId } },
        body,
      });
      if (response.error) throw new Error("Failed to update plot");
      return response.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["plots"] });
    },
  });
}

export function useMergePlotsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: MergePlotsBody) => {
      const response = await apiClient.POST("/v1/plots/merge", {
        // @ts-expect-error — generated discriminated union type is broken (Record<string, never> intersection)
        body,
      });
      if (response.error) throw new Error("Failed to merge plots");
      return response.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["plots"] });
    },
  });
}
