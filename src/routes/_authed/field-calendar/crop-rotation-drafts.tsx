import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMembership } from "@/lib/useMembership";
import { MembersOnly } from "@/components/MembersOnly";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { multiPlotPlanCropRotationsQueryOptions } from "@/api/cropRotations.queries";
import { draftPlansQueryOptions } from "@/api/cropRotationDrafts.queries";
import { plotsQueryOptions } from "@/api/plots.queries";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute(
  "/_authed/field-calendar/crop-rotation-drafts",
)({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(draftPlansQueryOptions());
    queryClient.ensureQueryData(plotsQueryOptions());
  },
  component: CropRotationDrafts,
});

function CropRotationDrafts() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasAccess } = useMembership();

  if (!hasAccess) return <MembersOnly />;

  const draftsQuery = useQuery(draftPlansQueryOptions());
  const plotsQuery = useQuery(plotsQueryOptions());

  const drafts = draftsQuery.data?.result ?? [];
  const allPlots = plotsQuery.data?.result ?? [];

  const [createOpen, setCreateOpen] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [selectedPlotIds, setSelectedPlotIds] = useState<string[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: async () => {
      // Fetch live rotations for selected plots (non-expanded, with recurrence rules)
      let plotEntries: Array<{
        plotId: string;
        rotations: Array<{
          cropId: string;
          fromDate: string;
          toDate: string;
          sowingDate?: string;
          recurrenceInterval?: number;
          recurrenceUntil?: string;
        }>;
      }> = [];

      if (selectedPlotIds.length > 0) {
        const liveData = await queryClient.fetchQuery(
          multiPlotPlanCropRotationsQueryOptions(selectedPlotIds),
        );
        // Group rotations by plotId
        const byPlot = new Map<string, typeof plotEntries[number]["rotations"]>();
        for (const plotId of selectedPlotIds) {
          byPlot.set(plotId, []);
        }
        for (const rotation of liveData.result) {
          const list = byPlot.get(rotation.plotId);
          if (!list) continue;
          list.push({
            cropId: rotation.cropId,
            fromDate: rotation.fromDate,
            toDate: rotation.toDate,
            sowingDate: rotation.sowingDate ?? undefined,
            recurrenceInterval: rotation.recurrence?.interval,
            recurrenceUntil: rotation.recurrence?.until ?? undefined,
          });
        }
        plotEntries = Array.from(byPlot.entries()).map(([plotId, rotations]) => ({
          plotId,
          rotations,
        }));
      }

      const response = await apiClient.POST("/v1/cropRotations/draftPlans", {
        body: {
          name: draftName,
          ...(plotEntries.length > 0 && { plots: plotEntries }),
        },
      });
      if (response.error) throw new Error("Failed to create draft plan");
      return response.data.data;
    },
    onSuccess: (draft) => {
      queryClient.invalidateQueries({ queryKey: ["cropRotations", "draftPlans"] });
      setCreateOpen(false);
      setDraftName("");
      setSelectedPlotIds([]);
      void navigate({
        to: "/field-calendar/crop-rotation-drafts/$draftPlanId",
        params: { draftPlanId: draft.id },
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (draftPlanId: string) => {
      const response = await apiClient.DELETE(
        "/v1/cropRotations/draftPlans/byId/{draftPlanId}",
        { params: { path: { draftPlanId } } },
      );
      if (response.error) throw new Error("Failed to delete draft plan");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cropRotations", "draftPlans"] });
      setDeleteConfirmId(null);
    },
  });

  function handleOpenCreate() {
    setDraftName("");
    setSelectedPlotIds([]);
    setCreateOpen(true);
  }

  const allSelected = selectedPlotIds.length === allPlots.length;

  return (
    <PageContent
      title={t("fieldCalendar.cropRotationDrafts.title")}
      showBackButton
      backTo={() => void navigate({ to: "/field-calendar/crop-rotations" })}
    >
      <div className="flex justify-end mb-4">
        <Button onClick={handleOpenCreate}>
          {t("fieldCalendar.cropRotationDrafts.createDraft")}
        </Button>
      </div>

      {drafts.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">
          {t("fieldCalendar.cropRotationDrafts.noDrafts")}
        </p>
      ) : (
        <div className="rounded-md border divide-y">
          {drafts.map((draft) => (
            <div
              key={draft.id}
              className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() =>
                navigate({
                  to: "/field-calendar/crop-rotation-drafts/$draftPlanId",
                  params: { draftPlanId: draft.id },
                })
              }
            >
              <div>
                <div className="text-sm font-medium">{draft.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {new Date(draft.createdAt).toLocaleDateString()}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteConfirmId(draft.id);
                }}
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Create draft dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("fieldCalendar.cropRotationDrafts.createDraft")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>{t("fieldCalendar.cropRotationDrafts.draftName")}</Label>
              <Input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder={t("fieldCalendar.cropRotationDrafts.draftName")}
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>{t("fieldCalendar.cropRotationDrafts.selectPlots")}</Label>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!draftName.trim() || createMutation.isPending}
            >
              {t("fieldCalendar.cropRotationDrafts.createDraft")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {t("fieldCalendar.cropRotationDrafts.deleteDraft")}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("fieldCalendar.cropRotationDrafts.deleteDraftConfirm")}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteConfirmId) deleteMutation.mutate(deleteConfirmId);
              }}
              disabled={deleteMutation.isPending}
            >
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContent>
  );
}
