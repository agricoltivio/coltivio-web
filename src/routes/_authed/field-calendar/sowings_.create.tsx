import { toLocalDateString } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { apiClient } from "@/api/client";
import { cropsQueryOptions } from "@/api/crops.queries";
import { plotsQueryOptions } from "@/api/plots.queries";
import { seedsQueryOptions } from "@/api/seeds.queries";
import { sowingPresetsQueryOptions, sowingUnitsQueryOptions } from "@/api/sowings.queries";
import type { Plot, SowingPreset, SowingUnit } from "@/api/types";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import { MultiPlotPicker } from "@/components/MultiPlotPicker";
import { PlotDivideSection, sumDivided } from "@/components/PlotDivideSection";
import { WizardNav, WizardProgress } from "@/components/wizard/WizardShell";
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
import { computeCounterpart, isPerAreaUnit, unitsForQuantityKind } from "@/lib/sowingUnits";

const ALL_STEPS = ["crop", "config", "plots", "divide", "summary"] as const;
type WizardStep = (typeof ALL_STEPS)[number];

// Radix Select doesn't allow an empty item value
const NO_SEED = "none";

const searchSchema = z.object({
  plotId: z.string().optional(),
  returnTo: z.string().optional(),
});

export const Route = createFileRoute("/_authed/field-calendar/sowings_/create")({
  validateSearch: searchSchema,
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(plotsQueryOptions());
    queryClient.ensureQueryData(cropsQueryOptions());
    queryClient.ensureQueryData(seedsQueryOptions());
    queryClient.ensureQueryData(sowingPresetsQueryOptions());
    queryClient.ensureQueryData(sowingUnitsQueryOptions());
  },
  component: CreateSowing,
});

type FormData = {
  plotIds: string[];
  cropId: string;
  seedId: string;
  date: string;
  unit: SowingUnit;
  amount: string;
  additionalNotes: string;
};

function CreateSowing() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { plotId: defaultPlotId, returnTo } = Route.useSearch();

  const backSearch = defaultPlotId
    ? { plotId: defaultPlotId, ...(returnTo ? { returnTo } : {}) }
    : {};
  function goToOverview() {
    navigate({ to: "/field-calendar/sowings", search: backSearch });
  }

  const [step, setStep] = useState<WizardStep>("crop");
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [savePresetOpen, setSavePresetOpen] = useState(false);
  const [managePresetsOpen, setManagePresetsOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  // Per-plot totals, only used for total units on more than one plot
  const [amountsByPlot, setAmountsByPlot] = useState<Record<string, string>>({});
  const [divideByArea, setDivideByArea] = useState(true);

  const plotsQuery = useQuery(plotsQueryOptions());
  const cropsQuery = useQuery(cropsQueryOptions());
  const seedsQuery = useQuery(seedsQueryOptions());
  const presetsQuery = useQuery(sowingPresetsQueryOptions());
  const unitsQuery = useQuery(sowingUnitsQueryOptions());

  const { register, setValue, watch, getValues } = useForm<FormData>({
    defaultValues: {
      plotIds: defaultPlotId ? [defaultPlotId] : [],
      cropId: "",
      seedId: "",
      date: toLocalDateString(new Date()),
      unit: "kg_per_ha",
      amount: "",
      additionalNotes: "",
    },
  });

  const plots = plotsQuery.data?.result ?? [];
  const crops = cropsQuery.data?.result ?? [];
  const seeds = seedsQuery.data?.result ?? [];
  const presets = presetsQuery.data?.result ?? [];
  const units = unitsQuery.data ?? [];

  const watchedPlotIds = watch("plotIds");
  const watchedCropId = watch("cropId");
  const watchedSeedId = watch("seedId");
  const watchedDate = watch("date");
  const watchedUnit = watch("unit");
  const watchedAmount = watch("amount");

  const plotIdsKey = watchedPlotIds.join(",");
  useEffect(() => {
    setDivideByArea(true);
  }, [plotIdsKey]);

  const selectedCrop = crops.find((crop) => crop.id === watchedCropId);
  const selectedSeed = seeds.find((seed) => seed.id === watchedSeedId);
  const presetsForCrop = presets.filter((preset) => preset.cropId === watchedCropId);
  const availableUnits = unitsForQuantityKind(units, selectedSeed?.quantityKind);

  const selectedPlots = watchedPlotIds
    .map((plotId) => plots.find((plot) => plot.id === plotId))
    .filter((plot): plot is Plot => plot != null);
  const isMultiPlot = selectedPlots.length > 1;
  const selectedSize = selectedPlots.reduce((sum, plot) => sum + plot.size, 0);

  const amountNumber = parseFloat(watchedAmount) || 0;
  const perArea = isPerAreaUnit(units, watchedUnit);
  const counterpart = computeCounterpart(units, amountNumber, watchedUnit, selectedSize);
  const unitLabel = t(`fieldCalendar.sowings.units.${watchedUnit}`);
  const roundedTotal = Math.round((amountNumber + Number.EPSILON) * 100) / 100;
  const needsDivide = isMultiPlot && !perArea;
  const divideInvalid =
    needsDivide &&
    Math.abs(sumDivided(amountsByPlot, watchedPlotIds) - roundedTotal) > 0.01;

  function selectSeed(seedId: string) {
    setValue("seedId", seedId);
    const seed = seeds.find((candidate) => candidate.id === seedId);
    if (!seed) return;
    // the crop always comes from the seed
    setValue("cropId", seed.cropId);
    setSelectedPresetId(null);
    if (seed.defaultUnit && seed.defaultAmount != null) {
      setValue("unit", seed.defaultUnit);
      setValue("amount", seed.defaultAmount.toString());
      return;
    }
    // keep the unit if it fits the seed, otherwise fall back to the first fitting one
    const fittingUnits = unitsForQuantityKind(units, seed.quantityKind);
    if (!fittingUnits.some((unitInfo) => unitInfo.unit === getValues("unit")) && fittingUnits[0]) {
      setValue("unit", fittingUnits[0].unit);
    }
  }

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (selectedPlots.length === 0) throw new Error("Plot not found");
      const amount = parseFloat(data.amount) || 0;
      const response = await apiClient.POST("/v1/sowings", {
        body: {
          date: data.date,
          // with a seed the API takes the crop from the seed
          cropId: data.seedId ? undefined : data.cropId,
          seedId: data.seedId || undefined,
          unit: data.unit,
          additionalNotes: data.additionalNotes || undefined,
          plots: selectedPlots.map((plot) => ({
            plotId: plot.id,
            // per-area rates apply to every plot, totals are split across plots
            amount: needsDivide ? parseFloat(amountsByPlot[plot.id] ?? "") || 0 : amount,
            geometry: plot.geometry,
            size: plot.size,
          })),
        },
      });
      if (response.error) throw new Error("Failed to create sowing");
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sowings"] });
      queryClient.invalidateQueries({ queryKey: ["plots"] });
      goToOverview();
    },
  });

  const createPresetMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiClient.POST("/v1/sowings/presets", {
        body: {
          name,
          cropId: watchedSeedId ? undefined : watchedCropId,
          seedId: watchedSeedId || undefined,
          unit: watchedUnit,
          amount: amountNumber,
        },
      });
      if (response.error) throw new Error("Failed to create sowing preset");
      return response.data.data;
    },
    onSuccess: (preset: SowingPreset) => {
      queryClient.invalidateQueries({ queryKey: ["sowings", "presets"] });
      setSelectedPresetId(preset.id);
      setNewPresetName("");
      setSavePresetOpen(false);
    },
  });

  const deletePresetMutation = useMutation({
    mutationFn: async (presetId: string) => {
      const response = await apiClient.DELETE("/v1/sowings/presets/byId/{presetId}", {
        params: { path: { presetId } },
      });
      if (response.error) throw new Error("Failed to delete sowing preset");
    },
    onSuccess: (_data, deletedPresetId) => {
      queryClient.invalidateQueries({ queryKey: ["sowings", "presets"] });
      if (selectedPresetId === deletedPresetId) setSelectedPresetId(null);
    },
  });

  function applyPreset(presetId: string) {
    const preset = presets.find((candidate) => candidate.id === presetId);
    if (!preset) return;
    setSelectedPresetId(presetId);
    setValue("seedId", preset.seedId ?? "");
    setValue("unit", preset.unit);
    setValue("amount", preset.amount.toString());
  }

  // --- Wizard step machinery ---
  const steps = ALL_STEPS.filter((s) => (s === "divide" ? needsDivide : true));
  const activeStep = steps.includes(step)
    ? step
    : ([...steps]
        .reverse()
        .find((s) => ALL_STEPS.indexOf(s) <= ALL_STEPS.indexOf(step)) ?? steps[0]);
  const stepIndex = steps.indexOf(activeStep);

  function stepValid(s: WizardStep): boolean {
    switch (s) {
      case "crop":
        return !!watchedCropId && !!watchedDate;
      case "plots":
        return watchedPlotIds.length >= 1;
      case "config":
        return watchedAmount.trim() !== "" && amountNumber >= 0;
      case "divide":
        return !divideInvalid;
      case "summary":
        return true;
    }
  }

  function goNext() {
    if (stepIndex < steps.length - 1) setStep(steps[stepIndex + 1]);
  }
  function goBack() {
    if (stepIndex > 0) setStep(steps[stepIndex - 1]);
  }

  return (
    <PageContent
      title={t("fieldCalendar.sowings.create")}
      showBackButton
      backTo={goToOverview}
    >
      <div className="max-w-lg space-y-6">
        <WizardProgress
          stepIndex={stepIndex}
          total={steps.length}
          label={t(`fieldCalendar.sowings.wizard.steps.${activeStep}`)}
        />

        {/* Step: seed, crop + date */}
        {activeStep === "crop" && (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>{t("fieldCalendar.sowings.seedOptional")}</Label>
              <Select
                value={watchedSeedId || NO_SEED}
                onValueChange={(value) => {
                  if (value === NO_SEED) setValue("seedId", "");
                  else if (value) selectSeed(value);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SEED}>{t("fieldCalendar.sowings.noSeed")}</SelectItem>
                  {seeds.map((seed) => (
                    <SelectItem key={seed.id} value={seed.id}>
                      {seed.name}
                      <span className="text-muted-foreground"> · {seed.crop.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t("fieldCalendar.sowings.crop")}</Label>
              <Select
                value={watchedCropId}
                disabled={!!selectedSeed}
                onValueChange={(value) => {
                  if (!value) return;
                  setValue("cropId", value);
                  setSelectedPresetId(null);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("fieldCalendar.sowings.selectCrop")} />
                </SelectTrigger>
                <SelectContent>
                  {crops.map((crop) => (
                    <SelectItem key={crop.id} value={crop.id}>
                      {crop.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedSeed && (
                <p className="text-xs text-muted-foreground">
                  {t("fieldCalendar.sowings.cropFromSeed")}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label>{t("fieldCalendar.sowings.date")}</Label>
              <Input type="date" {...register("date", { required: true })} />
            </div>
          </div>
        )}

        {/* Step: plots */}
        {activeStep === "plots" && (
          <div className="space-y-1">
            <Label>{t("fieldCalendar.plots.title")}</Label>
            <MultiPlotPicker
              plots={plots}
              value={watchedPlotIds}
              onChange={(ids) => setValue("plotIds", ids)}
            />
          </div>
        )}

        {/* Step: configuration */}
        {activeStep === "config" && (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>{t("fieldCalendar.presets.select")}</Label>
              <div className="flex gap-1">
                <div className="min-w-0 flex-1">
                  <Select
                    value={selectedPresetId ?? ""}
                    onValueChange={(value) => applyPreset(value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("fieldCalendar.presets.select")} />
                    </SelectTrigger>
                    <SelectContent>
                      {presetsForCrop.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          {t("fieldCalendar.presets.noPresets")}
                        </div>
                      ) : (
                        presetsForCrop.map((preset) => (
                          <SelectItem key={preset.id} value={preset.id}>
                            {preset.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setManagePresetsOpen(true)}
                >
                  <PencilIcon className="size-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>{t("fieldCalendar.sowings.amount")}</Label>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    {...register("amount", { required: true })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("fieldCalendar.sowings.unit")}</Label>
                  <Select
                    value={watchedUnit}
                    onValueChange={(value) => {
                      const unitInfo = availableUnits.find((info) => info.unit === value);
                      if (unitInfo) setValue("unit", unitInfo.unit);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUnits.map((unitInfo) => (
                        <SelectItem key={unitInfo.unit} value={unitInfo.unit}>
                          {t(`fieldCalendar.sowings.units.${unitInfo.unit}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {counterpart && amountNumber > 0 && (
                <p className="text-sm text-muted-foreground">
                  {t(
                    perArea
                      ? "fieldCalendar.sowings.computedTotal"
                      : "fieldCalendar.sowings.computedRate",
                    {
                      amount: counterpart.amount.toLocaleString(),
                      unit: t(`fieldCalendar.sowings.units.${counterpart.unit}`),
                      area: counterpart.area,
                    },
                  )}
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSavePresetOpen(true)}
                disabled={!watchedCropId || watchedAmount.trim() === ""}
              >
                {t("fieldCalendar.presets.saveAs")}
              </Button>
            </div>
          </div>
        )}

        {/* Step: divide (total units on several plots) */}
        {activeStep === "divide" && (
          <PlotDivideSection
            plots={selectedPlots}
            totalUnits={amountNumber}
            unitLabel={unitLabel}
            byArea={divideByArea}
            onByAreaChange={setDivideByArea}
            unitsByPlot={amountsByPlot}
            onChange={setAmountsByPlot}
          />
        )}

        {/* Step: summary */}
        {activeStep === "summary" && (
          <div className="space-y-4">
            <dl className="divide-y rounded-lg border text-sm">
              <SummaryRow
                label={t("fieldCalendar.sowings.seed")}
                value={selectedSeed?.name ?? "-"}
              />
              <SummaryRow
                label={t("fieldCalendar.sowings.crop")}
                value={selectedCrop?.name ?? "-"}
              />
              <SummaryRow
                label={t("fieldCalendar.sowings.date")}
                value={new Date(watchedDate).toLocaleDateString()}
              />
              <SummaryRow
                label={t("fieldCalendar.sowings.amount")}
                value={`${watchedAmount || 0} ${unitLabel}`}
              />
              {counterpart && (
                <SummaryRow
                  label={
                    perArea
                      ? t("fieldCalendar.sowings.total")
                      : t("fieldCalendar.sowings.rate")
                  }
                  value={`${counterpart.amount.toLocaleString()} ${t(`fieldCalendar.sowings.units.${counterpart.unit}`)}`}
                />
              )}
              <SummaryRow
                label={t("fieldCalendar.plots.title")}
                value={
                  <ul className="space-y-0.5">
                    {selectedPlots.map((plot) => (
                      <li key={plot.id}>
                        {plot.name}
                        {needsDivide && (
                          <span className="text-muted-foreground">
                            {" — "}
                            {amountsByPlot[plot.id] ?? "0"} {unitLabel}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                }
              />
            </dl>

            <div className="space-y-1">
              <Label>{t("fieldCalendar.tillages.notes")}</Label>
              <Textarea {...register("additionalNotes")} rows={3} />
            </div>
          </div>
        )}

        <WizardNav
          isFirst={stepIndex === 0}
          isLast={activeStep === "summary"}
          canAdvance={activeStep === "summary" ? !divideInvalid : stepValid(activeStep)}
          saving={createMutation.isPending}
          onBack={goBack}
          onCancel={goToOverview}
          onNext={goNext}
          onSave={() => createMutation.mutate(getValues())}
        />
      </div>

      {/* Save as preset dialog */}
      <Dialog open={savePresetOpen} onOpenChange={setSavePresetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("fieldCalendar.presets.saveAs")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            <Label>{t("fieldCalendar.presets.name")}</Label>
            <Input
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSavePresetOpen(false);
                setNewPresetName("");
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => createPresetMutation.mutate(newPresetName)}
              disabled={!newPresetName.trim() || createPresetMutation.isPending}
            >
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage presets dialog */}
      <Dialog open={managePresetsOpen} onOpenChange={setManagePresetsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("fieldCalendar.presets.manage")}</DialogTitle>
          </DialogHeader>
          {presets.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("fieldCalendar.presets.noPresets")}
            </p>
          ) : (
            <ul className="space-y-2">
              {presets.map((preset) => (
                <li
                  key={preset.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <span className="text-sm">
                    {preset.name}
                    <span className="text-muted-foreground"> · {preset.crop.name}</span>
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => deletePresetMutation.mutate(preset.id)}
                    disabled={deletePresetMutation.isPending}
                  >
                    <Trash2Icon className="size-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setManagePresetsOpen(false)}>
              {t("common.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContent>
  );
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-3 py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
