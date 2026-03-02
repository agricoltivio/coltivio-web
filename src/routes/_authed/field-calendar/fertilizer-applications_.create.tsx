import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { apiClient } from "@/api/client";
import { fertilizersQueryOptions } from "@/api/fertilizers.queries";
import { plotsQueryOptions } from "@/api/plots.queries";
import type { FertilizerApplication } from "@/api/types";
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

type FertilizerUnit = FertilizerApplication["unit"];
type FertilizerMethod = NonNullable<FertilizerApplication["method"]>;

const FERTILIZER_UNITS: FertilizerUnit[] = [
  "load",
  "bag",
  "total_amount",
  "amount_per_hectare",
  "other",
];

const FERTILIZER_METHODS: FertilizerMethod[] = ["spray", "spread", "other"];

const searchSchema = z.object({
  plotId: z.string().optional(),
});

export const Route = createFileRoute(
  "/_authed/field-calendar/fertilizer-applications_/create",
)({
  validateSearch: searchSchema,
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(plotsQueryOptions());
    queryClient.ensureQueryData(fertilizersQueryOptions());
  },
  component: CreateFertilizerApplication,
});

type FormData = {
  plotId: string;
  fertilizerId: string;
  date: string;
  unit: FertilizerUnit;
  method: FertilizerMethod | "";
  amountPerUnit: string;
  numberOfUnits: string;
  additionalNotes: string;
};

function CreateFertilizerApplication() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { plotId: defaultPlotId } = Route.useSearch();

  const plotsQuery = useQuery(plotsQueryOptions());
  const fertilizersQuery = useQuery(fertilizersQueryOptions());

  const { register, handleSubmit, setValue, watch } = useForm<FormData>({
    defaultValues: {
      plotId: defaultPlotId ?? "",
      fertilizerId: "",
      date: new Date().toISOString().slice(0, 10),
      unit: "total_amount",
      method: "",
      amountPerUnit: "0",
      numberOfUnits: "1",
      additionalNotes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const plot = plots.find((p) => p.id === data.plotId);
      if (!plot) throw new Error("Plot not found");

      const response = await apiClient.POST("/v1/fertilizerApplications", {
        body: {
          date: new Date(data.date).toISOString(),
          fertilizerId: data.fertilizerId,
          unit: data.unit,
          method: data.method || undefined,
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
      });
      if (response.error) {
        throw new Error("Failed to create fertilizer application");
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fertilizerApplications"] });
      queryClient.invalidateQueries({ queryKey: ["plots"] });
      navigate({ to: "/field-calendar/fertilizer-applications" });
    },
  });

  const plots = plotsQuery.data?.result ?? [];
  const fertilizers = fertilizersQuery.data?.result ?? [];
  const watchedPlotId = watch("plotId");
  const watchedFertilizerId = watch("fertilizerId");
  const watchedUnit = watch("unit");
  const watchedMethod = watch("method");

  return (
    <PageContent
      title={t("fieldCalendar.fertilizerApplications.create")}
      showBackButton
      backTo={() => navigate({ to: "/field-calendar/fertilizer-applications" })}
    >
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
          <Label>{t("fieldCalendar.fertilizerApplications.fertilizer")}</Label>
          <Select
            value={watchedFertilizerId}
            onValueChange={(v) => setValue("fertilizerId", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("fieldCalendar.fertilizerApplications.selectFertilizer")} />
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

        <div className="space-y-1">
          <Label>{t("fieldCalendar.fertilizerApplications.date")}</Label>
          <Input type="date" {...register("date", { required: true })} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>{t("fieldCalendar.fertilizerApplications.unit")}</Label>
            <Select
              value={watchedUnit}
              onValueChange={(v) => setValue("unit", v as FertilizerUnit)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FERTILIZER_UNITS.map((unit) => (
                  <SelectItem key={unit} value={unit}>
                    {t(`fieldCalendar.fertilizerApplications.units.${unit}`)}
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
          <Label>{t("fieldCalendar.fertilizerApplications.amountPerUnit")}</Label>
          <Input
            type="number"
            min={0}
            step="0.1"
            {...register("amountPerUnit", { required: true })}
          />
        </div>

        <div className="space-y-1">
          <Label>{t("fieldCalendar.fertilizerApplications.method")}</Label>
          <Select
            value={watchedMethod}
            onValueChange={(v) => setValue("method", v as FertilizerMethod | "")}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("common.all")} />
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
              navigate({ to: "/field-calendar/fertilizer-applications" })
            }
          >
            {t("common.cancel")}
          </Button>
        </div>
      </form>
    </PageContent>
  );
}
