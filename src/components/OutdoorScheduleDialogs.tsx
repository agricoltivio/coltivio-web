import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { meadowsQueryOptions } from "@/api/meadows.queries";
import { parseDateOnly } from "@/lib/utils";
import type { OutdoorSchedule, OutdoorScheduleInput } from "@/api/types";
import { apiClient } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";

// Outdoor schedule dialogs of the herd page, and the draft kept while creating a meadow

type OutdoorScheduleType = OutdoorSchedule["type"];

// "monthly" is no longer offered, but existing monthly schedules stay editable
type RepeatMode = "none" | "weekly" | "monthly" | "yearly";
type Weekday = "MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU";
const ALL_WEEKDAYS: Weekday[] = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
// getDay() index (0 = Sunday) for each weekday code
const WEEKDAY_JS_INDEX: Record<Weekday, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};
const NO_MEADOW = "__none__";

function isWeekday(value: string): value is Weekday {
  return ALL_WEEKDAYS.some((weekday) => weekday === value);
}

// Unsaved schedule dialog input, kept while the user creates a meadow on the map
export type ScheduleFormValues = {
  scheduleType: OutdoorScheduleType;
  meadowId: string | null;
  repeat: RepeatMode;
  weekdays: Weekday[];
  startDate: string;
  endDate: string;
  untilDate: string;
  notes: string;
};
type ScheduleDraft = {
  herdId: string;
  scheduleId: string | null;
  herdReturnTo: string | null;
  values: ScheduleFormValues;
};
const SCHEDULE_DRAFT_STORAGE_KEY = "herd-schedule-draft";

export function storeScheduleDraft(draft: ScheduleDraft) {
  try {
    sessionStorage.setItem(SCHEDULE_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Without storage the dialog just opens empty again
  }
}

// Reads and removes the stored draft; only valid for the given herd
export function takeScheduleDraft(herdId: string): ScheduleDraft | null {
  try {
    const raw = sessionStorage.getItem(SCHEDULE_DRAFT_STORAGE_KEY);
    sessionStorage.removeItem(SCHEDULE_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "herdId" in parsed &&
      parsed.herdId === herdId &&
      "values" in parsed &&
      typeof parsed.values === "object" &&
      parsed.values !== null
    ) {
      const values = parsed.values;
      const entries = Object.entries(values);
      const text = (key: string): string => {
        const value: unknown = entries.find(([entryKey]) => entryKey === key)?.[1];
        return typeof value === "string" ? value : "";
      };
      const repeatText = text("repeat");
      const typeText = text("scheduleType");
      const weekdayList =
        "weekdays" in values && Array.isArray(values.weekdays)
          ? values.weekdays.filter(
              (weekday): weekday is Weekday =>
                typeof weekday === "string" && isWeekday(weekday),
            )
          : ALL_WEEKDAYS;
      return {
        herdId,
        scheduleId:
          "scheduleId" in parsed && typeof parsed.scheduleId === "string"
            ? parsed.scheduleId
            : null,
        herdReturnTo:
          "herdReturnTo" in parsed && typeof parsed.herdReturnTo === "string"
            ? parsed.herdReturnTo
            : null,
        values: {
          scheduleType: typeText === "exercise_yard" ? "exercise_yard" : "pasture",
          meadowId: text("meadowId") || null,
          repeat:
            repeatText === "weekly" ||
            repeatText === "monthly" ||
            repeatText === "yearly"
              ? repeatText
              : "none",
          weekdays: weekdayList,
          startDate: text("startDate"),
          endDate: text("endDate"),
          untilDate: text("untilDate"),
          notes: text("notes"),
        },
      };
    }
  } catch {
    // Invalid or unavailable storage — start fresh
  }
  return null;
}

export function ScheduleFormDialog({
  open,
  onOpenChange,
  herdId,
  schedule,
  restoredValues,
  onCreateMeadow,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  herdId: string;
  schedule: OutdoorSchedule | null;
  // Input restored after creating a meadow on the map
  restoredValues: ScheduleFormValues | null;
  onCreateMeadow: (values: ScheduleFormValues) => void;
}) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  // Archived included so an existing schedule on an archived meadow keeps it selectable
  const meadowsQuery = useQuery(meadowsQueryOptions(true));
  const initialRecurrence = schedule?.recurrence ?? null;

  const [scheduleType, setScheduleType] = useState<OutdoorScheduleType>(
    restoredValues?.scheduleType ?? schedule?.type ?? "pasture",
  );
  const [meadowId, setMeadowId] = useState<string | null>(
    restoredValues ? restoredValues.meadowId : (schedule?.meadowId ?? null),
  );
  const [repeat, setRepeat] = useState<RepeatMode>(
    restoredValues?.repeat ?? initialRecurrence?.frequency ?? "none",
  );
  // Weekly schedules saved without weekdays repeat on the start date's weekday
  const [weekdays, setWeekdays] = useState<Weekday[]>(() => {
    if (restoredValues) return restoredValues.weekdays;
    const saved = (initialRecurrence?.byWeekday ?? []).filter(isWeekday);
    if (saved.length > 0) return saved;
    if (initialRecurrence?.frequency === "weekly" && schedule) {
      // Date part only: new Date() would read it as UTC midnight, the previous day west of UTC
      const startWeekday = parseDateOnly(schedule.startDate).getDay();
      return ALL_WEEKDAYS.filter(
        (weekday) => WEEKDAY_JS_INDEX[weekday] === startWeekday,
      );
    }
    return ALL_WEEKDAYS;
  });
  // Date inputs work with "YYYY-MM-DD", which is also what the API gets
  const [startDate, setStartDate] = useState(
    restoredValues?.startDate ??
      (schedule?.startDate ? schedule.startDate.slice(0, 10) : ""),
  );
  const [endDate, setEndDate] = useState(
    restoredValues?.endDate ??
      (schedule?.endDate && initialRecurrence?.frequency !== "weekly"
        ? schedule.endDate.slice(0, 10)
        : ""),
  );
  const [untilDate, setUntilDate] = useState(
    restoredValues?.untilDate ??
      (initialRecurrence?.until ? initialRecurrence.until.slice(0, 10) : ""),
  );
  const [notes, setNotes] = useState(
    restoredValues?.notes ?? schedule?.notes ?? "",
  );

  // Localized weekday initials — 2024-01-01 is a Monday
  const weekdayFormatter = new Intl.DateTimeFormat(i18n.language, {
    weekday: "narrow",
  });
  const weekdayLongFormatter = new Intl.DateTimeFormat(i18n.language, {
    weekday: "long",
  });

  // Same-format strings compare by date
  const endBeforeStart = endDate !== "" && startDate !== "" && endDate < startDate;
  const untilBeforeStart =
    untilDate !== "" && startDate !== "" && untilDate < startDate;
  const endMissing = (repeat === "yearly" || repeat === "monthly") && endDate === "";
  const weekdaysMissing = repeat === "weekly" && weekdays.length === 0;
  const isValid =
    startDate !== "" &&
    !endBeforeStart &&
    !untilBeforeStart &&
    !endMissing &&
    !weekdaysMissing;

  function buildBody(): OutdoorScheduleInput {
    const until = untilDate || null;
    // Keep the interval of an edited schedule, the form doesn't change it
    const interval = initialRecurrence?.interval ?? 1;
    if (repeat === "weekly") {
      // Each selected weekday is a one-day stay, repeated every week
      return {
        type: scheduleType,
        meadowId,
        startDate,
        endDate: startDate,
        notes: notes || null,
        recurrence: {
          frequency: "weekly",
          interval,
          byWeekday: ALL_WEEKDAYS.filter((weekday) =>
            weekdays.includes(weekday),
          ),
          until,
        },
      };
    }
    return {
      type: scheduleType,
      meadowId,
      startDate,
      endDate: endDate || null,
      notes: notes || null,
      recurrence:
        repeat === "none"
          ? null
          : {
              frequency: repeat,
              interval,
              byMonthDay: initialRecurrence?.byMonthDay ?? null,
              until,
            },
    };
  }

  const createMutation = useMutation({
    mutationFn: async (body: OutdoorScheduleInput) => {
      const response = await apiClient.POST(
        "/v1/animals/herds/byId/{herdId}/outdoorSchedules",
        {
          params: { path: { herdId } },
          body,
        },
      );
      if (response.error) throw new Error("Failed to create schedule");
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["herds"] });
      queryClient.invalidateQueries({ queryKey: ["outdoorJournal"] });
      queryClient.invalidateQueries({ queryKey: ["meadows"] });
      onOpenChange(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (body: OutdoorScheduleInput) => {
      if (!schedule) return;
      const response = await apiClient.PATCH(
        "/v1/animals/herds/outdoorSchedules/byId/{outdoorScheduleId}",
        {
          params: { path: { outdoorScheduleId: schedule.id } },
          body,
        },
      );
      if (response.error) throw new Error("Failed to update schedule");
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["herds"] });
      queryClient.invalidateQueries({ queryKey: ["outdoorJournal"] });
      queryClient.invalidateQueries({ queryKey: ["meadows"] });
      onOpenChange(false);
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isValid) return;
    const body = buildBody();
    if (schedule) {
      updateMutation.mutate(body);
    } else {
      createMutation.mutate(body);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;
  const meadows = (meadowsQuery.data ?? [])
    // Archived meadows only when this schedule already uses one
    .filter(
      (meadow) => meadow.archivedAt === null || meadow.id === schedule?.meadowId,
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {schedule ? t("herds.editSchedule") : t("herds.addSchedule")}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="scheduleType">
                    {t("herds.scheduleType")} *
                  </FieldLabel>
                  <Select
                    value={scheduleType}
                    onValueChange={(value) => {
                      if (value === "pasture" || value === "exercise_yard") {
                        setScheduleType(value);
                      }
                    }}
                  >
                    <SelectTrigger id="scheduleType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pasture">
                        {t("herds.scheduleTypes.pasture")}
                      </SelectItem>
                      <SelectItem value="exercise_yard">
                        {t("herds.scheduleTypes.exercise_yard")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="scheduleMeadow">
                    {t("herds.meadow")}
                  </FieldLabel>
                  <div className="flex gap-2">
                    <Select
                      value={meadowId ?? NO_MEADOW}
                      onValueChange={(value) =>
                        setMeadowId(value === NO_MEADOW ? null : value)
                      }
                    >
                      <SelectTrigger id="scheduleMeadow" className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_MEADOW}>
                          {t("herds.noMeadow")}
                        </SelectItem>
                        {meadows.map((meadow) => (
                          <SelectItem key={meadow.id} value={meadow.id}>
                            {meadow.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {/* Goes to the map to create a meadow; the input is kept and
                        the new meadow is selected when coming back */}
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label={t("meadows.newMeadow")}
                      title={t("meadows.newMeadow")}
                      onClick={() =>
                        onCreateMeadow({
                          scheduleType,
                          meadowId,
                          repeat,
                          weekdays,
                          startDate,
                          endDate,
                          untilDate,
                          notes,
                        })
                      }
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </Field>
              </FieldGroup>
            </div>

            {/* Repeat — decides which date fields follow */}
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="scheduleRepeat">
                  {t("herds.recurrence")}
                </FieldLabel>
                <Select
                  value={repeat}
                  onValueChange={(value) => {
                    if (
                      value === "none" ||
                      value === "weekly" ||
                      value === "monthly" ||
                      value === "yearly"
                    ) {
                      setRepeat(value);
                    }
                  }}
                >
                  <SelectTrigger id="scheduleRepeat">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("herds.repeatNone")}</SelectItem>
                    <SelectItem value="weekly">
                      {t("herds.frequencies.weekly")}
                    </SelectItem>
                    {initialRecurrence?.frequency === "monthly" && (
                      <SelectItem value="monthly">
                        {t("herds.frequencies.monthly")}
                      </SelectItem>
                    )}
                    <SelectItem value="yearly">
                      {t("herds.frequencies.yearly")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>

            {/* Weekly: the herd is out on the selected weekdays of every week */}
            {repeat === "weekly" && (
              <div className="space-y-2">
                <Label>{t("herds.weekdays")}</Label>
                <div className="flex gap-1.5">
                  {ALL_WEEKDAYS.map((weekday, index) => {
                    const isSelected = weekdays.includes(weekday);
                    const day = new Date(2024, 0, 1 + index);
                    return (
                      <button
                        key={weekday}
                        type="button"
                        aria-pressed={isSelected}
                        aria-label={weekdayLongFormatter.format(day)}
                        onClick={() =>
                          setWeekdays((previous) =>
                            isSelected
                              ? previous.filter((d) => d !== weekday)
                              : [...previous, weekday],
                          )
                        }
                        className={`h-9 w-9 rounded-md border text-sm font-semibold transition-colors ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {weekdayFormatter.format(day)}
                      </button>
                    );
                  })}
                </div>
                {weekdaysMissing && (
                  <p className="text-sm text-destructive">
                    {t("herds.weekdaysRequired")}
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="scheduleStartDate">
                    {t("herds.startDate")} *
                  </FieldLabel>
                  <Input
                    id="scheduleStartDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </Field>
              </FieldGroup>
              {/* End: the stay itself (none) or the yearly season; weekly stays are single days */}
              {repeat !== "weekly" && (
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="scheduleEndDate">
                      {t("herds.endDate")}
                      {repeat === "none" ? "" : " *"}
                    </FieldLabel>
                    <Input
                      id="scheduleEndDate"
                      type="date"
                      min={startDate || undefined}
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required={repeat !== "none"}
                    />
                    {endBeforeStart && (
                      <p className="text-sm text-destructive">
                        {t("herds.endBeforeStart")}
                      </p>
                    )}
                  </Field>
                </FieldGroup>
              )}
              {/* Until: when the repetition stops */}
              {repeat !== "none" && (
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="scheduleUntil">
                      {t("herds.untilOptional")}
                    </FieldLabel>
                    <Input
                      id="scheduleUntil"
                      type="date"
                      min={startDate || undefined}
                      value={untilDate}
                      onChange={(e) => setUntilDate(e.target.value)}
                    />
                    {untilBeforeStart && (
                      <p className="text-sm text-destructive">
                        {t("herds.endBeforeStart")}
                      </p>
                    )}
                  </Field>
                </FieldGroup>
              )}
            </div>

            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="scheduleNotes">{t("herds.notes")}</FieldLabel>
                <Input
                  id="scheduleNotes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </Field>
            </FieldGroup>
          </div>
          {(createMutation.isError || updateMutation.isError) && (
            <p className="text-sm text-destructive">{t("common.error")}</p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={!isValid || isPending}>
              {isPending ? t("common.loading") : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteScheduleDialog({
  schedule,
  onOpenChange,
}: {
  schedule: OutdoorSchedule | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (outdoorScheduleId: string) => {
      const response = await apiClient.DELETE(
        "/v1/animals/herds/outdoorSchedules/byId/{outdoorScheduleId}",
        { params: { path: { outdoorScheduleId } } },
      );
      if (response.error) throw new Error("Failed to delete schedule");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["herds"] });
      queryClient.invalidateQueries({ queryKey: ["outdoorJournal"] });
      queryClient.invalidateQueries({ queryKey: ["meadows"] });
      onOpenChange(false);
    },
  });

  return (
    <AlertDialog
      open={!!schedule}
      onOpenChange={(open) => {
        // Stays mounted between schedules; don't carry an old error over
        if (!open) deleteMutation.reset();
        onOpenChange(open);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("common.confirm")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("herds.deleteScheduleConfirm")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {deleteMutation.isError && (
          <p className="text-sm text-destructive">{t("common.error")}</p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              // Stay open until deleted, so a failure can be shown
              event.preventDefault();
              if (schedule) deleteMutation.mutate(schedule.id);
            }}
            disabled={deleteMutation.isPending}
            className="bg-destructive hover:bg-destructive/90"
          >
            {deleteMutation.isPending ? t("common.loading") : t("common.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
