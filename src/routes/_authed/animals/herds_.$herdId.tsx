import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { useFeatureAccess } from "@/lib/useFeatureAccess";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { herdQueryOptions } from "@/api/herds.queries";
import { animalsQueryOptions } from "@/api/animals.queries";
import { formatDateOnly, toLocalDateString } from "@/lib/utils";
import type { OutdoorSchedule } from "@/api/types";
import { apiClient } from "@/api/client";
import { PageContent } from "@/components/PageContent";
import {
  DeleteScheduleDialog,
  ScheduleFormDialog,
  storeScheduleDraft,
  takeScheduleDraft,
  type ScheduleFormValues,
} from "@/components/OutdoorScheduleDialogs";
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
import { Pencil, Trash2 } from "lucide-react";

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
      search: { createMeadow: true, returnToHerdId: herdId },
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

  function formatDate(dateString: string | null) {
    return dateString ? formatDateOnly(dateString, i18n.language) : "-";
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
