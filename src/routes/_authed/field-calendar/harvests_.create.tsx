import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { apiClient } from "@/api/client";
import { cropsQueryOptions } from "@/api/crops.queries";
import { plotsQueryOptions } from "@/api/plots.queries";
import type { Harvest } from "@/api/types";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
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

function CreateHarvest() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { plotId: defaultPlotId } = Route.useSearch();

  const plotsQuery = useQuery(plotsQueryOptions());
  const cropsQuery = useQuery(cropsQueryOptions());

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
          harvestCount: data.harvestCount ? parseInt(data.harvestCount) : undefined,
          conservationMethod: data.conservationMethod || undefined,
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

  const plots = plotsQuery.data?.result ?? [];
  const crops = cropsQuery.data?.result ?? [];
  const watchedPlotId = watch("plotId");
  const watchedCropId = watch("cropId");
  const watchedUnit = watch("unit");
  const watchedConservation = watch("conservationMethod");

  return (
    <PageContent title={t("fieldCalendar.harvests.create")} showBackButton backTo={() => navigate({ to: "/field-calendar/harvests" })}>
      <form
        onSubmit={handleSubmit((data) => createMutation.mutate(data))}
        className="space-y-4 max-w-lg"
      >
        <div className="space-y-1">
          <Label>{t("fieldCalendar.plots.plot")}</Label>
          <Select
            value={watchedPlotId}
            onValueChange={(v) => setValue("plotId", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("fieldCalendar.plots.selectPlot")} />
            </SelectTrigger>
            <SelectContent>
              {plots.map((plot) => (
                <SelectItem key={plot.id} value={plot.id}>
                  {plot.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>{t("fieldCalendar.harvests.crop")}</Label>
          <Select
            value={watchedCropId}
            onValueChange={(v) => setValue("cropId", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("fieldCalendar.cropRotations.selectCrop")} />
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

        <div className="space-y-1">
          <Label>{t("fieldCalendar.harvests.date")}</Label>
          <Input type="date" {...register("date", { required: true })} />
        </div>

        <div className="grid grid-cols-2 gap-4">
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

          <div className="space-y-1">
            <Label>{t("fieldCalendar.harvests.numberOfUnits")}</Label>
            <Input
              type="number"
              min={1}
              {...register("numberOfUnits", { required: true })}
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label>{t("fieldCalendar.harvests.kilosPerUnit")}</Label>
          <Input
            type="number"
            min={0}
            step="0.1"
            {...register("kilosPerUnit", { required: true })}
          />
        </div>

        <div className="space-y-1">
          <Label>{t("fieldCalendar.harvests.conservationMethod")}</Label>
          <Select
            value={watchedConservation}
            onValueChange={(v) => setValue("conservationMethod", v as ConservationMethod | "")}
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
    </PageContent>
  );
}
