import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { herdQueryOptions } from "@/api/herds.queries";
import { apiClient } from "@/api/client";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Pencil, Trash2, Plus } from "lucide-react";

type OutdoorScheduleType = "pasture" | "exercise_yard";

interface OutdoorSchedule {
  id: string;
  herdId: string;
  farmId: string;
  startDate: string;
  endDate: string | null;
  type: OutdoorScheduleType;
  notes: string | null;
  recurrence: {
    id: string;
    frequency: "weekly" | "monthly" | "yearly";
    interval: number;
    byWeekday: string[] | null;
    byMonthDay: number | null;
    until: string | null;
    count: number | null;
  } | null;
}

export const Route = createFileRoute("/_authed/animals/herds_/$herdId")({
  loader: ({ params, context: { queryClient } }) => {
    queryClient.ensureQueryData(herdQueryOptions(params.herdId));
  },
  component: HerdDetailPage,
});

function HerdDetailPage() {
  const { t } = useTranslation();
  const { herdId } = Route.useParams();
  const herdQuery = useQuery(herdQueryOptions(herdId));
  const herd = herdQuery.data;

  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [editSchedule, setEditSchedule] = useState<OutdoorSchedule | null>(null);
  const [deleteSchedule, setDeleteSchedule] = useState<OutdoorSchedule | null>(null);

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
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString();
  }

  return (
    <PageContent title={herd.name} showBackButton>
      <div className="space-y-6">
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
              <div className="flex flex-wrap gap-2">
                {herd.animals.map((animal) => (
                  <span
                    key={animal.id}
                    className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-sm"
                  >
                    {animal.name}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Outdoor schedules card */}
        <Card>
          <CardHeader>
            <CardTitle>{t("herds.outdoorSchedules")}</CardTitle>
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => {
                  setEditSchedule(null);
                  setScheduleDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                {t("herds.addSchedule")}
              </Button>
            </div>
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
                      <TableCell>{formatDate(schedule.startDate)}</TableCell>
                      <TableCell>{formatDate(schedule.endDate)}</TableCell>
                      <TableCell>
                        {schedule.recurrence
                          ? `${schedule.recurrence.frequency} (×${schedule.recurrence.interval})`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {schedule.notes || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditSchedule(schedule as OutdoorSchedule);
                              setScheduleDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteSchedule(schedule as OutdoorSchedule)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
            }
          }}
          herdId={herdId}
          schedule={editSchedule}
        />
      )}

      <DeleteScheduleDialog
        schedule={deleteSchedule}
        onOpenChange={(open) => !open && setDeleteSchedule(null)}
      />
    </PageContent>
  );
}

function ScheduleFormDialog({
  open,
  onOpenChange,
  herdId,
  schedule,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  herdId: string;
  schedule: OutdoorSchedule | null;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  type ScheduleBody = {
    type: OutdoorScheduleType;
    startDate: string;
    endDate?: string | null;
    notes?: string | null;
    recurrence?: {
      frequency: "weekly" | "monthly" | "yearly";
      interval: number;
      until?: string | null;
    } | null;
  };

  const [scheduleType, setScheduleType] = useState<OutdoorScheduleType>(schedule?.type ?? "pasture");
  const [startDate, setStartDate] = useState(schedule?.startDate ? schedule.startDate.split("T")[0] : "");
  const [endDate, setEndDate] = useState(schedule?.endDate ? schedule.endDate.split("T")[0] : "");
  const [notes, setNotes] = useState(schedule?.notes ?? "");
  const [hasRecurrence, setHasRecurrence] = useState(!!schedule?.recurrence);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<"weekly" | "monthly" | "yearly">(schedule?.recurrence?.frequency ?? "weekly");
  const [recurrenceInterval, setRecurrenceInterval] = useState(schedule?.recurrence ? String(schedule.recurrence.interval) : "1");
  const [recurrenceUntil, setRecurrenceUntil] = useState(schedule?.recurrence?.until ? schedule.recurrence.until.split("T")[0] : "");

  const createMutation = useMutation({
    mutationFn: async (body: ScheduleBody) => {
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
      onOpenChange(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (body: ScheduleBody) => {
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
      onOpenChange(false);
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body: ScheduleBody = {
      type: scheduleType,
      startDate: new Date(startDate).toISOString(),
      endDate: endDate ? new Date(endDate).toISOString() : null,
      notes: notes || null,
      recurrence: hasRecurrence
        ? {
            frequency: recurrenceFrequency,
            interval: Number(recurrenceInterval),
            until: recurrenceUntil ? new Date(recurrenceUntil).toISOString() : null,
          }
        : null,
    };
    if (schedule) {
      updateMutation.mutate(body);
    } else {
      createMutation.mutate(body);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

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
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="scheduleType">{t("herds.scheduleType")} *</FieldLabel>
                <Select
                  value={scheduleType}
                  onValueChange={(val) => setScheduleType(val as OutdoorScheduleType)}
                >
                  <SelectTrigger id="scheduleType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pasture">{t("herds.scheduleTypes.pasture")}</SelectItem>
                    <SelectItem value="exercise_yard">{t("herds.scheduleTypes.exercise_yard")}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>
            <div className="grid grid-cols-2 gap-4">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="scheduleStartDate">{t("herds.startDate")} *</FieldLabel>
                  <Input
                    id="scheduleStartDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </Field>
              </FieldGroup>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="scheduleEndDate">{t("herds.endDate")}</FieldLabel>
                  <Input
                    id="scheduleEndDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </Field>
              </FieldGroup>
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
            <div className="flex items-center gap-2">
              <Checkbox
                id="hasRecurrence"
                checked={hasRecurrence}
                onCheckedChange={(checked) => setHasRecurrence(checked === true)}
              />
              <Label htmlFor="hasRecurrence">{t("herds.recurring")}</Label>
            </div>
            {hasRecurrence && (
              <div className="grid grid-cols-3 gap-3 pl-6">
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="recurrenceFrequency">{t("herds.frequency")}</FieldLabel>
                    <Select
                      value={recurrenceFrequency}
                      onValueChange={(val) =>
                        setRecurrenceFrequency(val as "weekly" | "monthly" | "yearly")
                      }
                    >
                      <SelectTrigger id="recurrenceFrequency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">{t("herds.frequencies.weekly")}</SelectItem>
                        <SelectItem value="monthly">{t("herds.frequencies.monthly")}</SelectItem>
                        <SelectItem value="yearly">{t("herds.frequencies.yearly")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </FieldGroup>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="recurrenceInterval">{t("herds.interval")}</FieldLabel>
                    <Input
                      id="recurrenceInterval"
                      type="number"
                      min="1"
                      value={recurrenceInterval}
                      onChange={(e) => setRecurrenceInterval(e.target.value)}
                    />
                  </Field>
                </FieldGroup>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="recurrenceUntil">{t("herds.until")}</FieldLabel>
                    <Input
                      id="recurrenceUntil"
                      type="date"
                      value={recurrenceUntil}
                      onChange={(e) => setRecurrenceUntil(e.target.value)}
                    />
                  </Field>
                </FieldGroup>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={!startDate || isPending}>
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
      onOpenChange(false);
    },
  });

  return (
    <AlertDialog open={!!schedule} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("common.confirm")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("herds.deleteScheduleConfirm")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => schedule && deleteMutation.mutate(schedule.id)}
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
