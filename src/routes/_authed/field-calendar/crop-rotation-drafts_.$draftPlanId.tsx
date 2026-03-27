import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { plotPlanCropRotationsQueryOptions } from "@/api/cropRotations.queries";
import { draftPlanQueryOptions } from "@/api/cropRotationDrafts.queries";
import { plotsQueryOptions } from "@/api/plots.queries";
import { CropRotationTimeline } from "@/components/CropRotationTimeline";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import type { CropRotation } from "@/api/types";
import type { ZoomLevel } from "@/lib/cropRotationTimelineUtils";

export const Route = createFileRoute(
  "/_authed/field-calendar/crop-rotation-drafts_/$draftPlanId",
)({
  loader: ({ context: { queryClient }, params: { draftPlanId } }) => {
    queryClient.ensureQueryData(draftPlanQueryOptions(draftPlanId));
    queryClient.ensureQueryData(plotsQueryOptions());
  },
  component: DraftPlanDetail,
});

function DraftPlanDetail() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { draftPlanId } = Route.useParams();

  const draftQuery = useQuery(draftPlanQueryOptions(draftPlanId));
  const plotsQuery = useQuery(plotsQueryOptions());

  const draft = draftQuery.data;
  const allPlots = plotsQuery.data?.result ?? [];

  const [zoom, setZoom] = useState<ZoomLevel>("years");
  const [applyConfirmOpen, setApplyConfirmOpen] = useState(false);
  const [editPlotsOpen, setEditPlotsOpen] = useState(false);
  const [selectedPlotIds, setSelectedPlotIds] = useState<string[]>([]);

  const currentYear = new Date().getFullYear();
  const timelineStart = new Date(currentYear - 10, 0, 1);
  const timelineEnd = new Date(currentYear + 25, 11, 31, 23, 59, 59);

  // Build CropRotation-compatible objects for the timeline by adding plot.name from allPlots
  const draftRotations: CropRotation[] = (draft?.plots ?? []).flatMap((draftPlot) => {
    const plot = allPlots.find((p) => p.id === draftPlot.plotId);
    const plotName = plot?.name ?? "";
    return draftPlot.rotations.map((r) => ({
      ...r,
      plotId: draftPlot.plotId,
      plot: { name: plotName },
    }));
  });

  // Only show plots that are in the draft
  const draftPlotIds = new Set((draft?.plots ?? []).map((p) => p.plotId));
  const draftPlots = allPlots.filter((p) => draftPlotIds.has(p.id));


  const applyMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.POST(
        "/v1/cropRotations/draftPlans/byId/{draftPlanId}/apply",
        {
          params: { path: { draftPlanId } },
          body: {},
        },
      );
      if (response.error) throw new Error("Failed to apply draft plan");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cropRotations"] });
      setApplyConfirmOpen(false);
      void navigate({ to: "/field-calendar/crop-rotations" });
    },
  });

  const editPlotsMutation = useMutation({
    mutationFn: async (newPlotIds: string[]) => {
      if (!draft) return;

      const currentPlotIds = new Set(draft.plots.map((p) => p.plotId));
      const addedPlotIds = newPlotIds.filter((id) => !currentPlotIds.has(id));
      const keptPlotIds = new Set(newPlotIds.filter((id) => currentPlotIds.has(id)));

      // Keep existing rotations for plots still in selection
      const keptPlots = draft.plots
        .filter((p) => keptPlotIds.has(p.plotId))
        .map((p) => ({
          plotId: p.plotId,
          rotations: p.rotations.map((r) => ({
            cropId: r.cropId,
            fromDate: r.fromDate,
            toDate: r.toDate,
            sowingDate: r.sowingDate ?? undefined,
            recurrenceInterval: r.recurrence?.interval,
            recurrenceUntil: r.recurrence?.until ?? undefined,
          })),
        }));

      // Fetch live rotations for newly added plots (one query per plot — proven serialization)
      let addedPlots: typeof keptPlots = [];
      if (addedPlotIds.length > 0) {
        const results = await Promise.all(
          addedPlotIds.map((plotId) =>
            queryClient.fetchQuery(plotPlanCropRotationsQueryOptions(plotId)),
          ),
        );
        addedPlots = addedPlotIds.map((plotId, i) => ({
          plotId,
          rotations: (results[i].result ?? []).map((r) => ({
            cropId: r.cropId,
            fromDate: r.fromDate,
            toDate: r.toDate,
            sowingDate: r.sowingDate ?? undefined,
            recurrenceInterval: r.recurrence?.interval,
            recurrenceUntil: r.recurrence?.until ?? undefined,
          })),
        }));
      }

      const response = await apiClient.PATCH(
        "/v1/cropRotations/draftPlans/byId/{draftPlanId}",
        {
          params: { path: { draftPlanId } },
          body: { plots: [...keptPlots, ...addedPlots] },
        },
      );
      if (response.error) throw new Error("Failed to update draft plan plots");
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["cropRotations", "draftPlans", "byId", draftPlanId],
      });
      setEditPlotsOpen(false);
    },
  });

  function openEditPlots() {
    setSelectedPlotIds((draft?.plots ?? []).map((p) => p.plotId));
    setEditPlotsOpen(true);
  }

  const allSelected = selectedPlotIds.length === allPlots.length;

  return (
    <PageContent
      title={draft?.name ?? "…"}
      showBackButton
      backTo={() => void navigate({ to: "/field-calendar/crop-rotation-drafts" })}
    >
      <div className="flex items-center justify-end gap-2 mb-4">
        <Button variant="outline" size="sm" onClick={openEditPlots}>
          {t("fieldCalendar.cropRotationDrafts.editPlots")}
        </Button>
        <Button size="sm" onClick={() => setApplyConfirmOpen(true)}>
          {t("fieldCalendar.cropRotationDrafts.applyDraft")}
        </Button>
      </div>

      <CropRotationTimeline
        rotations={draftRotations}
        plots={draftPlots}
        zoom={zoom}
        onZoomChange={setZoom}
        timelineStart={timelineStart}
        timelineEnd={timelineEnd}
        onPlotClick={(plotId) =>
          void navigate({
            to: "/field-calendar/crop-rotation-drafts/$draftPlanId/plots/$plotId/crop-rotations",
            params: { draftPlanId, plotId },
          })
        }
        onBarClick={(rotationId) => {
          const rotation = draftRotations.find((r) => r.id === rotationId);
          if (rotation) {
            void navigate({
              to: "/field-calendar/crop-rotation-drafts/$draftPlanId/plots/$plotId/crop-rotations",
              params: { draftPlanId, plotId: rotation.plotId },
            });
          }
        }}
      />

      {/* Apply confirmation */}
      <Dialog open={applyConfirmOpen} onOpenChange={setApplyConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {t("fieldCalendar.cropRotationDrafts.applyDraft")}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("fieldCalendar.cropRotationDrafts.applyDraftConfirm")}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyConfirmOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => applyMutation.mutate()}
              disabled={applyMutation.isPending}
            >
              {t("fieldCalendar.cropRotationDrafts.applyDraft")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit plots dialog */}
      <Dialog open={editPlotsOpen} onOpenChange={setEditPlotsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("fieldCalendar.cropRotationDrafts.editPlots")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {t("fieldCalendar.cropRotationDrafts.selectPlots")}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto py-0 text-xs"
                onClick={() =>
                  allSelected
                    ? setSelectedPlotIds([])
                    : setSelectedPlotIds(allPlots.map((p) => p.id))
                }
              >
                {allSelected
                  ? t("fieldCalendar.cropRotationDrafts.deselectAll")
                  : t("fieldCalendar.cropRotationDrafts.selectAll")}
              </Button>
            </div>
            <div className="rounded-md border max-h-48 overflow-y-auto divide-y">
              {allPlots.map((plot) => (
                <label
                  key={plot.id}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedPlotIds.includes(plot.id)}
                    onCheckedChange={(checked) =>
                      setSelectedPlotIds((prev) =>
                        checked
                          ? [...prev, plot.id]
                          : prev.filter((id) => id !== plot.id),
                      )
                    }
                  />
                  <span className="text-sm">{plot.name}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("fieldCalendar.cropRotationDrafts.selectPlotsHint")}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPlotsOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => editPlotsMutation.mutate(selectedPlotIds)}
              disabled={editPlotsMutation.isPending}
            >
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContent>
  );
}
