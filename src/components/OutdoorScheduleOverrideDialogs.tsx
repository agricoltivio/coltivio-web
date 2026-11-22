import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { meadowsQueryOptions } from "@/api/meadows.queries";
import type {
  OutdoorSchedule,
  OutdoorScheduleOverride,
  OutdoorScheduleOverrideInput,
} from "@/api/types";
import { apiClient } from "@/api/client";
import { ApiError } from "@/api/apiError";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

// Exceptions (overrides) of the herd page: date ranges in which the herd did something else
// than its schedules say, e.g. two days in the stable. They take precedence over the schedules.

type OutdoorScheduleType = OutdoorSchedule["type"];
const NO_MEADOW = "__none__";

function invalidateOutdoorQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["herds"] });
  queryClient.invalidateQueries({ queryKey: ["outdoorJournal"] });
  queryClient.invalidateQueries({ queryKey: ["meadows"] });
}

export function OverrideFormDialog({
  onOpenChange,
  herdId,
  override,
}: {
  onOpenChange: (open: boolean) => void;
  herdId: string;
  override: OutdoorScheduleOverride | null;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  // Archived included so an existing override on an archived meadow keeps it selectable
  const meadowsQuery = useQuery(meadowsQueryOptions(true));

  const today = new Date().toLocaleDateString("sv-SE");
  const [overrideType, setOverrideType] = useState<OutdoorScheduleType>(
    override?.type ?? "stable",
  );
  const [meadowId, setMeadowId] = useState<string | null>(
    override?.meadowId ?? null,
  );
  // Date inputs work with "YYYY-MM-DD", which is also what the API gets
  const [startDate, setStartDate] = useState(
    override?.startDate.slice(0, 10) ?? today,
  );
  const [endDate, setEndDate] = useState(override?.endDate.slice(0, 10) ?? today);
  const [notes, setNotes] = useState(override?.notes ?? "");

  // Same-format strings compare by date
  const endBeforeStart = endDate !== "" && startDate !== "" && endDate < startDate;
  const isValid = startDate !== "" && endDate !== "" && !endBeforeStart;

  function buildBody(): OutdoorScheduleOverrideInput {
    return {
      type: overrideType,
      // Stable time is inside, it has no meadow
      meadowId: overrideType === "stable" ? null : meadowId,
      startDate,
      endDate,
      notes: notes.trim() || null,
    };
  }

  const saveMutation = useMutation({
    mutationFn: async (body: OutdoorScheduleOverrideInput) => {
      const response = override
        ? await apiClient.PATCH(
            "/v1/animals/herds/outdoorScheduleOverrides/byId/{outdoorScheduleOverrideId}",
            {
              params: { path: { outdoorScheduleOverrideId: override.id } },
              body,
            },
          )
        : await apiClient.POST(
            "/v1/animals/herds/byId/{herdId}/outdoorScheduleOverrides",
            { params: { path: { herdId } }, body },
          );
      if (response.error) {
        throw new ApiError("Failed to save override", response.error.code);
      }
    },
    onSuccess: () => {
      invalidateOutdoorQueries(queryClient);
      onOpenChange(false);
    },
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!isValid) return;
    saveMutation.mutate(buildBody());
  }

  const errorMessage =
    saveMutation.error instanceof ApiError &&
    saveMutation.error.code === "outdoor_schedule_override_overlap"
      ? t("herds.overrides.overlap")
      : t("common.error");

  const meadows = (meadowsQuery.data ?? [])
    // Archived meadows only when this override already uses one
    .filter(
      (meadow) => meadow.archivedAt === null || meadow.id === override?.meadowId,
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Dialog open={true} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {override ? t("herds.overrides.edit") : t("herds.overrides.add")}
            </DialogTitle>
            <DialogDescription>{t("herds.overrides.hint")}</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="overrideType">
                    {t("herds.scheduleType")} *
                  </FieldLabel>
                  <Select
                    value={overrideType}
                    onValueChange={(value) => {
                      if (
                        value === "pasture" ||
                        value === "exercise_yard" ||
                        value === "stable"
                      ) {
                        setOverrideType(value);
                      }
                    }}
                  >
                    <SelectTrigger id="overrideType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stable">
                        {t("herds.scheduleTypes.stable")}
                      </SelectItem>
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
              {overrideType !== "stable" && (
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="overrideMeadow">
                      {t("herds.meadow")}
                    </FieldLabel>
                    <Select
                      value={meadowId ?? NO_MEADOW}
                      onValueChange={(value) =>
                        setMeadowId(value === NO_MEADOW ? null : value)
                      }
                    >
                      <SelectTrigger id="overrideMeadow">
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
                  </Field>
                </FieldGroup>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="overrideStartDate">
                    {t("herds.startDate")} *
                  </FieldLabel>
                  <Input
                    id="overrideStartDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </Field>
              </FieldGroup>
              {/* Inclusive: the same day as the start for a single day */}
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="overrideEndDate">
                    {t("herds.endDate")} *
                  </FieldLabel>
                  <Input
                    id="overrideEndDate"
                    type="date"
                    min={startDate || undefined}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                  {endBeforeStart && (
                    <p className="text-sm text-destructive">
                      {t("herds.endBeforeStart")}
                    </p>
                  )}
                </Field>
              </FieldGroup>
            </div>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="overrideNotes">{t("herds.notes")}</FieldLabel>
                <Input
                  id="overrideNotes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </Field>
            </FieldGroup>
          </div>
          {saveMutation.isError && (
            <p className="text-sm text-destructive">{errorMessage}</p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={!isValid || saveMutation.isPending}>
              {saveMutation.isPending ? t("common.loading") : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteOverrideDialog({
  override,
  onOpenChange,
}: {
  override: OutdoorScheduleOverride | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (outdoorScheduleOverrideId: string) => {
      const response = await apiClient.DELETE(
        "/v1/animals/herds/outdoorScheduleOverrides/byId/{outdoorScheduleOverrideId}",
        { params: { path: { outdoorScheduleOverrideId } } },
      );
      if (response.error) throw new Error("Failed to delete override");
    },
    onSuccess: () => {
      invalidateOutdoorQueries(queryClient);
      onOpenChange(false);
    },
  });

  return (
    <AlertDialog
      open={!!override}
      onOpenChange={(open) => {
        // Stays mounted between overrides; don't carry an old error over
        if (!open) deleteMutation.reset();
        onOpenChange(open);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("common.confirm")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("herds.overrides.deleteConfirm")}
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
              if (override) deleteMutation.mutate(override.id);
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
