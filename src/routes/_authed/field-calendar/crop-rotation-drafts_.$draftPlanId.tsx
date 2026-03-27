import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
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
import type { CropRotation } from "@/api/types";
import type { TimelineRotation, ZoomLevel } from "@/lib/cropRotationTimelineUtils";
import { Plus } from "lucide-react";

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
  const [selectedPlotIds, setSelectedPlotIds] = useState<string[]>([]);
  const [applyConfirmOpen, setApplyConfirmOpen] = useState(false);

  const currentYear = new Date().getFullYear();
  const timelineStart = new Date(currentYear - 10, 0, 1);
  const timelineEnd = new Date(currentYear + 25, 11, 31, 23, 59, 59);

  // Build TimelineRotation[] with recurrences expanded from the draft response
  const timelineRotations: TimelineRotation[] = (draft?.plots ?? []).flatMap((draftPlot) =>
    draftPlot.rotations.flatMap((r) => {
      const fromDate = new Date(r.fromDate);
      const toDate = new Date(r.toDate);
      if (!r.recurrence) {
        return [{
          id: r.id,
          plotId: draftPlot.plotId,
          fromDate: r.fromDate,
          toDate: r.toDate,
          crop: { name: r.crop.name, category: r.crop.category as CropRotation["crop"]["category"] },
        }];
      }
      // Expand recurring entries
      const durationMs = toDate.getTime() - fromDate.getTime();
      const effectiveUntil = r.recurrence.until
        ? new Date(r.recurrence.until) < timelineEnd ? new Date(r.recurrence.until) : timelineEnd
        : timelineEnd;
      const ranges: TimelineRotation[] = [];
      let current = new Date(fromDate);
      let iteration = 0;
      while (current <= effectiveUntil && iteration < 100) {
        ranges.push({
          id: `${r.id}-${iteration}`,
          plotId: draftPlot.plotId,
          fromDate: current.toISOString(),
          toDate: new Date(current.getTime() + durationMs).toISOString(),
          crop: { name: r.crop.name, category: r.crop.category as CropRotation["crop"]["category"] },
        });
        current = new Date(current);
        current.setFullYear(current.getFullYear() + r.recurrence.interval);
        iteration++;
      }
      return ranges;
    }),
  );

  const draftPlotIds = new Set((draft?.plots ?? []).map((p) => p.plotId));
  const draftPlots = allPlots.filter((p) => draftPlotIds.has(p.id));

  const applyMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.POST(
        "/v1/cropRotations/draftPlans/byId/{draftPlanId}/apply",
        { params: { path: { draftPlanId } }, body: {} },
      );
      if (response.error) throw new Error("Failed to apply draft plan");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cropRotations"] });
      setApplyConfirmOpen(false);
      void navigate({ to: "/field-calendar/crop-rotations" });
    },
  });

  function navigateToEdit(plotIds: string[]) {
    void navigate({
      to: "/field-calendar/crop-rotation-drafts/$draftPlanId/edit",
      params: { draftPlanId },
      search: { plotIds },
    });
  }

  return (
    <PageContent
      title={draft?.name ?? "…"}
      showBackButton
      backTo={() => void navigate({ to: "/field-calendar/crop-rotation-drafts" })}
    >
      <div className="flex items-center justify-end gap-2 mb-4">
        {selectedPlotIds.length > 0 && (
          <Button size="sm" onClick={() => navigateToEdit(selectedPlotIds)}>
            <Plus className="h-4 w-4 mr-2" />
            {t("fieldCalendar.cropRotations.plan")} ({selectedPlotIds.length})
          </Button>
        )}
        <Button size="sm" onClick={() => setApplyConfirmOpen(true)}>
          {t("fieldCalendar.cropRotationDrafts.applyDraft")}
        </Button>
      </div>

      <CropRotationTimeline
        rotations={timelineRotations}
        plots={draftPlots}
        zoom={zoom}
        onZoomChange={setZoom}
        timelineStart={timelineStart}
        timelineEnd={timelineEnd}
        selectedPlotIds={selectedPlotIds}
        onPlotSelect={(plotId, selected) =>
          setSelectedPlotIds((prev) =>
            selected ? [...prev, plotId] : prev.filter((id) => id !== plotId),
          )
        }
        onPlotClick={(plotId) => navigateToEdit([plotId])}
      />

      <Dialog open={applyConfirmOpen} onOpenChange={setApplyConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("fieldCalendar.cropRotationDrafts.applyDraft")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("fieldCalendar.cropRotationDrafts.applyDraftConfirm")}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyConfirmOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={() => applyMutation.mutate()} disabled={applyMutation.isPending}>
              {t("fieldCalendar.cropRotationDrafts.applyDraft")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContent>
  );
}
