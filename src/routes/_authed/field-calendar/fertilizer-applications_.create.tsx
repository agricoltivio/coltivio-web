import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { apiClient } from "@/api/client";
import { fertilizerApplicationPresetsQueryOptions } from "@/api/fertilizerApplications.queries";
import { fertilizersQueryOptions } from "@/api/fertilizers.queries";
import { plotsQueryOptions } from "@/api/plots.queries";
import type {
  FertilizerApplication,
  FertilizerApplicationPreset,
  Plot,
} from "@/api/types";
import {
  FERTILIZER_TYPES,
  FERTILIZER_UNITS,
  type FertilizerType,
  type FertilizerUnit,
} from "@/api/types";
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

type FertilizerApplicationUnit = FertilizerApplication["unit"];
type FertilizerMethod = NonNullable<FertilizerApplication["method"]>;

const FERTILIZER_APPLICATION_UNITS: FertilizerApplicationUnit[] = [
  "load",
  "bag",
  "total_amount",
  "amount_per_hectare",
  "other",
];

const FERTILIZER_METHODS: FertilizerMethod[] = ["spray", "spread", "other"];

const ALL_STEPS = [
  "fertilizer",
  "config",
  "quantity",
  "plots",
  "divide",
  "summary",
] as const;
type WizardStep = (typeof ALL_STEPS)[number];

const searchSchema = z.object({
  plotId: z.string().optional(),
  returnTo: z.string().optional(),
});

export const Route = createFileRoute(
  "/_authed/field-calendar/fertilizer-applications_/create",
)({
  validateSearch: searchSchema,
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(plotsQueryOptions());
    queryClient.ensureQueryData(fertilizersQueryOptions());
    queryClient.ensureQueryData(fertilizerApplicationPresetsQueryOptions());
  },
  component: CreateFertilizerApplication,
});

type FormData = {
  plotIds: string[];
  fertilizerId: string;
  date: string;
  unit: FertilizerApplicationUnit;
  method: FertilizerMethod | "";
  amountPerUnit: string;
  numberOfUnits: string;
  additionalNotes: string;
};

type FertilizerModalFormData = {
  name: string;
  type: FertilizerType;
  unit: FertilizerUnit;
  description: string;
};

function CreateFertilizerApplication() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { plotId: defaultPlotId, returnTo } = Route.useSearch();

  // Return to the plot's application list when opened from a plot, otherwise
  // to the global overview.
  const backSearch = defaultPlotId
    ? { plotId: defaultPlotId, ...(returnTo ? { returnTo } : {}) }
    : {};
  function goToOverview() {
    navigate({
      to: "/field-calendar/fertilizer-applications",
      search: backSearch,
    });
  }

  const [step, setStep] = useState<WizardStep>("fertilizer");
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [savePresetOpen, setSavePresetOpen] = useState(false);
  const [managePresetsOpen, setManagePresetsOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [createFertilizerOpen, setCreateFertilizerOpen] = useState(false);
  // Per-plot amount split (used only when more than one plot is selected).
  const [unitsByPlot, setUnitsByPlot] = useState<Record<string, string>>({});
  const [divideByArea, setDivideByArea] = useState(true);

  const plotsQuery = useQuery(plotsQueryOptions());
  const fertilizersQuery = useQuery(fertilizersQueryOptions());
  const presetsQuery = useQuery(fertilizerApplicationPresetsQueryOptions());

  const { register, setValue, watch, getValues } = useForm<FormData>({
    defaultValues: {
      plotIds: defaultPlotId ? [defaultPlotId] : [],
      fertilizerId: "",
      date: new Date().toISOString().slice(0, 10),
      unit: "load",
      method: "spread",
      amountPerUnit: "",
      numberOfUnits: "1",
      additionalNotes: "",
    },
  });

  const fertilizerForm = useForm<FertilizerModalFormData>({
    defaultValues: { name: "", type: "mineral", unit: "kg", description: "" },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const selectedPlots = data.plotIds
        .map((plotId) => plots.find((p) => p.id === plotId))
        .filter((p): p is Plot => p != null);
      if (selectedPlots.length === 0) throw new Error("Plot not found");

      const amountPerUnit = parseFloat(data.amountPerUnit) || 0;
      const numberOfUnits = parseFloat(data.numberOfUnits) || 0;
      const multi = selectedPlots.length > 1;

      const response = await apiClient.POST("/v1/fertilizerApplications", {
        body: {
          date: new Date(data.date).toISOString(),
          fertilizerId: data.fertilizerId,
          unit: data.unit,
          method: data.method || undefined,
          amountPerUnit,
          additionalNotes: data.additionalNotes || undefined,
          // The divide step works in total-amount space (amountPerUnit ×
          // numberOfUnits); convert each plot's amount back to a unit count.
          plots: selectedPlots.map((plot) => {
            if (!multi) {
              return {
                plotId: plot.id,
                // amount_per_hectare: the unit count is the plot's hectares.
                numberOfUnits:
                  data.unit === "amount_per_hectare"
                    ? plot.size / 10000
                    : numberOfUnits,
                geometry: plot.geometry,
                size: plot.size,
              };
            }
            const plotAmount = parseFloat(unitsByPlot[plot.id] ?? "") || 0;
            return {
              plotId: plot.id,
              numberOfUnits: amountPerUnit > 0 ? plotAmount / amountPerUnit : 0,
              geometry: plot.geometry,
              size: plot.size,
            };
          }),
        },
      });
      if (response.error) throw new Error("Failed to create fertilizer application");
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fertilizerApplications"] });
      queryClient.invalidateQueries({ queryKey: ["plots"] });
      goToOverview();
    },
  });

  const createPresetMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiClient.POST("/v1/fertilizerApplications/presets", {
        body: {
          name,
          fertilizerId: watch("fertilizerId"),
          unit: watch("unit"),
          method: watch("method") || undefined,
          amountPerUnit: parseFloat(watch("amountPerUnit")) || 0,
        },
      });
      if (response.error) {
        throw new Error("Failed to create fertilizer application preset");
      }
      return response.data.data;
    },
    onSuccess: (preset: FertilizerApplicationPreset) => {
      queryClient.invalidateQueries({
        queryKey: ["fertilizerApplications", "presets"],
      });
      setSelectedPresetId(preset.id);
      setNewPresetName("");
      setSavePresetOpen(false);
    },
  });

  const deletePresetMutation = useMutation({
    mutationFn: async (presetId: string) => {
      const response = await apiClient.DELETE(
        "/v1/fertilizerApplications/presets/byId/{presetId}",
        { params: { path: { presetId } } },
      );
      if (response.error) {
        throw new Error("Failed to delete fertilizer application preset");
      }
    },
    onSuccess: (_data, deletedPresetId) => {
      queryClient.invalidateQueries({
        queryKey: ["fertilizerApplications", "presets"],
      });
      if (selectedPresetId === deletedPresetId) setSelectedPresetId(null);
    },
  });

  const createFertilizerMutation = useMutation({
    mutationFn: async (data: FertilizerModalFormData) => {
      const response = await apiClient.POST("/v1/fertilizers", {
        body: {
          name: data.name,
          type: data.type,
          unit: data.unit,
          description: data.description || undefined,
        },
      });
      if (response.error) throw new Error("Failed to create fertilizer");
      return response.data.data;
    },
    onSuccess: (newFertilizer) => {
      queryClient.setQueryData(fertilizersQueryOptions().queryKey, (old) => {
        if (!old) return old;
        return { ...old, result: [...old.result, newFertilizer] };
      });
      queryClient.invalidateQueries({ queryKey: ["fertilizers"] });
      setValue("fertilizerId", newFertilizer.id);
      setCreateFertilizerOpen(false);
      fertilizerForm.reset();
    },
  });

  const plots = plotsQuery.data?.result ?? [];
  const fertilizers = fertilizersQuery.data?.result ?? [];
  const presets = presetsQuery.data?.result ?? [];

  const watchedPlotIds = watch("plotIds");
  const watchedFertilizerId = watch("fertilizerId");
  const watchedDate = watch("date");
  const watchedUnit = watch("unit");
  const watchedMethod = watch("method");
  const watchedAmountPerUnit = watch("amountPerUnit");
  const watchedNumberOfUnits = watch("numberOfUnits");
  const watchedNotes = watch("additionalNotes");

  // Re-enable "split by plot size" whenever the selected plots change, so the
  // divide step always starts from a fresh proportional split.
  const plotIdsKey = watchedPlotIds.join(",");
  useEffect(() => {
    setDivideByArea(true);
  }, [plotIdsKey]);

  const selectedFertilizer = fertilizers.find((f) => f.id === watchedFertilizerId);
  const fertilizerUnitLabel = selectedFertilizer?.unit ?? "";

  const selectedPlots = watchedPlotIds
    .map((plotId) => plots.find((p) => p.id === plotId))
    .filter((p): p is Plot => p != null);
  const isMultiPlot = selectedPlots.length > 1;

  // total_amount and amount_per_hectare carry a fixed amount, so the number of
  // units is always 1 and the quantity step is skipped.
  const isFixedAmountUnit =
    watchedUnit === "total_amount" || watchedUnit === "amount_per_hectare";

  // The divide step distributes the total fertilizer amount, in the fertilizer's
  // unit. For amount_per_hectare it's derived from the selected plots' area.
  const amountPerUnitNum = parseFloat(watchedAmountPerUnit) || 0;
  const selectedHectares =
    selectedPlots.reduce((sum, plot) => sum + plot.size, 0) / 10000;
  const totalAmount =
    watchedUnit === "amount_per_hectare"
      ? amountPerUnitNum * selectedHectares
      : amountPerUnitNum * (parseFloat(watchedNumberOfUnits) || 0);
  const roundedTotal = Math.round((totalAmount + Number.EPSILON) * 100) / 100;
  const divideInvalid =
    isMultiPlot &&
    Math.abs(sumDivided(unitsByPlot, watchedPlotIds) - roundedTotal) > 0.01;

  // --- Wizard step machinery ---
  const steps = ALL_STEPS.filter((s) => {
    if (s === "quantity") return !isFixedAmountUnit;
    if (s === "divide") return isMultiPlot;
    return true;
  });
  // If the current step got hidden (e.g. unit switched to total_amount while on
  // "quantity"), fall back to the nearest still-visible step at or before it.
  const activeStep = steps.includes(step)
    ? step
    : ([...steps]
        .reverse()
        .find((s) => ALL_STEPS.indexOf(s) <= ALL_STEPS.indexOf(step)) ?? steps[0]);
  const stepIndex = steps.indexOf(activeStep);

  function stepValid(s: WizardStep): boolean {
    switch (s) {
      case "fertilizer":
        return !!watchedFertilizerId && !!watchedDate;
      case "config":
        return (
          watchedAmountPerUnit.trim() !== "" &&
          !Number.isNaN(parseFloat(watchedAmountPerUnit)) &&
          watchedMethod !== ""
        );
      case "quantity":
        return (parseFloat(watchedNumberOfUnits) || 0) > 0;
      case "plots":
        return watchedPlotIds.length >= 1;
      case "divide":
        return !divideInvalid;
      case "summary":
        return true;
    }
  }

  function goNext() {
    if (activeStep === "config" && isFixedAmountUnit) {
      setValue("numberOfUnits", "1");
    }
    if (stepIndex < steps.length - 1) setStep(steps[stepIndex + 1]);
  }
  function goBack() {
    if (stepIndex > 0) setStep(steps[stepIndex - 1]);
  }

  function applyPreset(presetId: string) {
    const preset = presets.find((p) => p.id === presetId);
    if (!preset) return;
    setSelectedPresetId(presetId);
    setValue("fertilizerId", preset.fertilizerId);
    setValue("unit", preset.unit);
    setValue("method", preset.method ?? "");
    setValue("amountPerUnit", preset.amountPerUnit.toString());
  }

  // Label for the "amount per unit" input, matching the RN app: "l / Fuder",
  // "Gesamtmenge (l)" for total_amount, "l / ha" for amount_per_hectare.
  const fertilizerUnit = selectedFertilizer?.unit ?? "kg";
  const amountPerUnitLabel =
    watchedUnit === "total_amount"
      ? `${t("fieldCalendar.fertilizerApplications.units.total_amount")} (${fertilizerUnit})`
      : watchedUnit === "amount_per_hectare"
        ? `${fertilizerUnit} / ha`
        : `${fertilizerUnit} / ${t(`fieldCalendar.fertilizerApplications.units.${watchedUnit}`)}`;

  return (
    <PageContent
      title={t("fieldCalendar.fertilizerApplications.create")}
      showBackButton
      backTo={goToOverview}
    >
      <div className="max-w-lg space-y-6">
        <WizardProgress
          stepIndex={stepIndex}
          total={steps.length}
          label={t(
            `fieldCalendar.fertilizerApplications.wizard.steps.${activeStep}`,
          )}
        />

        {/* Step: fertilizer + date */}
        {activeStep === "fertilizer" && (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>{t("fieldCalendar.fertilizerApplications.fertilizer")}</Label>
              <div className="flex gap-1">
                <div className="min-w-0 flex-1">
                  <Select
                    value={watchedFertilizerId}
                    onValueChange={(v) => {
                      if (v) setValue("fertilizerId", v);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={t(
                          "fieldCalendar.fertilizerApplications.selectFertilizer",
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {fertilizers.map((fertilizer) => (
                        <SelectItem key={fertilizer.id} value={fertilizer.id}>
                          {fertilizer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setCreateFertilizerOpen(true)}
                >
                  <PlusIcon className="size-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t("fieldCalendar.fertilizerApplications.date")}</Label>
              <Input type="date" {...register("date", { required: true })} />
            </div>
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
                    onValueChange={(v) => applyPreset(v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("fieldCalendar.presets.select")} />
                    </SelectTrigger>
                    <SelectContent>
                      {presets.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          {t("fieldCalendar.presets.noPresets")}
                        </div>
                      ) : (
                        presets.map((preset) => (
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
                  <Label>{amountPerUnitLabel}</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.1"
                    {...register("amountPerUnit", { required: true })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("fieldCalendar.fertilizerApplications.unit")}</Label>
                  <Select
                    value={watchedUnit}
                    onValueChange={(v) =>
                      setValue("unit", v as FertilizerApplicationUnit)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FERTILIZER_APPLICATION_UNITS.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {t(`fieldCalendar.fertilizerApplications.units.${unit}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label>{t("fieldCalendar.fertilizerApplications.method")}</Label>
                <Select
                  value={watchedMethod}
                  onValueChange={(v) => setValue("method", v as FertilizerMethod | "")}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t("fieldCalendar.fertilizerApplications.selectMethod")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {FERTILIZER_METHODS.map((method) => (
                      <SelectItem key={method} value={method}>
                        {t(`fieldCalendar.fertilizerApplications.methods.${method}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSavePresetOpen(true)}
                disabled={!watchedFertilizerId}
              >
                {t("fieldCalendar.presets.saveAs")}
              </Button>
            </div>
          </div>
        )}

        {/* Step: quantity */}
        {activeStep === "quantity" && (
          <div className="space-y-1">
            <Label>
              {t("fieldCalendar.fertilizerApplications.numberOfUnitsWith", {
                unit: t(`fieldCalendar.fertilizerApplications.units.${watchedUnit}`),
              })}
            </Label>
            <Input
              type="number"
              min={0}
              step="0.1"
              {...register("numberOfUnits", { required: true })}
            />
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

        {/* Step: divide */}
        {activeStep === "divide" && (
          <PlotDivideSection
            plots={selectedPlots}
            totalUnits={totalAmount}
            unitLabel={fertilizerUnitLabel}
            byArea={divideByArea}
            onByAreaChange={setDivideByArea}
            unitsByPlot={unitsByPlot}
            onChange={setUnitsByPlot}
          />
        )}

        {/* Step: summary */}
        {activeStep === "summary" && (
          <div className="space-y-4">
            <dl className="divide-y rounded-lg border text-sm">
              <SummaryRow
                label={t("fieldCalendar.fertilizerApplications.fertilizer")}
                value={selectedFertilizer?.name ?? "-"}
              />
              <SummaryRow
                label={t("fieldCalendar.fertilizerApplications.date")}
                value={new Date(watchedDate).toLocaleDateString()}
              />
              <SummaryRow
                label={t("fieldCalendar.fertilizerApplications.unit")}
                value={t(`fieldCalendar.fertilizerApplications.units.${watchedUnit}`)}
              />
              {watchedMethod && (
                <SummaryRow
                  label={t("fieldCalendar.fertilizerApplications.method")}
                  value={t(
                    `fieldCalendar.fertilizerApplications.methods.${watchedMethod}`,
                  )}
                />
              )}
              <SummaryRow
                label={amountPerUnitLabel}
                value={`${watchedAmountPerUnit || 0} ${fertilizerUnitLabel}`}
              />
              {!isFixedAmountUnit && (
                <SummaryRow
                  label={t("fieldCalendar.fertilizerApplications.numberOfUnitsWith", {
                    unit: t(
                      `fieldCalendar.fertilizerApplications.units.${watchedUnit}`,
                    ),
                  })}
                  value={watchedNumberOfUnits}
                />
              )}
              <SummaryRow
                label={t("fieldCalendar.plots.title")}
                value={
                  <ul className="space-y-0.5">
                    {selectedPlots.map((plot) => (
                      <li key={plot.id}>
                        {plot.name}
                        {isMultiPlot && (
                          <span className="text-muted-foreground">
                            {" — "}
                            {unitsByPlot[plot.id] ?? "0"} {fertilizerUnitLabel}
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
          canAdvance={
            activeStep === "summary" ? !divideInvalid : stepValid(activeStep)
          }
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
                  <span className="text-sm">{preset.name}</span>
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

      {/* Inline create fertilizer dialog */}
      <Dialog
        open={createFertilizerOpen}
        onOpenChange={(open) => {
          setCreateFertilizerOpen(open);
          if (!open) fertilizerForm.reset();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("fertilizers.createFertilizer")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>{t("fertilizers.name")} *</Label>
              <Input {...fertilizerForm.register("name", { required: true })} />
            </div>
            <div className="space-y-1">
              <Label>{t("fertilizers.type")} *</Label>
              <Select
                value={fertilizerForm.watch("type")}
                onValueChange={(v) =>
                  fertilizerForm.setValue("type", v as FertilizerType)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FERTILIZER_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(`fertilizers.types.${type}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t("fertilizers.unit")} *</Label>
              <Select
                value={fertilizerForm.watch("unit")}
                onValueChange={(v) =>
                  fertilizerForm.setValue("unit", v as FertilizerUnit)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FERTILIZER_UNITS.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t("fertilizers.description")}</Label>
              <Textarea {...fertilizerForm.register("description")} />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateFertilizerOpen(false);
                fertilizerForm.reset();
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={fertilizerForm.handleSubmit((data) =>
                createFertilizerMutation.mutate(data),
              )}
              disabled={createFertilizerMutation.isPending}
            >
              {t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContent>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-3 py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
