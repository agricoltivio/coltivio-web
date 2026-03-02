import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { apiClient } from "@/api/client";
import { cropsQueryOptions } from "@/api/crops.queries";
import { harvestPresetsQueryOptions } from "@/api/harvests.queries";
import { plotsQueryOptions } from "@/api/plots.queries";
import type { Harvest, HarvestPreset } from "@/api/types";
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

const searchSchema = z.object({
  plotId: z.string().optional(),
});

export const Route = createFileRoute(
  "/_authed/field-calendar/harvests_/create",
)({
  validateSearch: searchSchema,
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(plotsQueryOptions());
    queryClient.ensureQueryData(cropsQueryOptions());
    queryClient.ensureQueryData(harvestPresetsQueryOptions());
  },
  component: CreateHarvest,
});

type FormData = {
  plotId: string;
  cropId: string;
  date: string;
  unit: HarvestUnit;
  kilosPerUnit: string;
  numberOfUnits: string;
  harvestCount: string;
  conservationMethod: ConservationMethod | "";
  additionalNotes: string;
};

type PlotOption = { value: string; label: string };

function CreateHarvest() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { plotId: defaultPlotId } = Route.useSearch();

  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [savePresetOpen, setSavePresetOpen] = useState(false);
  const [managePresetsOpen, setManagePresetsOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");

  const plotsQuery = useQuery(plotsQueryOptions());
  const cropsQuery = useQuery(cropsQueryOptions());
  const presetsQuery = useQuery(harvestPresetsQueryOptions());

  const { register, handleSubmit, setValue, watch } = useForm<FormData>({
    defaultValues: {
      plotId: defaultPlotId ?? "",
      cropId: "",
      date: new Date().toISOString().slice(0, 10),
      unit: "load",
      kilosPerUnit: "0",
      numberOfUnits: "1",
      harvestCount: "",
      conservationMethod: "",
      additionalNotes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const plot = plots.find((p) => p.id === data.plotId);
      if (!plot) throw new Error("Plot not found");

      const response = await apiClient.POST("/v1/harvests/batch", {
        body: {
          date: new Date(data.date).toISOString(),
          cropId: data.cropId,
          unit: data.unit,
          kilosPerUnit: parseFloat(data.kilosPerUnit),
          harvestCount: data.harvestCount
            ? parseInt(data.harvestCount)
            : undefined,
          conservationMethod: data.conservationMethod || undefined,
          additionalNotes: data.additionalNotes || undefined,
          plots: [
            {
              plotId: data.plotId,
              numberOfUnits: parseFloat(data.numberOfUnits),
              geometry: plot.geometry,
              size: plot.size,
            },
          ],
        },
      });
      if (response.error) {
        throw new Error("Failed to create harvest");
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["harvests"] });
      queryClient.invalidateQueries({ queryKey: ["plots"] });
      navigate({ to: "/field-calendar/harvests" });
    },
  });

  const createPresetMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiClient.POST("/v1/harvests/presets", {
        body: {
          name,
          unit: watchedUnit,
          kilosPerUnit: parseFloat(watchedKilosPerUnit),
          conservationMethod: watchedConservation || undefined,
        },
      });
      if (response.error) {
        throw new Error("Failed to create harvest preset");
      }
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
      if (response.error) {
        throw new Error("Failed to delete harvest preset");
      }
    },
    onSuccess: (_data, deletedPresetId) => {
      queryClient.invalidateQueries({ queryKey: ["harvests", "presets"] });
      if (selectedPresetId === deletedPresetId) {
        setSelectedPresetId(null);
      }
    },
  });

  const plots = plotsQuery.data?.result ?? [];
  const crops = cropsQuery.data?.result ?? [];
  const presets = presetsQuery.data?.result ?? [];

  const watchedPlotId = watch("plotId");
  const watchedCropId = watch("cropId");
  const watchedUnit = watch("unit");
  const watchedConservation = watch("conservationMethod");
  const watchedKilosPerUnit = watch("kilosPerUnit");

  const plotOptions: PlotOption[] = plots.map((p) => ({
    value: p.id,
    label: `${p.name} - ${p.usage} (${p.size / 100}a) `,
  }));

  function applyPreset(presetId: string) {
    const preset = presets.find((p) => p.id === presetId);
    if (!preset) return;
    setSelectedPresetId(presetId);
    setValue("unit", preset.unit);
    setValue("kilosPerUnit", preset.kilosPerUnit.toString());
    setValue("conservationMethod", preset.conservationMethod ?? "");
  }

  return (
    <PageContent
      title={t("fieldCalendar.harvests.create")}
      showBackButton
      backTo={() => navigate({ to: "/field-calendar/harvests" })}
    >
      <form
        onSubmit={handleSubmit((data) => createMutation.mutate(data))}
        className="space-y-4 max-w-lg"
      >
        {/* Plot + Crop on same line, wrap if tight */}
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
            <Label>{t("fieldCalendar.harvests.crop")}</Label>
            <Select
              value={watchedCropId}
              onValueChange={(v) => setValue("cropId", v)}
            >
              <SelectTrigger>
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

          {/* Unit */}
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

          {/* kg per unit */}
          <div className="space-y-1">
            <Label>{t("fieldCalendar.harvests.kilosPerUnit")}</Label>
            <Input
              type="number"
              min={0}
              step="0.1"
              {...register("kilosPerUnit", { required: true })}
            />
          </div>

          {/* Conservation method */}
          <div className="space-y-1">
            <Label>{t("fieldCalendar.harvests.conservationMethod")}</Label>
            <Select
              value={watchedConservation}
              onValueChange={(v) =>
                setValue("conservationMethod", v as ConservationMethod | "")
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t("common.all")} />
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
            <Label>{t("fieldCalendar.harvests.date")}</Label>
            <Input type="date" {...register("date", { required: true })} />
          </div>
          <div className="space-y-1">
            <Label>{t("fieldCalendar.harvests.numberOfUnits")}</Label>
            <Input
              // type="number"
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
            onClick={() => navigate({ to: "/field-calendar/harvests" })}
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
