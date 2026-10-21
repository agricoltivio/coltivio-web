import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { useFeatureAccess } from "@/lib/useFeatureAccess";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { herdQueryOptions } from "@/api/herds.queries";
import { meadowsQueryOptions } from "@/api/meadows.queries";
import { animalsQueryOptions } from "@/api/animals.queries";
import { toLocalDateString } from "@/lib/utils";
import type { OutdoorSchedule, OutdoorScheduleInput } from "@/api/types";
import { apiClient } from "@/api/client";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Plus, Trash2 } from "lucide-react";

type OutdoorScheduleType = OutdoorSchedule["type"];

export const Route = createFileRoute("/_authed/animals/herds_/$herdId")({
  validateSearch: z.object({
    returnTo: z.string().optional(),
    // Back from creating a meadow on the map: reopen the schedule dialog
    resumeSchedule: z.coerce.boolean().optional(),
    createdMeadowId: z.string().optional(),
  }),
  loader: ({ params, context: { queryClient } }) => {
    queryClient.ensureQueryData(herdQueryOptions(params.herdId));
  },
  component: HerdDetailPage,
});

function HerdDetailPage() {
  const { t, i18n } = useTranslation();
  const { canWrite: canWriteAnimals } = useFeatureAccess("animals");
  const { herdId } = Route.useParams();
  const { returnTo } = Route.useSearch();
  const navigate = useNavigate();
  const herdQuery = useQuery(herdQueryOptions(herdId));
  const herd = herdQuery.data;

  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [editSchedule, setEditSchedule] = useState<OutdoorSchedule | null>(null);
  const [deleteSchedule, setDeleteSchedule] = useState<OutdoorSchedule | null>(null);
  const [editHerdOpen, setEditHerdOpen] = useState(false);
  const [restoredScheduleValues, setRestoredScheduleValues] =
    useState<ScheduleFormValues | null>(null);
  const { resumeSchedule, createdMeadowId } = Route.useSearch();

  // Back from the map: reopen the schedule dialog with the kept input and the
  // new meadow selected, then clean up the URL
  useEffect(() => {
    if (!resumeSchedule || !herd) return;
    const draft = takeScheduleDraft(herdId);
    if (draft) {
      setEditSchedule(
        herd.outdoorSchedules.find((s) => s.id === draft.scheduleId) ?? null,
      );
      setRestoredScheduleValues({
        ...draft.values,
        meadowId: createdMeadowId ?? draft.values.meadowId,
      });
      setScheduleDialogOpen(true);
    }
    void navigate({
      to: "/animals/herds/$herdId",
      params: { herdId },
      search: draft?.herdReturnTo ? { returnTo: draft.herdReturnTo } : {},
      replace: true,
    });
  }, [resumeSchedule, herd]); // eslint-disable-line react-hooks/exhaustive-deps

  function goCreateMeadow(values: ScheduleFormValues) {
    storeScheduleDraft({
      herdId,
      scheduleId: editSchedule?.id ?? null,
      herdReturnTo: returnTo ?? null,
      values,
    });
    void navigate({
      to: "/field-calendar/plots",
      search: { createMeadow: true, returnTo: `/animals/herds/${herdId}` },
    });
  }

  if (herdQuery.isLoading) {
    return (
      <PageContent title={t("common.loading")}>
        <div className="py-8 text-center text-muted-foreground">{t("common.loading")}</div>
      </PageContent>
    );
  }

  if (!herd) {
    return (
      <PageContent title={t("common.error")}>
        <div className="py-8 text-center text-destructive">{t("common.error")}</div>
      </PageContent>
    );
  }

  // Date part only, so the calendar day doesn't shift with the timezone
  function formatDate(dateString: string | null) {
    if (!dateString) return "-";
    const [year, month, day] = dateString.slice(0, 10).split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString(i18n.language);
  }

  function isWeekdayStay(schedule: OutdoorSchedule) {
    return (
      schedule.recurrence?.frequency === "weekly" &&
      (schedule.recurrence.byWeekday?.length ?? 0) > 0
    );
  }

  // e.g. "Wöchentlich: Mo, Di, Mi" or "Jährlich"
  function formatRecurrence(schedule: OutdoorSchedule) {
    if (!schedule.recurrence) return "-";
    const frequency = t(`herds.frequencies.${schedule.recurrence.frequency}`);
    const weekdays = schedule.recurrence.byWeekday ?? [];
    if (!isWeekdayStay(schedule) || weekdays.length === 7) return frequency;
    const order = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
    // 2024-01-01 is a Monday
    const formatter = new Intl.DateTimeFormat(i18n.language, {
      weekday: "short",
    });
    const names = weekdays
      .map((weekday) => order.indexOf(weekday))
      .sort((a, b) => a - b)
      .map((index) => formatter.format(new Date(2024, 0, 1 + index)));
    return `${frequency}: ${names.join(", ")}`;
  }

  return (
    <PageContent
      title={herd.name}
      showBackButton
      backTo={() => navigate({ to: returnTo ?? "/animals/herds" })}
      actions={
        canWriteAnimals && (
          <Button variant="outline" onClick={() => setEditHerdOpen(true)}>
            <Pencil className="h-4 w-4" />
            {t("common.edit")}
          </Button>
        )
      }
    >
      <div className="space-y-6">
        {/* Outdoor schedules card */}
        <Card>
          <CardHeader>
            <CardTitle>{t("herds.outdoorSchedules")}</CardTitle>
            {canWriteAnimals && (
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={() => {
                    setEditSchedule(null);
                    setScheduleDialogOpen(true);
                  }}
                >
                  {t("herds.addSchedule")}
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {herd.outdoorSchedules.length === 0 ? (
              <div className="py-4 text-center text-muted-foreground">
                {t("herds.noSchedules")}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("herds.scheduleType")}</TableHead>
                    <TableHead>{t("herds.meadow")}</TableHead>
                    <TableHead>{t("herds.startDate")}</TableHead>
                    <TableHead>{t("herds.endDate")}</TableHead>
                    <TableHead>{t("herds.recurrence")}</TableHead>
                    <TableHead>{t("herds.notes")}</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {herd.outdoorSchedules.map((schedule) => (
                    <TableRow key={schedule.id}>
                      <TableCell>
                        {t(`herds.scheduleTypes.${schedule.type}`)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {schedule.meadow?.name ?? "-"}
                      </TableCell>
                      <TableCell>{formatDate(schedule.startDate)}</TableCell>
                      <TableCell>
                        {/* Weekday stays are single days; show when the repetition ends */}
                        {isWeekdayStay(schedule)
                          ? formatDate(schedule.recurrence?.until ?? null)
                          : formatDate(schedule.endDate)}
                      </TableCell>
                      <TableCell>{formatRecurrence(schedule)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {schedule.notes || "-"}
                      </TableCell>
                      {canWriteAnimals && (
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditSchedule(schedule);
                                setScheduleDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteSchedule(schedule)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Animals card */}
        <Card>
          <CardHeader>
            <CardTitle>{t("herds.animals")}</CardTitle>
          </CardHeader>
          <CardContent>
            {herd.animals.length === 0 ? (
              <div className="py-4 text-center text-muted-foreground">
                {t("herds.noAnimals")}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("animals.name")}</TableHead>
                    <TableHead>{t("animals.type")}</TableHead>
                    <TableHead>{t("animals.earTag")}</TableHead>
                    <TableHead>{t("animals.usage")}</TableHead>
                    <TableHead>{t("animals.dateOfBirth")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {herd.animals.map((animal) => (
                    <TableRow
                      key={animal.id}
                      className="cursor-pointer"
                      onClick={() =>
                        navigate({
                          to: "/animals/$animalId",
                          params: { animalId: animal.id },
                          search: { returnTo: `/animals/herds/${herdId}` },
                        })
                      }
                    >
                      <TableCell className="font-medium">{animal.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {t(`animals.types.${animal.type}`)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {animal.earTag?.number || "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {t(`animals.usageOptions.${animal.usage}`)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(animal.dateOfBirth)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {scheduleDialogOpen && (
        <ScheduleFormDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) {
              setScheduleDialogOpen(false);
              setEditSchedule(null);
              setRestoredScheduleValues(null);
            }
          }}
          herdId={herdId}
          schedule={editSchedule}
          restoredValues={restoredScheduleValues}
          onCreateMeadow={goCreateMeadow}
        />
      )}

      {editHerdOpen && (
        <EditHerdDialog
          herdId={herdId}
          initialName={herd.name}
          initialAnimalIds={herd.animals.map((animal) => animal.id)}
          onOpenChange={setEditHerdOpen}
        />
      )}

      <DeleteScheduleDialog
        schedule={deleteSchedule}
        onOpenChange={(open) => !open && setDeleteSchedule(null)}
      />
    </PageContent>
  );
}

// Edits name and animals. Schedules are managed in their own table and are not
// sent, so the backend keeps them. When animals change, a second step asks since
// when the change applies (sent as effectiveDate).
function EditHerdDialog({
  herdId,
  initialName,
  initialAnimalIds,
  onOpenChange,
}: {
  herdId: string;
  initialName: string;
  initialAnimalIds: string[];
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const animalsQuery = useQuery(animalsQueryOptions());
  const allAnimals = animalsQuery.data?.result ?? [];

  const [name, setName] = useState(initialName);
  const [selectedAnimalIds, setSelectedAnimalIds] =
    useState<string[]>(initialAnimalIds);
  const [askingEffectiveDate, setAskingEffectiveDate] = useState(false);
  const [effectiveDate, setEffectiveDate] = useState(() =>
    toLocalDateString(new Date()),
  );
  const [serverError, setServerError] = useState<string | null>(null);

  const addedCount = selectedAnimalIds.filter(
    (id) => !initialAnimalIds.includes(id),
  ).length;
  const removedCount = initialAnimalIds.filter(
    (id) => !selectedAnimalIds.includes(id),
  ).length;
  const animalsChanged = addedCount > 0 || removedCount > 0;
  const nameChanged = name.trim() !== initialName;

  const updateMutation = useMutation({
    mutationFn: async (body: {
      name: string;
      animalIds: string[];
      effectiveDate: string | null;
    }) => {
      const response = await apiClient.PATCH(
        "/v1/animals/herds/byId/{herdId}",
        { params: { path: { herdId } }, body },
      );
      if (response.error) {
        // The backend rejects a date before an animal joined its current herd.
        // Only possible when an effective date was sent; other 400s are generic.
        throw new Error(
          response.response.status === 400 && body.effectiveDate !== null
            ? t("herds.membershipDateTooEarly")
            : t("common.error"),
        );
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["herds"] });
      queryClient.invalidateQueries({ queryKey: ["outdoorJournal"] });
      // Meadow usage includes the herd's animal count
      queryClient.invalidateQueries({ queryKey: ["meadows"] });
      onOpenChange(false);
    },
    onError: (err) => {
      setServerError(err instanceof Error ? err.message : String(err));
    },
  });

  function save(withEffectiveDate: boolean) {
    setServerError(null);
    updateMutation.mutate({
      name: name.trim(),
      animalIds: selectedAnimalIds,
      effectiveDate: withEffectiveDate ? effectiveDate : null,
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Added or removed animals: first ask since when the change applies
    if (animalsChanged && !askingEffectiveDate) {
      setAskingEffectiveDate(true);
      return;
    }
    save(animalsChanged);
  }

  function toggleAnimal(animalId: string) {
    setSelectedAnimalIds((prev) =>
      prev.includes(animalId)
        ? prev.filter((id) => id !== animalId)
        : [...prev, animalId],
    );
  }

  return (
    <Dialog open={true} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {askingEffectiveDate
                ? t("herds.changesApplyFrom")
                : t("herds.editHerd")}
            </DialogTitle>
          </DialogHeader>
          {askingEffectiveDate ? (
            <div className="py-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                {t("herds.changesSummary", {
                  added: addedCount,
                  removed: removedCount,
                })}
              </p>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="herdEffectiveDate">
                    {t("herds.changesApplyFrom")} *
                  </FieldLabel>
                  <Input
                    id="herdEffectiveDate"
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    required
                  />
                </Field>
              </FieldGroup>
              {serverError && (
                <p className="text-sm text-destructive">{serverError}</p>
              )}
            </div>
          ) : (
            <div className="py-4 space-y-6">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="herdName">{t("herds.name")} *</FieldLabel>
                  <Input
                    id="herdName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </Field>
              </FieldGroup>
              <FieldGroup>
                <Field>
                  <FieldLabel>{t("herds.animals")}</FieldLabel>
                  <div className="border rounded-md p-3 space-y-2 max-h-72 overflow-y-auto">
                    {allAnimals.map((animal) => (
                      <div key={animal.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`edit-herd-animal-${animal.id}`}
                          checked={selectedAnimalIds.includes(animal.id)}
                          onCheckedChange={() => toggleAnimal(animal.id)}
                        />
                        <Label
                          htmlFor={`edit-herd-animal-${animal.id}`}
                          className="font-normal cursor-pointer"
                        >
                          {animal.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </Field>
              </FieldGroup>
              {serverError && (
                <p className="text-sm text-destructive">{serverError}</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                askingEffectiveDate
                  ? setAskingEffectiveDate(false)
                  : onOpenChange(false)
              }
            >
              {askingEffectiveDate ? t("common.back") : t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={
                !name.trim() ||
                (!animalsChanged && !nameChanged) ||
                (askingEffectiveDate && !effectiveDate) ||
                updateMutation.isPending
              }
            >
              {updateMutation.isPending ? t("common.loading") : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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
type ScheduleFormValues = {
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

function storeScheduleDraft(draft: ScheduleDraft) {
  try {
    sessionStorage.setItem(SCHEDULE_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Without storage the dialog just opens empty again
  }
}

// Reads and removes the stored draft; only valid for the given herd
function takeScheduleDraft(herdId: string): ScheduleDraft | null {
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

function ScheduleFormDialog({
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
      const startWeekday = new Date(schedule.startDate).getDay();
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

function DeleteScheduleDialog({
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
