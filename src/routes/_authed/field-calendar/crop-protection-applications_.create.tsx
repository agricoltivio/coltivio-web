import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
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
} from "@/api/types";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
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
// Reuse the unit type from fertilizer since they share the same enum
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
  plotId: string;
  productId: string;
  dateTime: string;
  method: CropProtectionMethod;
  unit: ApplicationUnit;
  amountPerUnit: string;
  numberOfUnits: string;
  additionalNotes: string;
};

type PlotOption = { value: string; label: string };

function CreateCropProtectionApplication() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { plotId: defaultPlotId } = Route.useSearch();

  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [savePresetOpen, setSavePresetOpen] = useState(false);
  const [managePresetsOpen, setManagePresetsOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");

  const plotsQuery = useQuery(plotsQueryOptions());
  const productsQuery = useQuery(cropProtectionProductsQueryOptions());
  const presetsQuery = useQuery(cropProtectionApplicationPresetsQueryOptions());

  const { register, handleSubmit, setValue, watch } = useForm<FormData>({
    defaultValues: {
      plotId: defaultPlotId ?? "",
      productId: "",
      dateTime: new Date().toISOString().slice(0, 16),
      method: "spraying",
      unit: "total_amount",
      amountPerUnit: "0",
      numberOfUnits: "1",
      additionalNotes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const plot = plots.find((p) => p.id === data.plotId);
      if (!plot) throw new Error("Plot not found");

      const response = await apiClient.POST(
        "/v1/cropProtectionApplications/batch",
        {
          body: {
            dateTime: new Date(data.dateTime).toISOString(),
            productId: data.productId,
            method: data.method,
            unit: data.unit,
            amountPerUnit: parseFloat(data.amountPerUnit),
            additionalNotes: data.additionalNotes || undefined,
            plots: [
              {
                plotId: data.plotId,
                numberOfUnits: parseInt(data.numberOfUnits),
                geometry: plot.geometry,
                size: plot.size,
              },
            ],
          },
        },
      );
      if (response.error) {
        throw new Error("Failed to create crop protection application");
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cropProtectionApplications"] });
      navigate({ to: "/field-calendar/crop-protection-applications" });
    },
  });

  const createPresetMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiClient.POST("/v1/cropProtectionApplications/presets", {
        body: {
          name,
          method: watchedMethod,
          unit: watchedUnit,
          amountPerUnit: parseFloat(watchedAmountPerUnit),
        },
      });
      if (response.error) {
        throw new Error("Failed to create crop protection preset");
      }
      return response.data.data;
    },
    onSuccess: (preset: CropProtectionApplicationPreset) => {
      queryClient.invalidateQueries({ queryKey: ["cropProtectionApplications", "presets"] });
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
      queryClient.invalidateQueries({ queryKey: ["cropProtectionApplications", "presets"] });
      if (selectedPresetId === deletedPresetId) {
        setSelectedPresetId(null);
      }
    },
  });

  const plots = plotsQuery.data?.result ?? [];
  const products = productsQuery.data?.result ?? [];
  const presets = presetsQuery.data?.result ?? [];

  const watchedPlotId = watch("plotId");
  const watchedProductId = watch("productId");
  const watchedMethod = watch("method");
  const watchedUnit = watch("unit");
  const watchedAmountPerUnit = watch("amountPerUnit");

  const plotOptions: PlotOption[] = plots.map((p) => ({ value: p.id, label: p.name }));

  function applyPreset(presetId: string) {
    const preset = presets.find((p) => p.id === presetId);
    if (!preset) return;
    setSelectedPresetId(presetId);
    setValue("method", preset.method ?? "spraying");
    setValue("unit", preset.unit);
    setValue("amountPerUnit", preset.amountPerUnit.toString());
  }

  return (
    <PageContent
      title={t("fieldCalendar.cropProtectionApplications.create")}
      showBackButton
      backTo={() =>
        navigate({ to: "/field-calendar/crop-protection-applications" })
      }
    >
      <form
        onSubmit={handleSubmit((data) => createMutation.mutate(data))}
        className="space-y-4 max-w-lg"
      >
        {/* Plot + Product on same line, wrap if tight */}
        <div className="flex flex-wrap gap-4">
          <div className="space-y-1 flex-1 min-w-[180px]">
            <Label>{t("fieldCalendar.plots.plot")}</Label>
            <Combobox
              items={plotOptions}
              itemToStringValue={(item: PlotOption) => item.label}
              value={plotOptions.find((o) => o.value === watchedPlotId) ?? null}
              onValueChange={(item: PlotOption | null) =>
                setValue("plotId", item?.value ?? "")
              }
            >
              <ComboboxInput
                placeholder={t("fieldCalendar.plots.selectPlot")}
                showClear={!!watchedPlotId}
              />
              <ComboboxContent>
                <ComboboxEmpty>{t("common.noResults")}</ComboboxEmpty>
                <ComboboxList>
                  {(option: PlotOption) => (
                    <ComboboxItem key={option.value} value={option}>
                      {option.label}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>

          <div className="space-y-1 flex-1 min-w-[180px]">
            <Label>{t("fieldCalendar.cropProtectionApplications.product")}</Label>
            <Select
              value={watchedProductId}
              onValueChange={(v) => setValue("productId", v)}
            >
              <SelectTrigger>
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
        </div>

        {/* Preset card */}
        <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
          {/* Preset selector row */}
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label>{t("fieldCalendar.presets.select")}</Label>
              <Select
                value={selectedPresetId ?? ""}
                onValueChange={(v) => applyPreset(v)}
              >
                <SelectTrigger>
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

          {/* Method */}
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
                <SelectValue />
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

          {/* Unit */}
          <div className="space-y-1">
            <Label>{t("fieldCalendar.fertilizerApplications.unit")}</Label>
            <Select
              value={watchedUnit}
              onValueChange={(v) => setValue("unit", v as ApplicationUnit)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APPLICATION_UNITS.map((unit) => (
                  <SelectItem key={unit} value={unit}>
                    {t(`fieldCalendar.fertilizerApplications.units.${unit}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount per unit */}
          <div className="space-y-1">
            <Label>
              {t("fieldCalendar.fertilizerApplications.amountPerUnit")}
            </Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              {...register("amountPerUnit", { required: true })}
            />
          </div>

          {/* Save as preset button */}
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

        {/* Date + numberOfUnits on same line */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>{t("fieldCalendar.cropProtectionApplications.date")}</Label>
            <Input
              type="datetime-local"
              {...register("dateTime", { required: true })}
            />
          </div>
          <div className="space-y-1">
            <Label>{t("fieldCalendar.harvests.numberOfUnits")}</Label>
            <Input
              type="number"
              min={1}
              {...register("numberOfUnits", { required: true })}
            />
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1">
          <Label>{t("fieldCalendar.tillages.notes")}</Label>
          <Textarea {...register("additionalNotes")} rows={3} />
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={createMutation.isPending}>
            {t("common.save")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              navigate({ to: "/field-calendar/crop-protection-applications" })
            }
          >
            {t("common.cancel")}
          </Button>
        </div>
      </form>

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
    </PageContent>
  );
}
