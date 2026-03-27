import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { z } from "zod";
import { Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { cropFamiliesQueryOptions, cropsQueryOptions } from "@/api/crops.queries";
import { plotPlanCropRotationsQueryOptions } from "@/api/cropRotations.queries";
import { plotQueryOptions } from "@/api/plots.queries";
import { CROP_CATEGORIES, type Crop, type CropCategory } from "@/api/types";
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
import {
  detectConflicts,
  detectWaitingTimeViolations,
  expandRanges,
  getAllGridLines,
  getScaleForZoomLevel,
  getTodayX,
  hexToRgba,
  stringToColor,
  type RecurrenceRule,
  type RotationEntry,
  type WaitingTimeViolation,
  type ZoomLevel,
} from "@/lib/cropRotationTimelineUtils";

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

// Build flat list of bars for the timeline (recurrences expanded, one bar per occurrence).
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
        left: Math.max(
          0,
          ((clampedFrom.getTime() - timelineStart.getTime()) / MS_PER_DAY) * pxPerDay,
        ),
        width: Math.max(
          2,
          ((clampedTo.getTime() - clampedFrom.getTime()) / MS_PER_DAY) * pxPerDay,
        ),
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

// Computed once per session — the planning window spans 10 years back to 25 years forward.
const CURRENT_YEAR = new Date().getFullYear();
const TIMELINE_START = new Date(CURRENT_YEAR - 10, 0, 1);
const TIMELINE_END = new Date(CURRENT_YEAR + 25, 11, 31);
const MS_PER_DAY = 86_400_000;

const searchSchema = z.object({});

export const Route = createFileRoute(
  "/_authed/field-calendar/plots_/$plotId_/crop-rotations",
)({
  validateSearch: searchSchema,
  loader: ({ context: { queryClient }, params: { plotId } }) => {
    queryClient.ensureQueryData(plotQueryOptions(plotId));
    queryClient.ensureQueryData(plotPlanCropRotationsQueryOptions(plotId));
    queryClient.ensureQueryData(cropsQueryOptions());
    queryClient.ensureQueryData(cropFamiliesQueryOptions());
  },
  component: PlanCropRotations,
});

// --- Main planning component ---

function PlanCropRotations() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { plotId } = Route.useParams();
  const plotQuery = useQuery(plotQueryOptions(plotId));
  const rotationsQuery = useQuery(plotPlanCropRotationsQueryOptions(plotId));
  const cropsQuery = useQuery(cropsQueryOptions());

  const plot = plotQuery.data;
  const crops = cropsQuery.data?.result ?? [];

  const [rotations, setRotations] = useState<RotationEntry[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<RotationEntry | null>(null);
  const [zoom, setZoom] = useState<ZoomLevel>("years");

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  // Stores the visible center date before a zoom change so scroll can be restored.
  const centerDateRef = useRef<Date | null>(null);

  // Initialize local rotation list from server data exactly once.
  useEffect(() => {
    if (initialized || !rotationsQuery.data) return;
    setRotations(
      rotationsQuery.data.result.map((r) => ({
        entryId: `existing-${r.id}`,
        cropId: r.cropId,
        fromDate: new Date(r.fromDate),
        toDate: new Date(r.toDate),
        recurrence: r.recurrence
          ? {
              interval: r.recurrence.interval,
              until: r.recurrence.until ? new Date(r.recurrence.until) : undefined,
            }
          : undefined,
        isNew: false,
      })),
    );
    setInitialized(true);
  }, [rotationsQuery.data, initialized]);

  // Scroll to today once, after the first time `initialized` becomes true.
  // Using initialized as the trigger (rather than []) ensures the component has
  // its final layout even on a hard reload where data loads asynchronously.
  const initialScrollDoneRef = useRef(false);
  useEffect(() => {
    if (!initialized || initialScrollDoneRef.current) return;
    initialScrollDoneRef.current = true;
    const frame = requestAnimationFrame(() => {
      if (!scrollAreaRef.current) return;
      const pxPerDay = getScaleForZoomLevel(zoom);
      const todayOffset = getTodayX(TIMELINE_START, pxPerDay);
      scrollAreaRef.current.scrollLeft = Math.max(
        0,
        todayOffset - scrollAreaRef.current.clientWidth / 2,
      );
      if (headerScrollRef.current) {
        headerScrollRef.current.scrollLeft = scrollAreaRef.current.scrollLeft;
      }
    });
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized]);

  // After zoom changes, restore scroll so the same date stays centered.
  useEffect(() => {
    if (!scrollAreaRef.current || !centerDateRef.current) return;
    const pxPerDay = getScaleForZoomLevel(zoom);
    const centerDays =
      (centerDateRef.current.getTime() - TIMELINE_START.getTime()) / MS_PER_DAY;
    scrollAreaRef.current.scrollLeft = Math.max(
      0,
      centerDays * pxPerDay - scrollAreaRef.current.clientWidth / 2,
    );
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = scrollAreaRef.current.scrollLeft;
    }
    centerDateRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  const pxPerDay = getScaleForZoomLevel(zoom);

  const conflicts = useMemo(
    () => detectConflicts(rotations, crops, TIMELINE_END),
    [rotations, crops],
  );
  const hasConflicts = conflicts.size > 0;

  const waitingTimeViolations = useMemo(
    () => detectWaitingTimeViolations(rotations, crops, TIMELINE_END),
    [rotations, crops],
  );
  const hasWaitingTimeViolations = waitingTimeViolations.size > 0;

  const gridLines = useMemo(
    () => getAllGridLines(zoom, TIMELINE_START, TIMELINE_END, pxPerDay),
    [zoom, pxPerDay],
  );
  const totalWidth = Math.ceil(
    ((TIMELINE_END.getTime() - TIMELINE_START.getTime()) / MS_PER_DAY) * pxPerDay,
  );
  const todayX = getTodayX(TIMELINE_START, pxPerDay);

  const timelineBars = useMemo(
    () =>
      buildPlanTimelineBars(
        rotations,
        crops,
        conflicts,
        TIMELINE_START,
        TIMELINE_END,
        pxPerDay,
      ),
    [rotations, crops, conflicts, pxPerDay],
  );

  const handleBodyScroll = useCallback(() => {
    if (headerScrollRef.current && scrollAreaRef.current) {
      headerScrollRef.current.scrollLeft = scrollAreaRef.current.scrollLeft;
    }
  }, []);

  function scrollToToday() {
    if (!scrollAreaRef.current) return;
    const todayOffset = getTodayX(TIMELINE_START, pxPerDay);
    scrollAreaRef.current.scrollLeft = Math.max(
      0,
      todayOffset - scrollAreaRef.current.clientWidth / 2,
    );
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = scrollAreaRef.current.scrollLeft;
    }
  }

  // Batch-replace all rotations for this plot. The server treats this as the full
  // intended state (creates, updates, and deletes happen server-side by comparison).
  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.POST("/v1/cropRotations/batch/byPlot", {
        body: {
          plotId,
          crops: rotations.map((r) => ({
            cropId: r.cropId,
            fromDate: r.fromDate.toISOString(),
            toDate: r.toDate.toISOString(),
            ...(r.recurrence && {
              recurrence: {
                interval: r.recurrence.interval,
                ...(r.recurrence.until && {
                  until: r.recurrence.until.toISOString(),
                }),
              },
            }),
          })),
        },
      });
      if (response.error) throw new Error("Failed to save crop rotations");
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cropRotations"] });
      queryClient.invalidateQueries({ queryKey: ["plots"] });
      router.history.back();
    },
  });

  function openAddDialog() {
    setEditingEntry(null);
    setDialogOpen(true);
  }

  function openEditDialog(entry: RotationEntry) {
    setEditingEntry(entry);
    setDialogOpen(true);
  }

  function handleDialogSave(data: {
    cropId: string;
    fromDate: Date;
    toDate: Date;
    recurrence?: RecurrenceRule;
  }) {
    if (editingEntry) {
      setRotations((prev) =>
        prev.map((r) => (r.entryId === editingEntry.entryId ? { ...r, ...data } : r)),
      );
    } else {
      setRotations((prev) => [
        ...prev,
        { entryId: `new-${Date.now()}`, isNew: true, ...data },
      ]);
    }
    setDialogOpen(false);
  }

  function handleDialogDelete(entryId: string) {
    setRotations((prev) => prev.filter((r) => r.entryId !== entryId));
    setDialogOpen(false);
  }

  const ROW_HEIGHT = 36;

  return (
    <PageContent
      title={
        plot
          ? t("fieldCalendar.cropRotations.planFor", { name: plot.name })
          : t("fieldCalendar.cropRotations.title")
      }
      showBackButton
      backTo={() =>
        router.history.back()
      }
    >
      {/* Timeline — single row showing all entries with recurrences expanded */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex items-center justify-between">
          <ToggleGroup
            type="single"
            variant="outline"
            spacing={0}
            value={zoom}
            onValueChange={(value) => {
              if (!value) return;
              // Capture center date before the zoom change so the effect can restore it.
              if (scrollAreaRef.current) {
                const centerX =
                  scrollAreaRef.current.scrollLeft +
                  scrollAreaRef.current.clientWidth / 2;
                centerDateRef.current = new Date(
                  TIMELINE_START.getTime() + (centerX / pxPerDay) * MS_PER_DAY,
                );
              }
              setZoom(value as ZoomLevel);
            }}
          >
            <ToggleGroupItem value="years">
              {t("fieldCalendar.timeline.years")}
            </ToggleGroupItem>
            <ToggleGroupItem value="months">
              {t("fieldCalendar.timeline.months")}
            </ToggleGroupItem>
            <ToggleGroupItem value="weeks">
              {t("fieldCalendar.timeline.weeks")}
            </ToggleGroupItem>
          </ToggleGroup>
          <Button variant="outline" size="sm" onClick={scrollToToday}>
            {t("fieldCalendar.timeline.today")}
          </Button>
        </div>

        <div className="rounded-md border overflow-hidden">
          {/* Scrollable header with time labels */}
          <div className="flex border-b bg-muted/30">
            <div
              ref={headerScrollRef}
              className="flex-1 overflow-hidden"
              style={{ pointerEvents: "none" }}
            >
              <div className="relative" style={{ width: totalWidth, height: 32 }}>
                {gridLines
                  .filter((l) => l.isMajor && l.label)
                  .map((line, i) => (
                    <div
                      key={`h-${i}`}
                      className="absolute top-0 bottom-0 flex items-center border-l border-border px-1"
                      style={{ left: line.x }}
                    >
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {line.label}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Single-row scrollable body */}
          <div
            ref={scrollAreaRef}
            className="overflow-x-auto"
            onScroll={handleBodyScroll}
          >
            <div
              className="relative"
              style={{ width: totalWidth, height: ROW_HEIGHT }}
            >
              {/* Grid lines */}
              {gridLines.map((line, i) => (
                <div
                  key={`g-${i}`}
                  className={`absolute top-0 bottom-0 border-l ${line.isMajor ? "border-border" : "border-border/30"}`}
                  style={{ left: line.x }}
                />
              ))}

              {/* Today line */}
              <div
                className="absolute top-0 bottom-0 border-l-2 border-destructive z-10"
                style={{ left: todayX }}
              />

              {/* Bars — click opens the edit dialog for that entry */}
              {timelineBars.map((bar, i) => (
                <button
                  key={`${bar.entryId}-${i}`}
                  className={`absolute top-1.5 bottom-1.5 rounded-sm transition-opacity overflow-hidden flex items-center px-1 cursor-pointer hover:opacity-90 ${bar.hasConflict ? "bg-destructive" : ""} ${bar.isNew ? "ring-1 ring-inset ring-white/60" : ""}`}
                  style={{
                    left: bar.left,
                    width: Math.max(bar.width, 4),
                    ...(bar.hasConflict
                      ? {}
                      : {
                          backgroundColor: hexToRgba(stringToColor(bar.cropName), 0.82),
                          borderLeft: `3px solid ${stringToColor(bar.cropName)}`,
                        }),
                  }}
                  title={`${bar.cropName}: ${bar.fromDate.toLocaleDateString()} – ${bar.toDate.toLocaleDateString()}`}
                  onClick={() => {
                    const entry = rotations.find((r) => r.entryId === bar.entryId);
                    if (entry) openEditDialog(entry);
                  }}
                >
                  {bar.width > 30 && (
                    <span className="text-white text-xs font-medium truncate leading-none">
                      {bar.cropName}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Rotation list */}
      <div className="mb-24">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm">
            {t("fieldCalendar.cropRotations.title")}
          </h2>
          <Button variant="outline" size="sm" onClick={openAddDialog}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            {t("fieldCalendar.cropRotations.addRotation")}
          </Button>
        </div>

        {rotations.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">
            {t("fieldCalendar.cropRotations.noRotations")}
          </p>
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
                  onClick={() => openEditDialog(entry)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{crop?.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {entry.fromDate.toLocaleDateString()} –{" "}
                        {entry.toDate.toLocaleDateString()}
                        {entry.recurrence && (
                          <span className="ml-2">
                            {"· "}
                            {t("fieldCalendar.cropRotations.repeatEveryPrefix")}{" "}
                            {entry.recurrence.interval}{" "}
                            {t("fieldCalendar.cropRotations.repeatEverySuffix")}
                            {entry.recurrence.until &&
                              ` (${t("fieldCalendar.cropRotations.repeatUntil")} ${entry.recurrence.until.toLocaleDateString()})`}
                          </span>
                        )}
                      </div>
                      {conflictMsg && (
                        <div className="text-xs text-destructive mt-1">
                          {t("fieldCalendar.cropRotations.overlapsWith", {
                            crop: conflictMsg,
                          })}
                        </div>
                      )}
                      {waitingViolation && !conflictMsg && (
                        <div className="text-xs text-amber-600 mt-1">
                          {t("fieldCalendar.cropRotations.waitingTimeViolation", {
                            crop: waitingViolation.conflictingCropName,
                            years: waitingViolation.requiredYears,
                          })}
                        </div>
                      )}
                    </div>
                    {entry.isNew && (
                      <span className="shrink-0 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                        {t("fieldCalendar.cropRotations.new")}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Sticky save bar — always visible at the bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t px-6 py-3 flex items-center gap-4 z-20">
        {hasConflicts && (
          <p className="text-sm text-destructive flex-1">
            {t("fieldCalendar.cropRotations.resolveConflicts")}
          </p>
        )}
        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            onClick={() =>
              router.history.back()
            }
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={hasConflicts || saveMutation.isPending}
          >
            {t("fieldCalendar.cropRotations.savePlan")}
          </Button>
        </div>
      </div>

      <RotationDialog
        open={dialogOpen}
        entry={editingEntry}
        crops={crops}
        onSave={handleDialogSave}
        onDelete={handleDialogDelete}
        onClose={() => setDialogOpen(false)}
      />
    </PageContent>
  );
}

type CropModalFormData = {
  name: string;
  category: CropCategory;
  variety: string;
  familyId: string;
  waitingTimeInYears: string;
  additionalNotes: string;
};

// --- Add / Edit rotation dialog ---

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
  onSave: (data: {
    cropId: string;
    fromDate: Date;
    toDate: Date;
    recurrence?: RecurrenceRule;
  }) => void;
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
    defaultValues: {
      name: "",
      category: "grain",
      variety: "",
      familyId: "",
      waitingTimeInYears: "",
      additionalNotes: "",
    },
  });

  const createCropMutation = useMutation({
    mutationFn: async (data: CropModalFormData) => {
      const response = await apiClient.POST("/v1/crops", {
        body: {
          name: data.name,
          category: data.category,
          variety: data.variety || undefined,
          waitingTimeInYears: data.waitingTimeInYears
            ? Number(data.waitingTimeInYears)
            : undefined,
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

  // Sync form fields whenever the dialog opens (with a different entry or as a fresh add).
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
        setUntilDate(
          entry.recurrence.until
            ? entry.recurrence.until.toISOString().split("T")[0]
            : "",
        );
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
      recurrence: hasRecurrence
        ? {
            interval: intervalNum,
            until: hasUntil && untilDate ? new Date(untilDate) : undefined,
          }
        : undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {entry
              ? t("fieldCalendar.cropRotations.editRotation")
              : t("fieldCalendar.cropRotations.addRotation")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Crop */}
          <div className="space-y-1.5">
            <Label>{t("fieldCalendar.cropRotations.crop")}</Label>
            <div className="flex gap-1">
            <div className="flex-1 min-w-0">
            <Select value={cropId} onValueChange={(v) => { if (v) setCropId(v); }}>
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={t("fieldCalendar.cropRotations.selectCrop")}
                />
              </SelectTrigger>
              <SelectContent>
                {crops.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setCreateCropOpen(true)}
            >
              <Plus className="size-4" />
            </Button>
            </div>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("fieldCalendar.cropRotations.fromDate")}</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("fieldCalendar.cropRotations.toDate")}</Label>
              <Input
                type="date"
                value={toDate}
                min={fromDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>

          {/* Optional recurrence */}
          <div>
            {!hasRecurrence ? (
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setHasRecurrence(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                {t("fieldCalendar.cropRotations.addRecurrence")}
              </Button>
            ) : (
              <div className="rounded-md border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {t("fieldCalendar.cropRotations.recurrence")}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setHasRecurrence(false)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span>{t("fieldCalendar.cropRotations.repeatEveryPrefix")}</span>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={recurrenceInterval}
                    onChange={(e) => setRecurrenceInterval(e.target.value)}
                    className="w-16 h-7"
                  />
                  <span>{t("fieldCalendar.cropRotations.repeatEverySuffix")}</span>
                </div>
                {!hasUntil ? (
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => setHasUntil(true)}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    {t("fieldCalendar.cropRotations.addEndDate")}
                  </Button>
                ) : (
                  <div className="flex items-end gap-2">
                    <div className="space-y-1.5 flex-1">
                      <Label className="text-xs">
                        {t("fieldCalendar.cropRotations.repeatUntil")}
                      </Label>
                      <Input
                        type="date"
                        value={untilDate}
                        min={toDate}
                        onChange={(e) => setUntilDate(e.target.value)}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() => {
                        setHasUntil(false);
                        setUntilDate("");
                      }}
                    >
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
            <Button
              variant="destructive"
              size="icon"
              type="button"
              onClick={() => onDelete(entry.entryId)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button variant="outline" className="flex-1" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={!cropId || !fromDate || !toDate}
          >
            {t("common.save")}
          </Button>
        </div>
      </DialogContent>

      {/* Inline create crop dialog (nested inside RotationDialog's Dialog) */}
      <Dialog
        open={createCropOpen}
        onOpenChange={(isOpen) => {
          setCreateCropOpen(isOpen);
          if (!isOpen) cropForm.reset();
        }}
      >
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
              <Select
                value={cropForm.watch("category")}
                onValueChange={(v) =>
                  cropForm.setValue("category", v as CropCategory)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CROP_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {t(`crops.categories.${cat}`)}
                    </SelectItem>
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
              <Select
                value={cropForm.watch("familyId") || "__none__"}
                onValueChange={(v) =>
                  cropForm.setValue("familyId", v === "__none__" ? "" : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("common.noSelection")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    {t("common.noSelection")}
                  </SelectItem>
                  {families.map((family) => (
                    <SelectItem key={family.id} value={family.id}>
                      {family.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("crops.waitingTimeInYears")}</Label>
              <Input
                type="number"
                min="0"
                {...cropForm.register("waitingTimeInYears")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("crops.additionalNotes")}</Label>
              <Textarea {...cropForm.register("additionalNotes")} />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateCropOpen(false);
                cropForm.reset();
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={cropForm.handleSubmit((data) =>
                createCropMutation.mutate(data),
              )}
              disabled={createCropMutation.isPending}
            >
              {t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
