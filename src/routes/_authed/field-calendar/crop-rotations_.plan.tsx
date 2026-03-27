import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { cropFamiliesQueryOptions, cropsQueryOptions } from "@/api/crops.queries";
import { plotPlanCropRotationsQueryOptions } from "@/api/cropRotations.queries";
import { plotsQueryOptions } from "@/api/plots.queries";
import { CROP_CATEGORIES, type Crop, type CropCategory } from "@/api/types";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { TimelineRotation, ZoomLevel } from "@/lib/cropRotationTimelineUtils";

// --- Domain types ---

type RecurrenceRule = {
  interval: number;
  until?: Date;
};

type RotationEntry = {
  entryId: string;
  cropId: string;
  fromDate: Date;
  toDate: Date;
  recurrence?: RecurrenceRule;
  isNew: boolean;
};

type PlanTimelineBar = {
  entryId: string;
  left: number;
  width: number;
  cropName: string;
  cropCategory: Crop["category"];
  hasConflict: boolean;
  isNew: boolean;
  fromDate: Date;
  toDate: Date;
};

// --- Pure utilities ---

function addYears(date: Date, years: number): Date {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

function expandRanges(entry: RotationEntry, timelineEnd: Date): Array<{ from: Date; to: Date }> {
  if (!entry.recurrence) return [{ from: entry.fromDate, to: entry.toDate }];
  const effectiveUntil =
    entry.recurrence.until && entry.recurrence.until < timelineEnd
      ? entry.recurrence.until
      : timelineEnd;
  const ranges: Array<{ from: Date; to: Date }> = [];
  const durationMs = entry.toDate.getTime() - entry.fromDate.getTime();
  let currentFrom = new Date(entry.fromDate);
  let iteration = 0;
  while (currentFrom <= effectiveUntil && iteration < 100) {
    ranges.push({ from: new Date(currentFrom), to: new Date(currentFrom.getTime() + durationMs) });
    currentFrom = addYears(currentFrom, entry.recurrence.interval);
    iteration++;
  }
  return ranges;
}

type WaitingTimeViolation = { conflictingCropName: string; requiredYears: number };

function detectWaitingTimeViolations(
  entries: RotationEntry[],
  crops: Crop[],
  timelineEnd: Date,
): Map<string, WaitingTimeViolation> {
  const violations = new Map<string, WaitingTimeViolation>();
  type ExpandedRange = { entryId: string; cropName: string; groupKey: string; waitingTimeYears: number; from: Date; to: Date };
  const allRanges: ExpandedRange[] = [];
  for (const entry of entries) {
    const crop = crops.find((c) => c.id === entry.cropId);
    if (!crop) continue;
    const waitingTimeYears = crop.waitingTimeInYears ?? crop.family?.waitingTimeInYears ?? 0;
    if (waitingTimeYears <= 0) continue;
    const groupKey = crop.familyId ? `family:${crop.familyId}` : `crop:${crop.id}`;
    for (const range of expandRanges(entry, timelineEnd)) {
      allRanges.push({ entryId: entry.entryId, cropName: crop.name, groupKey, waitingTimeYears, from: range.from, to: range.to });
    }
  }
  const groups = new Map<string, ExpandedRange[]>();
  for (const r of allRanges) {
    const g = groups.get(r.groupKey) ?? [];
    g.push(r);
    groups.set(r.groupKey, g);
  }
  for (const groupRanges of groups.values()) {
    const sorted = [...groupRanges].sort((a, b) => a.from.getTime() - b.from.getTime());
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        if (sorted[i].to > sorted[j].from) continue; // overlap already caught by detectConflicts
        const gapMs = sorted[j].from.getTime() - sorted[i].to.getTime();
        const requiredYears = Math.max(sorted[i].waitingTimeYears, sorted[j].waitingTimeYears);
        if (gapMs < requiredYears * 365.25 * 24 * 60 * 60 * 1000) {
          if (!violations.has(sorted[i].entryId)) violations.set(sorted[i].entryId, { conflictingCropName: sorted[j].cropName, requiredYears });
          if (!violations.has(sorted[j].entryId)) violations.set(sorted[j].entryId, { conflictingCropName: sorted[i].cropName, requiredYears });
        }
      }
    }
  }
  return violations;
}

function detectConflicts(entries: RotationEntry[], crops: Crop[], timelineEnd: Date): Map<string, string> {
  const conflicts = new Map<string, string>();
  const expanded = entries.map((e) => expandRanges(e, timelineEnd));
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      let overlapping = false;
      outer: for (const rangeA of expanded[i]) {
        for (const rangeB of expanded[j]) {
          if (rangeA.from <= rangeB.to && rangeA.to >= rangeB.from) {
            overlapping = true;
            break outer;
          }
        }
      }
      if (overlapping) {
        const nameI = crops.find((c) => c.id === entries[i].cropId)?.name ?? "?";
        const nameJ = crops.find((c) => c.id === entries[j].cropId)?.name ?? "?";
        if (!conflicts.has(entries[i].entryId)) conflicts.set(entries[i].entryId, nameJ);
        if (!conflicts.has(entries[j].entryId)) conflicts.set(entries[j].entryId, nameI);
      }
    }
  }
  return conflicts;
}

function buildPlanTimelineBars(
  entries: RotationEntry[],
  crops: Crop[],
  conflicts: Map<string, string>,
  timelineStart: Date,
  timelineEnd: Date,
  pxPerDay: number,
): PlanTimelineBar[] {
  const MS_PER_DAY = 86_400_000;
  const bars: PlanTimelineBar[] = [];
  for (const entry of entries) {
    const crop = crops.find((c) => c.id === entry.cropId);
    if (!crop) continue;
    const hasConflict = conflicts.has(entry.entryId);
    for (const range of expandRanges(entry, timelineEnd)) {
      const clampedFrom = range.from < timelineStart ? timelineStart : range.from;
      const clampedTo = range.to > timelineEnd ? timelineEnd : range.to;
      if (clampedFrom >= clampedTo) continue;
      bars.push({
        entryId: entry.entryId,
        left: Math.max(0, ((clampedFrom.getTime() - timelineStart.getTime()) / MS_PER_DAY) * pxPerDay),
        width: Math.max(2, ((clampedTo.getTime() - clampedFrom.getTime()) / MS_PER_DAY) * pxPerDay),
        cropName: crop.name,
        cropCategory: crop.category,
        hasConflict,
        isNew: entry.isNew,
        fromDate: range.from,
        toDate: range.to,
      });
    }
  }
  return bars;
}

// --- Route ---

const CURRENT_YEAR = new Date().getFullYear();
const TIMELINE_START = new Date(CURRENT_YEAR - 10, 0, 1);
const TIMELINE_END = new Date(CURRENT_YEAR + 25, 11, 31);
const MS_PER_DAY = 86_400_000;

const searchSchema = z.object({
  plotIds: z.array(z.string()).min(1),
});

export const Route = createFileRoute(
  "/_authed/field-calendar/crop-rotations_/plan",
)({
  validateSearch: searchSchema,
  loaderDeps: ({ search: { plotIds } }) => ({ plotIds }),
  loader: ({ context: { queryClient }, deps: { plotIds } }) => {
    queryClient.ensureQueryData(cropsQueryOptions());
    queryClient.ensureQueryData(cropFamiliesQueryOptions());
    queryClient.ensureQueryData(plotsQueryOptions());
    for (const plotId of plotIds) {
      queryClient.ensureQueryData(plotPlanCropRotationsQueryOptions(plotId));
    }
  },
  component: PlanMultipleCropRotations,
});

// --- Main component ---

function PlanMultipleCropRotations() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { plotIds } = Route.useSearch();

  const plotsQuery = useQuery(plotsQueryOptions());
  const cropsQuery = useQuery(cropsQueryOptions());
  const crops = cropsQuery.data?.result ?? [];
  const allPlots = plotsQuery.data?.result ?? [];

  // Per-plot rotation state, keyed by plotId
  const [plotRotations, setPlotRotations] = useState<Record<string, RotationEntry[]>>({});
  const [zoom, setZoom] = useState<ZoomLevel>("years");

  function updatePlotRotations(plotId: string, rotations: RotationEntry[]) {
    setPlotRotations((prev) => ({ ...prev, [plotId]: rotations }));
  }

  const hasAnyConflict = plotIds.some((plotId) =>
    detectConflicts(plotRotations[plotId] ?? [], crops, TIMELINE_END).size > 0,
  );
  const hasAnyWaitingTimeViolation = plotIds.some((plotId) =>
    detectWaitingTimeViolations(plotRotations[plotId] ?? [], crops, TIMELINE_END).size > 0,
  );

  // Build TimelineRotation objects from local state for the shared overview timeline
  const timelineRotations = useMemo<TimelineRotation[]>(() =>
    plotIds.flatMap((plotId) =>
      (plotRotations[plotId] ?? []).flatMap((r) => {
        const crop = crops.find((c) => c.id === r.cropId);
        return expandRanges(r, TIMELINE_END).map((range, i) => ({
          id: `${r.entryId}-${i}`,
          plotId,
          fromDate: range.from.toISOString(),
          toDate: range.to.toISOString(),
          crop: { name: crop?.name ?? "", category: crop?.category ?? "other" },
        }));
      }),
    ),
  [plotIds, plotRotations, crops]);

  const timelinePlots = allPlots.filter((p) => plotIds.includes(p.id));
  const currentYear = new Date().getFullYear();
  const timelineStart = new Date(currentYear - 10, 0, 1);
  const timelineEnd = new Date(currentYear + 25, 11, 31, 23, 59, 59);

  const saveAllMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.PATCH("/v1/cropRotations/plan", {
        body: {
          plots: plotIds.map((plotId) => ({
            plotId,
            rotations: (plotRotations[plotId] ?? []).map((r) => ({
              cropId: r.cropId,
              fromDate: r.fromDate.toISOString(),
              toDate: r.toDate.toISOString(),
              ...(r.recurrence && {
                recurrence: {
                  interval: r.recurrence.interval,
                  ...(r.recurrence.until && { until: r.recurrence.until.toISOString() }),
                },
              }),
            })),
          })),
        },
      });
      if (res.error) throw new Error("Failed to save plan");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cropRotations"] });
      queryClient.invalidateQueries({ queryKey: ["plots"] });
      void navigate({ to: "/field-calendar/crop-rotations" });
    },
  });

  return (
    <PageContent
      title={t("fieldCalendar.cropRotations.plan")}
      showBackButton
      backTo={() => void navigate({ to: "/field-calendar/crop-rotations" })}
    >
      <CropRotationTimeline
        rotations={timelineRotations}
        plots={timelinePlots}
        zoom={zoom}
        onZoomChange={setZoom}
        timelineStart={timelineStart}
        timelineEnd={timelineEnd}
      />

      <div className="space-y-8 mb-24 mt-6">
        {plotIds.map((plotId) => {
          const plot = allPlots.find((p) => p.id === plotId);
          return (
            <PlotRotationSection
              key={plotId}
              plotId={plotId}
              plotName={plot?.name ?? plotId}
              crops={crops}
              rotations={plotRotations[plotId] ?? []}
              onRotationsChange={(rotations) => updatePlotRotations(plotId, rotations)}
            />
          );
        })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t px-6 py-3 flex items-center gap-4 z-20">
        {hasAnyConflict && (
          <p className="text-sm text-destructive flex-1">
            {t("fieldCalendar.cropRotations.resolveConflicts")}
          </p>
        )}
        {!hasAnyConflict && hasAnyWaitingTimeViolation && (
          <p className="text-sm text-amber-600 flex-1">
            {t("fieldCalendar.cropRotations.resolveWaitingTimeViolations")}
          </p>
        )}
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={() => void navigate({ to: "/field-calendar/crop-rotations" })}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={() => saveAllMutation.mutate()}
            disabled={hasAnyConflict || hasAnyWaitingTimeViolation || saveAllMutation.isPending}
          >
            {t("fieldCalendar.cropRotations.saveAll")}
          </Button>
        </div>
      </div>
    </PageContent>
  );
}

// --- Per-plot section ---

function PlotRotationSection({
  plotId,
  plotName,
  crops,
  rotations,
  onRotationsChange,
}: {
  plotId: string;
  plotName: string;
  crops: Crop[];
  rotations: RotationEntry[];
  onRotationsChange: (rotations: RotationEntry[]) => void;
}) {
  const { t } = useTranslation();
  const rotationsQuery = useQuery(plotPlanCropRotationsQueryOptions(plotId));
  const [initialized, setInitialized] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<RotationEntry | null>(null);

  const conflicts = useMemo(() => detectConflicts(rotations, crops, TIMELINE_END), [rotations, crops]);
  const waitingTimeViolations = useMemo(() => detectWaitingTimeViolations(rotations, crops, TIMELINE_END), [rotations, crops]);

  // Initialize from server data once
  useEffect(() => {
    if (initialized || !rotationsQuery.data) return;
    onRotationsChange(
      rotationsQuery.data.result.map((r) => ({
        entryId: `existing-${r.id}`,
        cropId: r.cropId,
        fromDate: new Date(r.fromDate),
        toDate: new Date(r.toDate),
        recurrence: r.recurrence
          ? { interval: r.recurrence.interval, until: r.recurrence.until ? new Date(r.recurrence.until) : undefined }
          : undefined,
        isNew: false,
      })),
    );
    setInitialized(true);
  }, [rotationsQuery.data, initialized, onRotationsChange]);

  function handleDialogSave(data: { cropId: string; fromDate: Date; toDate: Date; recurrence?: RecurrenceRule }) {
    if (editingEntry) {
      onRotationsChange(rotations.map((r) => (r.entryId === editingEntry.entryId ? { ...r, ...data } : r)));
    } else {
      onRotationsChange([...rotations, { entryId: `new-${Date.now()}`, isNew: true, ...data }]);
    }
    setDialogOpen(false);
  }

  function handleDialogDelete(entryId: string) {
    onRotationsChange(rotations.filter((r) => r.entryId !== entryId));
    setDialogOpen(false);
  }

  return (
    <div className="rounded-md border p-4 space-y-4">
      <h3 className="font-semibold">{plotName}</h3>

      {/* Rotation list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium">{t("fieldCalendar.cropRotations.title")}</h4>
          <Button variant="outline" size="sm" onClick={() => { setEditingEntry(null); setDialogOpen(true); }}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            {t("fieldCalendar.cropRotations.addRotation")}
          </Button>
        </div>
        {rotations.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">{t("fieldCalendar.cropRotations.noRotations")}</p>
        ) : (
          <div className="rounded-md border divide-y">
            {rotations.map((entry) => {
              const crop = crops.find((c) => c.id === entry.cropId);
              const conflictMsg = conflicts.get(entry.entryId);
              const waitingViolation = waitingTimeViolations.get(entry.entryId);
              return (
                <button
                  key={entry.entryId}
                  className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ${conflictMsg ? "border-l-2 border-l-destructive" : waitingViolation ? "border-l-2 border-l-amber-500" : ""}`}
                  onClick={() => { setEditingEntry(entry); setDialogOpen(true); }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{crop?.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {entry.fromDate.toLocaleDateString()} – {entry.toDate.toLocaleDateString()}
                        {entry.recurrence && (
                          <span className="ml-2">
                            {"· "}{t("fieldCalendar.cropRotations.repeatEveryPrefix")} {entry.recurrence.interval} {t("fieldCalendar.cropRotations.repeatEverySuffix")}
                            {entry.recurrence.until && ` (${t("fieldCalendar.cropRotations.repeatUntil")} ${entry.recurrence.until.toLocaleDateString()})`}
                          </span>
                        )}
                      </div>
                      {conflictMsg && <div className="text-xs text-destructive mt-1">{t("fieldCalendar.cropRotations.overlapsWith", { crop: conflictMsg })}</div>}
                      {waitingViolation && !conflictMsg && (
                        <div className="text-xs text-amber-600 mt-1">
                          {t("fieldCalendar.cropRotations.waitingTimeViolation", { crop: waitingViolation.conflictingCropName, years: waitingViolation.requiredYears })}
                        </div>
                      )}
                    </div>
                    {entry.isNew && <span className="shrink-0 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">{t("fieldCalendar.cropRotations.new")}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <RotationDialog
        open={dialogOpen}
        entry={editingEntry}
        crops={crops}
        onSave={handleDialogSave}
        onDelete={handleDialogDelete}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}

// --- Add / Edit rotation dialog ---

type CropModalFormData = {
  name: string;
  category: CropCategory;
  variety: string;
  familyId: string;
  waitingTimeInYears: string;
  additionalNotes: string;
};

function RotationDialog({
  open,
  entry,
  crops,
  onSave,
  onDelete,
  onClose,
}: {
  open: boolean;
  entry: RotationEntry | null;
  crops: Crop[];
  onSave: (data: { cropId: string; fromDate: Date; toDate: Date; recurrence?: RecurrenceRule }) => void;
  onDelete: (entryId: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [cropId, setCropId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [hasRecurrence, setHasRecurrence] = useState(false);
  const [recurrenceInterval, setRecurrenceInterval] = useState("1");
  const [hasUntil, setHasUntil] = useState(false);
  const [untilDate, setUntilDate] = useState("");
  const [createCropOpen, setCreateCropOpen] = useState(false);

  const familiesQuery = useQuery(cropFamiliesQueryOptions());
  const families = familiesQuery.data?.result ?? [];

  const cropForm = useForm<CropModalFormData>({
    defaultValues: { name: "", category: "grain", variety: "", familyId: "", waitingTimeInYears: "", additionalNotes: "" },
  });

  const createCropMutation = useMutation({
    mutationFn: async (data: CropModalFormData) => {
      const response = await apiClient.POST("/v1/crops", {
        body: {
          name: data.name,
          category: data.category,
          variety: data.variety || undefined,
          waitingTimeInYears: data.waitingTimeInYears ? Number(data.waitingTimeInYears) : undefined,
          familyId: data.familyId || undefined,
          additionalNotes: data.additionalNotes || undefined,
          usageCodes: [],
        },
      });
      if (response.error) throw new Error("Failed to create crop");
      return response.data.data;
    },
    onSuccess: (newCrop) => {
      queryClient.setQueryData(cropsQueryOptions().queryKey, (old) => {
        if (!old) return old;
        return { ...old, result: [...old.result, newCrop] };
      });
      queryClient.invalidateQueries({ queryKey: ["crops"] });
      setCropId(newCrop.id);
      setCreateCropOpen(false);
      cropForm.reset();
    },
  });

  useEffect(() => {
    if (!open) return;
    if (entry) {
      setCropId(entry.cropId);
      setFromDate(entry.fromDate.toISOString().split("T")[0]);
      setToDate(entry.toDate.toISOString().split("T")[0]);
      if (entry.recurrence) {
        setHasRecurrence(true);
        setRecurrenceInterval(String(entry.recurrence.interval));
        setHasUntil(!!entry.recurrence.until);
        setUntilDate(entry.recurrence.until ? entry.recurrence.until.toISOString().split("T")[0] : "");
      } else {
        setHasRecurrence(false);
        setRecurrenceInterval("1");
        setHasUntil(false);
        setUntilDate("");
      }
    } else {
      const today = new Date().toISOString().split("T")[0];
      setCropId("");
      setFromDate(today);
      setToDate(today);
      setHasRecurrence(false);
      setRecurrenceInterval("1");
      setHasUntil(false);
      setUntilDate("");
    }
  }, [open, entry]);

  function handleSave() {
    if (!cropId || !fromDate || !toDate) return;
    const intervalNum = Math.max(1, parseInt(recurrenceInterval) || 1);
    onSave({
      cropId,
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
      recurrence: hasRecurrence ? { interval: intervalNum, until: hasUntil && untilDate ? new Date(untilDate) : undefined } : undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{entry ? t("fieldCalendar.cropRotations.editRotation") : t("fieldCalendar.cropRotations.addRotation")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>{t("fieldCalendar.cropRotations.crop")}</Label>
            <div className="flex gap-1">
              <div className="flex-1 min-w-0">
                <Select value={cropId} onValueChange={(v) => { if (v) setCropId(v); }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("fieldCalendar.cropRotations.selectCrop")} />
                  </SelectTrigger>
                  <SelectContent>
                    {crops.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" variant="outline" size="icon" onClick={() => setCreateCropOpen(true)}>
                <Plus className="size-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("fieldCalendar.cropRotations.fromDate")}</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("fieldCalendar.cropRotations.toDate")}</Label>
              <Input type="date" value={toDate} min={fromDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </div>

          <div>
            {!hasRecurrence ? (
              <Button variant="outline" size="sm" type="button" onClick={() => setHasRecurrence(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                {t("fieldCalendar.cropRotations.addRecurrence")}
              </Button>
            ) : (
              <div className="rounded-md border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t("fieldCalendar.cropRotations.recurrence")}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setHasRecurrence(false)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span>{t("fieldCalendar.cropRotations.repeatEveryPrefix")}</span>
                  <Input type="number" min="1" step="1" value={recurrenceInterval} onChange={(e) => setRecurrenceInterval(e.target.value)} className="w-16 h-7" />
                  <span>{t("fieldCalendar.cropRotations.repeatEverySuffix")}</span>
                </div>
                {!hasUntil ? (
                  <Button variant="outline" size="sm" type="button" onClick={() => setHasUntil(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    {t("fieldCalendar.cropRotations.addEndDate")}
                  </Button>
                ) : (
                  <div className="flex items-end gap-2">
                    <div className="space-y-1.5 flex-1">
                      <Label className="text-xs">{t("fieldCalendar.cropRotations.repeatUntil")}</Label>
                      <Input type="date" value={untilDate} min={toDate} onChange={(e) => setUntilDate(e.target.value)} />
                    </div>
                    <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => { setHasUntil(false); setUntilDate(""); }}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          {entry && (
            <Button variant="destructive" size="icon" type="button" onClick={() => onDelete(entry.entryId)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button variant="outline" className="flex-1" onClick={onClose}>{t("common.cancel")}</Button>
          <Button className="flex-1" onClick={handleSave} disabled={!cropId || !fromDate || !toDate}>{t("common.save")}</Button>
        </div>
      </DialogContent>

      <Dialog open={createCropOpen} onOpenChange={(isOpen) => { setCreateCropOpen(isOpen); if (!isOpen) cropForm.reset(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("crops.createCrop")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("crops.name")} *</Label>
              <Input {...cropForm.register("name", { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("crops.category")} *</Label>
              <Select value={cropForm.watch("category")} onValueChange={(v) => cropForm.setValue("category", v as CropCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CROP_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{t(`crops.categories.${cat}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("crops.variety")}</Label>
              <Input {...cropForm.register("variety")} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("crops.family")}</Label>
              <Select value={cropForm.watch("familyId") || "__none__"} onValueChange={(v) => cropForm.setValue("familyId", v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder={t("common.noSelection")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t("common.noSelection")}</SelectItem>
                  {families.map((family) => (
                    <SelectItem key={family.id} value={family.id}>{family.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("crops.waitingTimeInYears")}</Label>
              <Input type="number" min="0" {...cropForm.register("waitingTimeInYears")} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("crops.additionalNotes")}</Label>
              <Textarea {...cropForm.register("additionalNotes")} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateCropOpen(false); cropForm.reset(); }}>{t("common.cancel")}</Button>
            <Button onClick={cropForm.handleSubmit((data) => createCropMutation.mutate(data))} disabled={createCropMutation.isPending}>{t("common.create")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
