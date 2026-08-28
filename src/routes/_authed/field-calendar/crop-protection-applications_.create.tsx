import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { apiClient } from "@/api/client";
import { cropProtectionApplicationPresetsQueryOptions } from "@/api/cropProtectionApplications.queries";
import { cropProtectionProductsQueryOptions } from "@/api/cropProtectionProducts.queries";
import { plotsQueryOptions } from "@/api/plots.queries";
import type {
  CropProtectionApplication,
  CropProtectionApplicationPreset,
  FertilizerApplication,
  Plot,
} from "@/api/types";
import {
  CROP_PROTECTION_PRODUCT_UNITS,
  type CropProtectionProductUnit,
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

type CropProtectionMethod = NonNullable<CropProtectionApplication["method"]>;
// Reuse the unit type from fertilizer since they share the same enum.
type ApplicationUnit = FertilizerApplication["unit"];

const CROP_PROTECTION_METHODS: CropProtectionMethod[] = [
  "spraying",
  "misting",
  "broadcasting",
  "injecting",
  "other",
];

const APPLICATION_UNITS: ApplicationUnit[] = [
  "load",
  "bag",
  "total_amount",
  "amount_per_hectare",
  "other",
];

const ALL_STEPS = [
  "product",
  "config",
  "quantity",
  "plots",
  "divide",
  "summary",
] as const;
type WizardStep = (typeof ALL_STEPS)[number];

const searchSchema = z.object({
  plotId: z.string().optional(),
});

export const Route = createFileRoute(
  "/_authed/field-calendar/crop-protection-applications_/create",
)({
  validateSearch: searchSchema,
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(plotsQueryOptions());
    queryClient.ensureQueryData(cropProtectionProductsQueryOptions());
    queryClient.ensureQueryData(cropProtectionApplicationPresetsQueryOptions());
  },
  component: CreateCropProtectionApplication,
});

type FormData = {
  plotIds: string[];
  productId: string;
  dateTime: string;
  method: CropProtectionMethod;
  unit: ApplicationUnit;
  amountPerUnit: string;
  numberOfUnits: string;
  additionalNotes: string;
};

type ProductModalFormData = {
  name: string;
  unit: CropProtectionProductUnit;
  description: string;
};

function CreateCropProtectionApplication() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { plotId: defaultPlotId } = Route.useSearch();

  const [step, setStep] = useState<WizardStep>("product");
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [savePresetOpen, setSavePresetOpen] = useState(false);
  const [managePresetsOpen, setManagePresetsOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [createProductOpen, setCreateProductOpen] = useState(false);
  // Per-plot amount split (used only when more than one plot is selected).
  const [unitsByPlot, setUnitsByPlot] = useState<Record<string, string>>({});
  const [divideByArea, setDivideByArea] = useState(true);

  const plotsQuery = useQuery(plotsQueryOptions());
  const productsQuery = useQuery(cropProtectionProductsQueryOptions());
  const presetsQuery = useQuery(cropProtectionApplicationPresetsQueryOptions());

  const { register, setValue, watch, getValues } = useForm<FormData>({
    defaultValues: {
      plotIds: defaultPlotId ? [defaultPlotId] : [],
      productId: "",
      dateTime: new Date().toISOString().slice(0, 16),
      method: "spraying",
      unit: "load",
      amountPerUnit: "",
      numberOfUnits: "1",
      additionalNotes: "",
    },
  });

  const productForm = useForm<ProductModalFormData>({
    defaultValues: { name: "", unit: "ml", description: "" },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const selectedPlotsForSubmit = data.plotIds
        .map((plotId) => plots.find((p) => p.id === plotId))
        .filter((p): p is Plot => p != null);
      if (selectedPlotsForSubmit.length === 0) throw new Error("Plot not found");

      const amountPerUnit = parseFloat(data.amountPerUnit) || 0;
      const numberOfUnits = parseFloat(data.numberOfUnits) || 0;
      const multi = selectedPlotsForSubmit.length > 1;

      const response = await apiClient.POST(
        "/v1/cropProtectionApplications/batch",
        {
          body: {
            dateTime: new Date(data.dateTime).toISOString(),
            productId: data.productId,
            method: data.method,
            unit: data.unit,
            amountPerUnit,
            additionalNotes: data.additionalNotes || undefined,
            // The divide step works in total-amount space (amountPerUnit ×
            // numberOfUnits); convert each plot's amount back to a unit count.
            plots: selectedPlotsForSubmit.map((plot) => {
              if (!multi) {
                return {
                  plotId: plot.id,
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
        },
      );
      if (response.error) {
        throw new Error("Failed to create crop protection application");
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["cropProtectionApplications"],
      });
      queryClient.invalidateQueries({ queryKey: ["plots"] });
      navigate({ to: "/field-calendar/crop-protection-applications" });
    },
  });

  const createPresetMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiClient.POST(
        "/v1/cropProtectionApplications/presets",
        {
          body: {
            name,
            method: watchedMethod,
            unit: watchedUnit,
            amountPerUnit: parseFloat(watchedAmountPerUnit) || 0,
          },
        },
      );
      if (response.error) {
        throw new Error("Failed to create crop protection preset");
      }
      return response.data.data;
    },
    onSuccess: (preset: CropProtectionApplicationPreset) => {
      queryClient.invalidateQueries({
        queryKey: ["cropProtectionApplications", "presets"],
      });
      setSelectedPresetId(preset.id);
      setNewPresetName("");
      setSavePresetOpen(false);
    },
  });

  const deletePresetMutation = useMutation({
    mutationFn: async (presetId: string) => {
      const response = await apiClient.DELETE(
        "/v1/cropProtectionApplications/presets/byId/{presetId}",
        { params: { path: { presetId } } },
      );
      if (response.error) {
        throw new Error("Failed to delete crop protection preset");
      }
    },
    onSuccess: (_data, deletedPresetId) => {
      queryClient.invalidateQueries({
        queryKey: ["cropProtectionApplications", "presets"],
      });
      if (selectedPresetId === deletedPresetId) {
        setSelectedPresetId(null);
      }
    },
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: ProductModalFormData) => {
      const response = await apiClient.POST("/v1/cropProtectionProducts", {
        body: {
          name: data.name,
          unit: data.unit,
          description: data.description || undefined,
        },
      });
      if (response.error)
        throw new Error("Failed to create crop protection product");
      return response.data.data;
    },
    onSuccess: (newProduct) => {
      queryClient.setQueryData(
        cropProtectionProductsQueryOptions().queryKey,
        (old) => {
          if (!old) return old;
          return { ...old, result: [...old.result, newProduct] };
        },
      );
      queryClient.invalidateQueries({ queryKey: ["cropProtectionProducts"] });
      setValue("productId", newProduct.id);
      setCreateProductOpen(false);
      productForm.reset();
    },
  });

  const plots = plotsQuery.data?.result ?? [];
  const products = productsQuery.data?.result ?? [];
  const presets = presetsQuery.data?.result ?? [];

  const watchedPlotIds = watch("plotIds");
  const watchedProductId = watch("productId");
  const watchedDateTime = watch("dateTime");
  const watchedMethod = watch("method");
  const watchedUnit = watch("unit");
  const watchedAmountPerUnit = watch("amountPerUnit");
  const watchedNumberOfUnits = watch("numberOfUnits");
  const watchedNotes = watch("additionalNotes");

  // Re-enable "split by plot size" whenever the selected plots change, so the
  // divide step always starts from a fresh proportional split.
  const plotIdsKey = watchedPlotIds.join(",");
  useEffect(() => {
    setDivideByArea(true);
  }, [plotIdsKey]);

  const selectedProduct = products.find((p) => p.id === watchedProductId);
  const productUnitLabel = selectedProduct?.unit ?? "";

  const selectedPlots = watchedPlotIds
    .map((plotId) => plots.find((p) => p.id === plotId))
    .filter((p): p is Plot => p != null);
  const isMultiPlot = selectedPlots.length > 1;

  // total_amount and amount_per_hectare carry a fixed amount, so the number of
  // units is always 1 and the quantity step is skipped.
  const isFixedAmountUnit =
    watchedUnit === "total_amount" || watchedUnit === "amount_per_hectare";

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
  const activeStep = steps.includes(step)
    ? step
    : ([...steps]
        .reverse()
        .find((s) => ALL_STEPS.indexOf(s) <= ALL_STEPS.indexOf(step)) ??
      steps[0]);
  const stepIndex = steps.indexOf(activeStep);

  function stepValid(s: WizardStep): boolean {
    switch (s) {
      case "product":
        return !!watchedProductId && !!watchedDateTime;
      case "config":
        return (
          watchedAmountPerUnit.trim() !== "" &&
          !Number.isNaN(parseFloat(watchedAmountPerUnit))
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
    setValue("method", preset.method ?? "spraying");
    setValue("unit", preset.unit);
    setValue("amountPerUnit", preset.amountPerUnit.toString());
  }

  // Label for the "amount per unit" input, matching the RN app: "l / Fuder",
  // "Gesamtmenge (l)" for total_amount, "l / ha" for amount_per_hectare.
  const amountPerUnitLabel =
    watchedUnit === "total_amount"
      ? `${t("fieldCalendar.fertilizerApplications.units.total_amount")} (${productUnitLabel || "l"})`
      : watchedUnit === "amount_per_hectare"
        ? `${productUnitLabel || "l"} / ha`
        : `${productUnitLabel || "l"} / ${t(`fieldCalendar.fertilizerApplications.units.${watchedUnit}`)}`;

  return (
    <PageContent
      title={t("fieldCalendar.cropProtectionApplications.create")}
      showBackButton
      backTo={() =>
        navigate({ to: "/field-calendar/crop-protection-applications" })
      }
    >
      <div className="max-w-lg space-y-6">
        <WizardProgress
          stepIndex={stepIndex}
          total={steps.length}
          label={t(
            `fieldCalendar.cropProtectionApplications.wizard.steps.${activeStep}`,
          )}
        />

        {/* Step: product + date */}
        {activeStep === "product" && (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>
                {t("fieldCalendar.cropProtectionApplications.product")}
              </Label>
              <div className="flex gap-1">
                <div className="min-w-0 flex-1">
                  <Select
                    value={watchedProductId}
                    onValueChange={(v) => {
                      if (v) setValue("productId", v);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={t(
                          "fieldCalendar.cropProtectionApplications.selectProduct",
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setCreateProductOpen(true)}
                >
                  <PlusIcon className="size-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label>
                {t("fieldCalendar.cropProtectionApplications.date")}
              </Label>
              <Input
                type="datetime-local"
                {...register("dateTime", { required: true })}
              />
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
                      <SelectValue
                        placeholder={t("fieldCalendar.presets.select")}
                      />
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
                  <Label>
                    {t("fieldCalendar.fertilizerApplications.unit")}
                  </Label>
                  <Select
                    value={watchedUnit}
                    onValueChange={(v) =>
                      setValue("unit", v as ApplicationUnit)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {APPLICATION_UNITS.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {t(
                            `fieldCalendar.fertilizerApplications.units.${unit}`,
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label>
                  {t("fieldCalendar.cropProtectionApplications.method")}
                </Label>
                <Select
                  value={watchedMethod}
                  onValueChange={(v) =>
                    setValue("method", v as CropProtectionMethod)
                  }
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t(
                        "fieldCalendar.fertilizerApplications.selectMethod",
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {CROP_PROTECTION_METHODS.map((method) => (
                      <SelectItem key={method} value={method}>
                        {t(
                          `fieldCalendar.cropProtectionApplications.methods.${method}`,
                        )}
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
              {t("fieldCalendar.fertilizerApplications.numberOfUnitsWith", {
                unit: t(
                  `fieldCalendar.fertilizerApplications.units.${watchedUnit}`,
                ),
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
            unitLabel={productUnitLabel}
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
                label={t("fieldCalendar.cropProtectionApplications.product")}
                value={selectedProduct?.name ?? "-"}
              />
              <SummaryRow
                label={t("fieldCalendar.cropProtectionApplications.date")}
                value={new Date(watchedDateTime).toLocaleString()}
              />
              <SummaryRow
                label={t("fieldCalendar.fertilizerApplications.unit")}
                value={t(
                  `fieldCalendar.fertilizerApplications.units.${watchedUnit}`,
                )}
              />
              <SummaryRow
                label={t("fieldCalendar.cropProtectionApplications.method")}
                value={t(
                  `fieldCalendar.cropProtectionApplications.methods.${watchedMethod}`,
                )}
              />
              <SummaryRow
                label={amountPerUnitLabel}
                value={`${watchedAmountPerUnit || 0} ${productUnitLabel}`}
              />
              {!isFixedAmountUnit && (
                <SummaryRow
                  label={t(
                    "fieldCalendar.fertilizerApplications.numberOfUnitsWith",
                    {
                      unit: t(
                        `fieldCalendar.fertilizerApplications.units.${watchedUnit}`,
                      ),
                    },
                  )}
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
                            {unitsByPlot[plot.id] ?? "0"} {productUnitLabel}
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
          onCancel={() =>
            navigate({ to: "/field-calendar/crop-protection-applications" })
          }
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
            <Button
              variant="outline"
              onClick={() => setManagePresetsOpen(false)}
            >
              {t("common.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inline create product dialog */}
      <Dialog
        open={createProductOpen}
        onOpenChange={(open) => {
          setCreateProductOpen(open);
          if (!open) productForm.reset();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("cropProtectionProducts.createProduct")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>{t("cropProtectionProducts.name")} *</Label>
              <Input {...productForm.register("name", { required: true })} />
            </div>
            <div className="space-y-1">
              <Label>{t("cropProtectionProducts.unit")} *</Label>
              <Select
                value={productForm.watch("unit")}
                onValueChange={(v) =>
                  productForm.setValue("unit", v as CropProtectionProductUnit)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CROP_PROTECTION_PRODUCT_UNITS.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t("cropProtectionProducts.description")}</Label>
              <Textarea {...productForm.register("description")} />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateProductOpen(false);
                productForm.reset();
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={productForm.handleSubmit((data) =>
                createProductMutation.mutate(data),
              )}
              disabled={createProductMutation.isPending}
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
