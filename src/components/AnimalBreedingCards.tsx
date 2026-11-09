import { useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import { LineChart as LineChartIcon } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { animalsQueryOptions } from "@/api/animals.queries";
import {
  animalHeatsQueryOptions,
  animalWeightsQueryOptions,
  gestationSettingsQueryOptions,
} from "@/api/breeding.queries";
import type { AnimalDetail, AnimalHeat, AnimalWeight } from "@/api/types";
import { useFeatureAccess } from "@/lib/useFeatureAccess";
import { formatDateOnly, parseDateOnly, toLocalDateString } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const LINE_COLOR = "#0f766e";

// Calendar-day arithmetic in local time, adding milliseconds would land on the wrong day across DST changes
function addDaysToDateOnly(isoDate: string, days: number): Date {
  const date = parseDateOnly(isoDate);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

// Weight entries change the latest weight on animals and the dose prefill in treatments
function useInvalidateBreeding() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["breeding"] });
    queryClient.invalidateQueries({ queryKey: ["animals"] });
  };
}

export function AnimalWeightCard({ animal }: { animal: AnimalDetail }) {
  const { t, i18n } = useTranslation();
  const { canWrite: canWriteAnimals } = useFeatureAccess("animals");
  const weightsQuery = useQuery(animalWeightsQueryOptions(animal.id));
  const weights = weightsQuery.data ?? [];
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [chartDialogOpen, setChartDialogOpen] = useState(false);
  // undefined: dialog closed, null: new entry, otherwise the entry being edited
  const [editedWeight, setEditedWeight] = useState<AnimalWeight | null | undefined>(undefined);
  const latestWeight = animal.latestWeight;

  function openWeightEditor() {
    if (!latestWeight) {
      setEditedWeight(null);
      return;
    }
    setActionDialogOpen(true);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("breeding.weight")}</CardTitle>
        <CardAction>
          <div className="flex items-center gap-2">
            {weights.length >= 2 && (
              <Button
                variant="outline"
                size="icon"
                aria-label={t("breeding.weightHistory")}
                onClick={() => setChartDialogOpen(true)}
              >
                <LineChartIcon className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        <button
          type="button"
          disabled={!canWriteAnimals}
          onClick={openWeightEditor}
          className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm hover:bg-muted/50 disabled:cursor-default disabled:hover:bg-transparent"
        >
          <span>
            {latestWeight ? (
              <>
                <span className="font-medium">{latestWeight.weightKg} kg</span>
                <span className="ml-2 text-muted-foreground">
                  {formatDateOnly(latestWeight.date, i18n.language)}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">{t("breeding.noWeight")}</span>
            )}
          </span>
          {canWriteAnimals && <span className="text-muted-foreground">{t("common.edit")}</span>}
        </button>
      </CardContent>

      {/* Edit the current weight or add a new entry */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("breeding.weight")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              // The entry to edit comes from the weights list, wait for it instead of falling back to a new entry
              disabled={!weights.some((weight) => weight.id === latestWeight?.id)}
              onClick={() => {
                setActionDialogOpen(false);
                setEditedWeight(weights.find((weight) => weight.id === latestWeight?.id) ?? null);
              }}
            >
              {t("breeding.editWeight")}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setActionDialogOpen(false);
                setEditedWeight(null);
              }}
            >
              {t("breeding.addWeightEntry")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {editedWeight !== undefined && (
        <WeightEntryDialog
          animalId={animal.id}
          weight={editedWeight}
          onClose={() => setEditedWeight(undefined)}
        />
      )}

      <Dialog open={chartDialogOpen} onOpenChange={setChartDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("breeding.weightHistory")}</DialogTitle>
          </DialogHeader>
          <WeightChart weights={weights} />
          <div className="max-h-64 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common.date")}</TableHead>
                  <TableHead>{t("breeding.weightKg")}</TableHead>
                  <TableHead>{t("breeding.notes")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...weights].reverse().map((weight) => (
                  <TableRow
                    key={weight.id}
                    className={canWriteAnimals ? "cursor-pointer" : undefined}
                    onClick={() => {
                      if (!canWriteAnimals) return;
                      setChartDialogOpen(false);
                      setEditedWeight(weight);
                    }}
                  >
                    <TableCell>{formatDateOnly(weight.date, i18n.language)}</TableCell>
                    <TableCell className="font-medium">{weight.weightKg}</TableCell>
                    <TableCell className="text-muted-foreground">{weight.notes ?? ""}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function WeightChart({ weights }: { weights: AnimalWeight[] }) {
  const { i18n } = useTranslation();
  const option: EChartsOption = {
    grid: { left: 48, right: 16, top: 24, bottom: 32 },
    tooltip: { trigger: "axis" },
    // Time axis so the spacing reflects the time between weighings
    xAxis: {
      type: "time",
      axisLabel: {
        formatter: (value: number) =>
          new Date(value).toLocaleDateString(i18n.language, { day: "numeric", month: "numeric", year: "2-digit" }),
      },
    },
    yAxis: { type: "value", scale: true, name: "kg" },
    series: [
      {
        type: "line",
        data: weights.map((weight) => [parseDateOnly(weight.date).getTime(), weight.weightKg]),
        lineStyle: { color: LINE_COLOR, width: 2 },
        itemStyle: { color: LINE_COLOR },
        areaStyle: { color: LINE_COLOR, opacity: 0.1 },
        symbolSize: 7,
      },
    ],
  };
  return <ReactECharts option={option} style={{ height: 260 }} notMerge />;
}

function WeightEntryDialog({
  animalId,
  weight,
  onClose,
}: {
  animalId: string;
  weight: AnimalWeight | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const invalidate = useInvalidateBreeding();
  const [date, setDate] = useState(weight ? weight.date.slice(0, 10) : toLocalDateString(new Date()));
  const [weightInput, setWeightInput] = useState(weight ? String(weight.weightKg) : "");
  const [notes, setNotes] = useState(weight?.notes ?? "");
  const weightKg = parseFloat(weightInput);
  const isValid = date.length > 0 && Number.isFinite(weightKg) && weightKg > 0;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = { date, weightKg, notes: notes || null };
      const response = weight
        ? await apiClient.PATCH("/v1/animals/weights/byId/{weightId}", {
            params: { path: { weightId: weight.id } },
            body,
          })
        : await apiClient.POST("/v1/animals/byId/{animalId}/weights", {
            params: { path: { animalId } },
            body,
          });
      if (response.error) throw new Error("Failed to save weight");
    },
    onSuccess: () => {
      invalidate();
      onClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (weightId: string) => {
      const response = await apiClient.DELETE("/v1/animals/weights/byId/{weightId}", {
        params: { path: { weightId } },
      });
      if (response.error) throw new Error("Failed to delete weight");
    },
    onSuccess: () => {
      invalidate();
      onClose();
    },
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{weight ? t("breeding.editWeight") : t("breeding.addWeightEntry")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="weightDate">{t("common.date")}</Label>
            <Input id="weightDate" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weightKg">{t("breeding.weightKg")}</Label>
            <Input
              id="weightKg"
              type="number"
              step="any"
              min="0"
              value={weightInput}
              onChange={(event) => setWeightInput(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weightNotes">{t("breeding.notes")}</Label>
            <Textarea id="weightNotes" value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>
        </div>
        <DialogFooter className="sm:justify-between">
          {weight ? (
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(weight.id)}
            >
              {t("common.delete")}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button disabled={!isValid || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
              {t("common.save")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AnimalHeatsCard({ animal }: { animal: AnimalDetail }) {
  const { t, i18n } = useTranslation();
  const { canWrite: canWriteAnimals } = useFeatureAccess("animals");
  const heatsQuery = useQuery(animalHeatsQueryOptions(animal.id));
  const gestationSettingsQuery = useQuery(gestationSettingsQueryOptions());
  // All animals (dead sires included) to show the sire's name
  const allAnimalsQuery = useQuery(animalsQueryOptions(false));
  const animalNameById = new Map((allAnimalsQuery.data?.result ?? []).map((candidate) => [candidate.id, candidate.name]));
  // undefined: dialog closed, null: new entry, otherwise the entry being edited
  const [editedHeat, setEditedHeat] = useState<AnimalHeat | null | undefined>(undefined);
  const gestationDays = gestationSettingsQuery.data?.find(
    (setting) => setting.animalType === animal.type,
  )?.gestationDays;
  const heats = heatsQuery.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("breeding.heats")}</CardTitle>
        {canWriteAnimals && (
          <CardAction>
            <Button variant="outline" size="sm" onClick={() => setEditedHeat(null)}>
              {t("breeding.addHeat")}
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {heats.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground">{t("breeding.noHeats")}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("breeding.heatDate", { heat: t(`breeding.heatByType.${animal.type}`) })}</TableHead>
                <TableHead>{t("breeding.mated")}</TableHead>
                <TableHead>{t("breeding.sire")}</TableHead>
                <TableHead>{t("breeding.expectedBirth")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {heats.map((heat) => (
                <TableRow
                  key={heat.id}
                  className={canWriteAnimals ? "cursor-pointer" : undefined}
                  onClick={() => canWriteAnimals && setEditedHeat(heat)}
                >
                  <TableCell>{formatDateOnly(heat.date, i18n.language)}</TableCell>
                  <TableCell>{heat.mated ? "✓" : ""}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {(heat.sireId ? animalNameById.get(heat.sireId) : undefined) ?? heat.sireName ?? ""}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {heat.mated && gestationDays
                      ? addDaysToDateOnly(heat.date, gestationDays).toLocaleDateString(i18n.language)
                      : "–"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      {editedHeat !== undefined && (
        <HeatEntryDialog
          animal={animal}
          heat={editedHeat}
          gestationDays={gestationDays}
          onClose={() => setEditedHeat(undefined)}
        />
      )}
    </Card>
  );
}

function HeatEntryDialog({
  animal,
  heat,
  gestationDays,
  onClose,
}: {
  animal: AnimalDetail;
  heat: AnimalHeat | null;
  gestationDays: number | undefined;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const invalidate = useInvalidateBreeding();
  const livingAnimalsQuery = useQuery(animalsQueryOptions(true));
  const [date, setDate] = useState(heat ? heat.date.slice(0, 10) : toLocalDateString(new Date()));
  const [mated, setMated] = useState(heat?.mated ?? false);
  const [sireId, setSireId] = useState(heat?.sireId ?? "");
  const [sireName, setSireName] = useState(heat?.sireName ?? "");
  const [notes, setNotes] = useState(heat?.notes ?? "");

  // Living males of the same type are offered as sire
  const sireCandidates = useMemo(
    () =>
      (livingAnimalsQuery.data?.result ?? [])
        .filter((candidate) => candidate.sex === "male" && candidate.type === animal.type)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [livingAnimalsQuery.data, animal.type],
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        date,
        mated,
        sireId: mated && sireId ? sireId : null,
        sireName: mated && sireName ? sireName : null,
        notes: notes || null,
      };
      const response = heat
        ? await apiClient.PATCH("/v1/animals/heats/byId/{heatId}", {
            params: { path: { heatId: heat.id } },
            body,
          })
        : await apiClient.POST("/v1/animals/byId/{animalId}/heats", {
            params: { path: { animalId: animal.id } },
            body,
          });
      if (response.error) throw new Error("Failed to save heat");
    },
    onSuccess: () => {
      invalidate();
      onClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (heatId: string) => {
      const response = await apiClient.DELETE("/v1/animals/heats/byId/{heatId}", {
        params: { path: { heatId } },
      });
      if (response.error) throw new Error("Failed to delete heat");
    },
    onSuccess: () => {
      invalidate();
      onClose();
    },
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{heat ? t("breeding.editHeat") : t("breeding.addHeat")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="heatDate">{t("breeding.heatDate", { heat: t(`breeding.heatByType.${animal.type}`) })}</Label>
            <Input id="heatDate" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="heatMated" checked={mated} onCheckedChange={(checked) => setMated(checked === true)} />
            <Label htmlFor="heatMated" className="font-normal">
              {t("breeding.mated")}
            </Label>
          </div>
          {mated && (
            <>
              <div className="space-y-2">
                <Label htmlFor="heatSire">{t("breeding.sire")}</Label>
                <select
                  id="heatSire"
                  className="w-full rounded border px-3 py-2 text-sm"
                  value={sireId}
                  onChange={(event) => setSireId(event.target.value)}
                >
                  <option value="">-</option>
                  {sireCandidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.earTag?.number ? `${candidate.earTag.number} - ${candidate.name}` : candidate.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="heatSireName">{t("breeding.sireExternal")}</Label>
                <Input id="heatSireName" value={sireName} onChange={(event) => setSireName(event.target.value)} />
              </div>
              {date && gestationDays && (
                <div className="rounded-md border-l-4 border-primary bg-muted/40 px-3 py-2 text-sm">
                  {t("breeding.expectedBirth")}:{" "}
                  {addDaysToDateOnly(date, gestationDays).toLocaleDateString(i18n.language)}
                </div>
              )}
            </>
          )}
          <div className="space-y-2">
            <Label htmlFor="heatNotes">{t("breeding.notes")}</Label>
            <Textarea id="heatNotes" value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>
        </div>
        <DialogFooter className="sm:justify-between">
          {heat ? (
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(heat.id)}
            >
              {t("common.delete")}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button disabled={!date || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
              {t("common.save")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
