import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { apiClient } from "@/api/client";
import { cropFamiliesQueryOptions, cropsQueryOptions } from "@/api/crops.queries";
import { harvestPresetsQueryOptions } from "@/api/harvests.queries";
import { plotsQueryOptions } from "@/api/plots.queries";
import {
  CROP_CATEGORIES,
  type CropCategory,
  type Harvest,
  type HarvestPreset,
  type Plot,
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

type HarvestUnit = Harvest["unit"];
type ConservationMethod = NonNullable<Harvest["conservationMethod"]>;

const HARVEST_UNITS: HarvestUnit[] = [
  "load",
  "square_bale",
  "round_bale",
  "crate",
  "total_amount",
  "other",
];

const CONSERVATION_METHODS: ConservationMethod[] = [
  "dried",
  "silage",
  "haylage",
  "other",
  "none",
];

const STEPS = [
  "crop",
  "config",
  "quantity",
  "plots",
  "divide",
  "summary",
] as const;
type WizardStep = (typeof STEPS)[number];

const searchSchema = z.object({
  plotId: z.string().optional(),
  returnTo: z.string().optional(),
});

export const Route = createFileRoute("/_authed/field-calendar/harvests_/create")({
  validateSearch: searchSchema,
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(plotsQueryOptions());
    queryClient.ensureQueryData(cropsQueryOptions());
    queryClient.ensureQueryData(cropFamiliesQueryOptions());
    queryClient.ensureQueryData(harvestPresetsQueryOptions());
  },
  component: CreateHarvest,
});

type FormData = {
  plotIds: string[];
  cropId: string;
  date: string;
  unit: HarvestUnit;
  kilosPerUnit: string;
  numberOfUnits: string;
  conservationMethod: ConservationMethod | "";
  additionalNotes: string;
};

type CropModalFormData = {
  name: string;
  category: CropCategory;
  variety: string;
  familyId: string;
  waitingTimeInYears: string;
  additionalNotes: string;
};

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function CreateHarvest() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { plotId: defaultPlotId, returnTo } = Route.useSearch();

  // Return to the plot's harvest list when the wizard was opened from a plot,
  // otherwise to the global harvest overview.
  const backSearch = defaultPlotId
    ? { plotId: defaultPlotId, ...(returnTo ? { returnTo } : {}) }
    : {};
  function goToOverview() {
    navigate({ to: "/field-calendar/harvests", search: backSearch });
  }

  const [step, setStep] = useState<WizardStep>("crop");
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [savePresetOpen, setSavePresetOpen] = useState(false);
  const [managePresetsOpen, setManagePresetsOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [createCropOpen, setCreateCropOpen] = useState(false);
  const [unitsByPlot, setUnitsByPlot] = useState<Record<string, string>>({});
  const [divideByArea, setDivideByArea] = useState(true);

  const plotsQuery = useQuery(plotsQueryOptions());
  const cropsQuery = useQuery(cropsQueryOptions());
  const presetsQuery = useQuery(harvestPresetsQueryOptions());
  const familiesQuery = useQuery(cropFamiliesQueryOptions());

  const { register, setValue, watch, getValues } = useForm<FormData>({
    defaultValues: {
      plotIds: defaultPlotId ? [defaultPlotId] : [],
      cropId: "",
      date: new Date().toISOString().slice(0, 10),
      unit: "load",
      kilosPerUnit: "",
      numberOfUnits: "1",
      conservationMethod: "",
      additionalNotes: "",
    },
  });

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

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const selectedPlots = data.plotIds
        .map((plotId) => plots.find((p) => p.id === plotId))
        .filter((p): p is Plot => p != null);
      if (selectedPlots.length === 0) throw new Error("Plot not found");

      const kilosPerUnit = parseFloat(data.kilosPerUnit) || 0;
      const numberOfUnits = parseFloat(data.numberOfUnits) || 0;
      const multi = selectedPlots.length > 1;

      const response = await apiClient.POST("/v1/harvests/batch", {
        body: {
          date: new Date(data.date).toISOString(),
          cropId: data.cropId,
          unit: data.unit,
          kilosPerUnit,
          conservationMethod: data.conservationMethod || undefined,
          additionalNotes: data.additionalNotes || undefined,
          // The divide step works in kilograms; convert each plot's kg back to a
          // unit count for the API.
          plots: selectedPlots.map((plot) => {
            if (!multi) {
              return {
                plotId: plot.id,
                numberOfUnits,
                geometry: plot.geometry,
                size: plot.size,
              };
            }
            const plotKilos = parseFloat(unitsByPlot[plot.id] ?? "") || 0;
            return {
              plotId: plot.id,
              numberOfUnits: kilosPerUnit > 0 ? plotKilos / kilosPerUnit : 0,
              geometry: plot.geometry,
              size: plot.size,
            };
          }),
        },
      });
      if (response.error) throw new Error("Failed to create harvest");
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["harvests"] });
      queryClient.invalidateQueries({ queryKey: ["plots"] });
      goToOverview();
    },
  });

  const createPresetMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiClient.POST("/v1/harvests/presets", {
        body: {
          name,
          unit: watch("unit"),
          kilosPerUnit: parseFloat(watch("kilosPerUnit")) || 0,
          conservationMethod: watch("conservationMethod") || undefined,
        },
      });
      if (response.error) throw new Error("Failed to create harvest preset");
      return response.data.data;
    },
    onSuccess: (preset: HarvestPreset) => {
      queryClient.invalidateQueries({ queryKey: ["harvests", "presets"] });
      setSelectedPresetId(preset.id);
      setNewPresetName("");
      setSavePresetOpen(false);
    },
  });

  const deletePresetMutation = useMutation({
    mutationFn: async (presetId: string) => {
      const response = await apiClient.DELETE(
        "/v1/harvests/presets/byId/{presetId}",
        { params: { path: { presetId } } },
      );
      if (response.error) throw new Error("Failed to delete harvest preset");
    },
    onSuccess: (_data, deletedPresetId) => {
      queryClient.invalidateQueries({ queryKey: ["harvests", "presets"] });
      if (selectedPresetId === deletedPresetId) setSelectedPresetId(null);
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
      setValue("cropId", newCrop.id);
      setCreateCropOpen(false);
      cropForm.reset();
    },
  });

  const plots = plotsQuery.data?.result ?? [];
  const crops = cropsQuery.data?.result ?? [];
  const presets = presetsQuery.data?.result ?? [];
  const families = familiesQuery.data?.result ?? [];

  const watchedPlotIds = watch("plotIds");
  const watchedCropId = watch("cropId");
  const watchedDate = watch("date");
  const watchedUnit = watch("unit");
  const watchedConservation = watch("conservationMethod");
  const watchedKilosPerUnit = watch("kilosPerUnit");
  const watchedNumberOfUnits = watch("numberOfUnits");
  const watchedNotes = watch("additionalNotes");

  const plotIdsKey = watchedPlotIds.join(",");
  useEffect(() => {
    setDivideByArea(true);
  }, [plotIdsKey]);

  const selectedCrop = crops.find((c) => c.id === watchedCropId);
  const selectedPlots = watchedPlotIds
    .map((plotId) => plots.find((p) => p.id === plotId))
    .filter((p): p is Plot => p != null);
  const isMultiPlot = selectedPlots.length > 1;
  const isFixedAmountUnit = watchedUnit === "total_amount";

  const totalKilos =
    (parseFloat(watchedKilosPerUnit) || 0) * (parseFloat(watchedNumberOfUnits) || 0);
  const roundedTotal = round2(totalKilos);
  const divideInvalid =
    isMultiPlot &&
    Math.abs(sumDivided(unitsByPlot, watchedPlotIds) - roundedTotal) > 0.01;

  const steps = STEPS.filter((s) => {
    if (s === "quantity") return !isFixedAmountUnit;
    if (s === "divide") return isMultiPlot;
    return true;
  });
  const activeStep = steps.includes(step)
    ? step
    : ([...steps]
        .reverse()
        .find((s) => STEPS.indexOf(s) <= STEPS.indexOf(step)) ?? steps[0]);
  const stepIndex = steps.indexOf(activeStep);

  function stepValid(s: WizardStep): boolean {
    switch (s) {
      case "crop":
        return !!watchedCropId && !!watchedDate;
      case "config":
        return (
          watchedKilosPerUnit.trim() !== "" &&
          !Number.isNaN(parseFloat(watchedKilosPerUnit))
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
    setValue("unit", preset.unit);
    setValue("kilosPerUnit", preset.kilosPerUnit.toString());
    setValue("conservationMethod", preset.conservationMethod ?? "");
  }

  const kilosPerUnitLabel =
    watchedUnit === "total_amount"
      ? `${t("fieldCalendar.harvests.units.total_amount")} (kg)`
      : `kg / ${t(`fieldCalendar.harvests.units.${watchedUnit}`)}`;

  return (
    <PageContent
      title={t("fieldCalendar.harvests.create")}
      showBackButton
      backTo={goToOverview}
    >
      <div className="max-w-lg space-y-6">
        <WizardProgress
          stepIndex={stepIndex}
          total={steps.length}
          label={t(`fieldCalendar.harvests.wizard.steps.${activeStep}`)}
        />

        {/* Step: crop + date */}
        {activeStep === "crop" && (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>{t("fieldCalendar.harvests.crop")}</Label>
              <div className="flex gap-1">
                <div className="min-w-0 flex-1">
                  <Select
                    value={watchedCropId}
                    onValueChange={(v) => {
                      if (v) setValue("cropId", v);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={t("fieldCalendar.cropRotations.selectCrop")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {crops.map((crop) => (
                        <SelectItem key={crop.id} value={crop.id}>
                          {crop.name}
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
                  <PlusIcon className="size-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t("fieldCalendar.harvests.date")}</Label>
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
                  <Label>{kilosPerUnitLabel}</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.1"
                    {...register("kilosPerUnit", { required: true })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("fieldCalendar.harvests.unit")}</Label>
                  <Select
                    value={watchedUnit}
                    onValueChange={(v) => setValue("unit", v as HarvestUnit)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HARVEST_UNITS.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {t(`fieldCalendar.harvests.units.${unit}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label>{t("fieldCalendar.harvests.conservationMethod")}</Label>
                <Select
                  value={watchedConservation}
                  onValueChange={(v) =>
                    setValue("conservationMethod", v as ConservationMethod | "")
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("common.noSelection")} />
                  </SelectTrigger>
                  <SelectContent>
                    {CONSERVATION_METHODS.map((method) => (
                      <SelectItem key={method} value={method}>
                        {t(`fieldCalendar.harvests.conservationMethods.${method}`)}
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
              {t("fieldCalendar.harvests.numberOfUnitsWith", {
                unit: t(`fieldCalendar.harvests.units.${watchedUnit}`),
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
            totalUnits={totalKilos}
            unitLabel="kg"
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
                label={t("fieldCalendar.harvests.crop")}
                value={selectedCrop?.name ?? "-"}
              />
              <SummaryRow
                label={t("fieldCalendar.harvests.date")}
                value={new Date(watchedDate).toLocaleDateString()}
              />
              <SummaryRow
                label={t("fieldCalendar.harvests.unit")}
                value={t(`fieldCalendar.harvests.units.${watchedUnit}`)}
              />
              {watchedConservation && (
                <SummaryRow
                  label={t("fieldCalendar.harvests.conservationMethod")}
                  value={t(
                    `fieldCalendar.harvests.conservationMethods.${watchedConservation}`,
                  )}
                />
              )}
              <SummaryRow
                label={kilosPerUnitLabel}
                value={`${watchedKilosPerUnit || 0} kg`}
              />
              {!isFixedAmountUnit && (
                <SummaryRow
                  label={t("fieldCalendar.harvests.numberOfUnitsWith", {
                    unit: t(`fieldCalendar.harvests.units.${watchedUnit}`),
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
                            {unitsByPlot[plot.id] ?? "0"} kg
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

      {/* Inline create crop dialog */}
      <Dialog
        open={createCropOpen}
        onOpenChange={(open) => {
          setCreateCropOpen(open);
          if (!open) cropForm.reset();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("crops.createCrop")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>{t("crops.name")} *</Label>
              <Input {...cropForm.register("name", { required: true })} />
            </div>
            <div className="space-y-1">
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
            <div className="space-y-1">
              <Label>{t("crops.variety")}</Label>
              <Input {...cropForm.register("variety")} />
            </div>
            <div className="space-y-1">
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
            <div className="space-y-1">
              <Label>{t("crops.waitingTimeInYears")}</Label>
              <Input
                type="number"
                min="0"
                {...cropForm.register("waitingTimeInYears")}
              />
            </div>
            <div className="space-y-1">
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
