import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { herdsQueryOptions } from "@/api/herds.queries";
import { animalsQueryOptions } from "@/api/animals.queries";
import { apiClient } from "@/api/client";
import type { Herd } from "@/api/types";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Trash2, Plus } from "lucide-react";

type OutdoorScheduleType = "pasture" | "exercise_yard";

export const Route = createFileRoute("/_authed/animals/herds")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(herdsQueryOptions());
    queryClient.ensureQueryData(animalsQueryOptions());
  },
  component: HerdsPage,
});

function HerdsPage() {
  const { t } = useTranslation();
  const herdsQuery = useQuery(herdsQueryOptions());
  const herds = herdsQuery.data?.result ?? [];

  const [createOpen, setCreateOpen] = useState(false);
  const [editHerd, setEditHerd] = useState<Herd | null>(null);
  const [deleteHerd, setDeleteHerd] = useState<Herd | null>(null);

  return (
    <PageContent title={t("herds.title")} showBackButton={false}>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t("herds.addHerd")}
        </Button>
      </div>

      {herds.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground border border-dashed rounded-md">
          {t("herds.noHerds")}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("herds.name")}</TableHead>
                <TableHead>{t("herds.animalCount")}</TableHead>
                <TableHead className="w-32"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {herds.map((herd) => (
                <TableRow key={herd.id}>
                  <TableCell className="font-medium">
                    <Link
                      to="/animals/herds/$herdId"
                      params={{ herdId: herd.id }}
                      className="hover:underline text-blue-600 hover:text-blue-800"
                    >
                      {herd.name}
                    </Link>
                  </TableCell>
                  <TableCell>{herd.animals.length}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditHerd(herd)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteHerd(herd)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <HerdFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        herd={null}
      />

      {editHerd && (
        <HerdFormDialog
          open={true}
          onOpenChange={(open) => !open && setEditHerd(null)}
          herd={editHerd}
        />
      )}

      <DeleteHerdDialog
        herd={deleteHerd}
        onOpenChange={(open) => !open && setDeleteHerd(null)}
      />
    </PageContent>
  );
}

interface ScheduleEntry {
  type: OutdoorScheduleType;
  startDate: string;
  endDate: string;
  notes: string;
  hasRecurrence: boolean;
  recurrenceFrequency: "weekly" | "monthly" | "yearly";
  recurrenceInterval: string;
  recurrenceUntil: string;
}

function emptySchedule(): ScheduleEntry {
  return {
    type: "pasture",
    startDate: "",
    endDate: "",
    notes: "",
    hasRecurrence: false,
    recurrenceFrequency: "yearly",
    recurrenceInterval: "1",
    recurrenceUntil: "",
  };
}

function scheduleToApiBody(s: ScheduleEntry) {
  return {
    type: s.type,
    startDate: new Date(s.startDate).toISOString(),
    endDate: s.endDate ? new Date(s.endDate).toISOString() : null,
    notes: s.notes || null,
    recurrence: s.hasRecurrence
      ? {
          frequency: s.recurrenceFrequency,
          interval: Number(s.recurrenceInterval),
          until: s.recurrenceUntil ? new Date(s.recurrenceUntil).toISOString() : null,
        }
      : null,
  };
}

function HerdFormDialog({
  open,
  onOpenChange,
  herd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  herd: Herd | null;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const animalsQuery = useQuery(animalsQueryOptions());
  const allAnimals = animalsQuery.data?.result ?? [];

  const [name, setName] = useState(herd?.name ?? "");
  const [selectedAnimalIds, setSelectedAnimalIds] = useState<string[]>(
    () => herd?.animals.map((a) => a.id) ?? [],
  );
  const [schedules, setSchedules] = useState<ScheduleEntry[]>(() =>
    herd?.outdoorSchedules?.map((s) => ({
      type: s.type as OutdoorScheduleType,
      startDate: s.startDate ? s.startDate.split("T")[0] : "",
      endDate: s.endDate ? s.endDate.split("T")[0] : "",
      notes: s.notes ?? "",
      hasRecurrence: !!s.recurrence,
      recurrenceFrequency: (s.recurrence?.frequency ?? "yearly") as "weekly" | "monthly" | "yearly",
      recurrenceInterval: s.recurrence ? String(s.recurrence.interval) : "1",
      recurrenceUntil: s.recurrence?.until ? s.recurrence.until.split("T")[0] : "",
    })) ?? [],
  );
  const [serverError, setServerError] = useState<string | null>(null);

  function updateSchedule(index: number, patch: Partial<ScheduleEntry>) {
    setSchedules((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; animalIds: string[]; outdoorSchedules: ReturnType<typeof scheduleToApiBody>[] }) => {
      const response = await apiClient.POST("/v1/animals/herds", { body: data });
      if (response.error) throw response.error;
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["herds"] });
      onOpenChange(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { name: string; animalIds: string[]; outdoorSchedules: ReturnType<typeof scheduleToApiBody>[] }) => {
      if (!herd) return;
      const response = await apiClient.PATCH("/v1/animals/herds/byId/{herdId}", {
        params: { path: { herdId: herd.id } },
        body: data,
      });
      if (response.error) throw response.error;
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["herds"] });
      onOpenChange(false);
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);
    const data = {
      name,
      animalIds: selectedAnimalIds,
      outdoorSchedules: schedules.filter((s) => s.startDate).map(scheduleToApiBody),
    };
    const mutation = herd ? updateMutation : createMutation;
    mutation.mutate(data, {
      onError: (err) => {
        const message = err instanceof Error ? err.message : String(err);
        setServerError(message);
      },
    });
  }

  function toggleAnimal(animalId: string) {
    setSelectedAnimalIds((prev) =>
      prev.includes(animalId) ? prev.filter((id) => id !== animalId) : [...prev, animalId],
    );
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <DialogHeader>
            <DialogTitle>
              {herd ? t("herds.editHerd") : t("herds.addHerd")}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 px-1 space-y-6 overflow-y-auto flex-1">
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
                <div className="border rounded-md p-3 space-y-2 max-h-36 overflow-y-auto">
                  {allAnimals.map((animal) => (
                    <div key={animal.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`herd-animal-${animal.id}`}
                        checked={selectedAnimalIds.includes(animal.id)}
                        onCheckedChange={() => toggleAnimal(animal.id)}
                      />
                      <Label htmlFor={`herd-animal-${animal.id}`} className="font-normal cursor-pointer">
                        {animal.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </Field>
            </FieldGroup>

            {/* Schedules */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t("herds.outdoorSchedules")}</span>
                <Button type="button" size="sm" variant="outline" onClick={() => setSchedules((p) => [...p, emptySchedule()])}>
                  <Plus className="h-3 w-3 mr-1" />
                  {t("herds.addSchedule")}
                </Button>
              </div>
              {schedules.map((schedule, idx) => (
                <div key={idx} className="border rounded-md p-3 space-y-3 relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setSchedules((p) => p.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                  <div className="pr-8 space-y-3">
                    <FieldGroup>
                      <Field>
                        <FieldLabel>{t("herds.scheduleType")} *</FieldLabel>
                        <Select value={schedule.type} onValueChange={(v) => updateSchedule(idx, { type: v as OutdoorScheduleType })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pasture">{t("herds.scheduleTypes.pasture")}</SelectItem>
                            <SelectItem value="exercise_yard">{t("herds.scheduleTypes.exercise_yard")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                    </FieldGroup>
                    <div className="grid grid-cols-2 gap-3">
                      <FieldGroup>
                        <Field>
                          <FieldLabel>{t("herds.startDate")} *</FieldLabel>
                          <Input type="date" value={schedule.startDate} onChange={(e) => updateSchedule(idx, { startDate: e.target.value })} required />
                        </Field>
                      </FieldGroup>
                      <FieldGroup>
                        <Field>
                          <FieldLabel>{t("herds.endDate")}</FieldLabel>
                          <Input type="date" value={schedule.endDate} onChange={(e) => updateSchedule(idx, { endDate: e.target.value })} />
                        </Field>
                      </FieldGroup>
                    </div>
                  </div>
                  <FieldGroup>
                    <Field>
                      <FieldLabel>{t("herds.notes")}</FieldLabel>
                      <textarea
                        rows={2}
                        value={schedule.notes}
                        onChange={(e) => updateSchedule(idx, { notes: e.target.value })}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                      />
                    </Field>
                  </FieldGroup>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`recurrence-${idx}`}
                      checked={schedule.hasRecurrence}
                      onCheckedChange={(checked) => updateSchedule(idx, { hasRecurrence: checked === true })}
                    />
                    <Label htmlFor={`recurrence-${idx}`}>{t("herds.recurring")}</Label>
                  </div>
                  {schedule.hasRecurrence && (
                    <div className="grid grid-cols-[1fr_80px_1fr] gap-3 pl-6">
                      <FieldGroup>
                        <Field>
                          <FieldLabel>{t("herds.frequency")}</FieldLabel>
                          <Select value={schedule.recurrenceFrequency} onValueChange={(v) => updateSchedule(idx, { recurrenceFrequency: v as "weekly" | "monthly" | "yearly" })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
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
                          <FieldLabel>{t("herds.interval")}</FieldLabel>
                          <Input type="number" min="1" value={schedule.recurrenceInterval} onChange={(e) => updateSchedule(idx, { recurrenceInterval: e.target.value })} />
                        </Field>
                      </FieldGroup>
                      <FieldGroup>
                        <Field>
                          <FieldLabel>{t("herds.until")}</FieldLabel>
                          <Input type="date" value={schedule.recurrenceUntil} onChange={(e) => updateSchedule(idx, { recurrenceUntil: e.target.value })} />
                        </Field>
                      </FieldGroup>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {serverError && (
              <p className="text-sm text-destructive">{serverError}</p>
            )}
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={!name || isPending}>
              {isPending ? t("common.loading") : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteHerdDialog({
  herd,
  onOpenChange,
}: {
  herd: Herd | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (herdId: string) => {
      const response = await apiClient.DELETE(
        "/v1/animals/herds/byId/{herdId}",
        { params: { path: { herdId } } },
      );
      if (response.error) throw new Error("Failed to delete herd");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["herds"] });
      onOpenChange(false);
    },
  });

  return (
    <AlertDialog open={!!herd} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("common.confirm")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("herds.deleteConfirm")}
            {herd && (
              <span className="font-medium block mt-2">{herd.name}</span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => herd && deleteMutation.mutate(herd.id)}
            disabled={deleteMutation.isPending}
            className="bg-destructive hover:bg-destructive/90"
          >
            {deleteMutation.isPending
              ? t("common.loading")
              : t("common.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
