import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { cropsQueryOptions } from "@/api/crops.queries";
import { harvestQueryOptions } from "@/api/harvests.queries";
import type { Harvest } from "@/api/types";
import { useFeatureAccess } from "@/lib/useFeatureAccess";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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

export const Route = createFileRoute(
  "/_authed/field-calendar/harvests_/$harvestId",
)({
  loader: ({ context: { queryClient }, params: { harvestId } }) => {
    queryClient.ensureQueryData(harvestQueryOptions(harvestId));
    queryClient.ensureQueryData(cropsQueryOptions());
  },
  component: HarvestDetail,
});

type FormData = {
  date: string;
  cropId: string;
  unit: HarvestUnit;
  kilosPerUnit: string;
  numberOfUnits: string;
  conservationMethod: ConservationMethod | "";
  additionalNotes: string;
};

function HarvestDetail() {
  const { t } = useTranslation();
  const { harvestId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { canWrite } = useFeatureAccess("field_calendar");
  const harvestQuery = useQuery(harvestQueryOptions(harvestId));
  const harvest = harvestQuery.data;
  const cropsQuery = useQuery(cropsQueryOptions());
  const crops = cropsQuery.data?.result ?? [];

  const { register, handleSubmit, setValue, watch, reset } = useForm<FormData>({
    defaultValues: {
      date: "",
      cropId: "",
      unit: "load",
      kilosPerUnit: "",
      numberOfUnits: "",
      conservationMethod: "",
      additionalNotes: "",
    },
  });

  useEffect(() => {
    if (harvest) {
      reset({
        date: harvest.date.slice(0, 10),
        cropId: harvest.cropId,
        unit: harvest.unit,
        kilosPerUnit: harvest.kilosPerUnit.toString(),
        numberOfUnits: harvest.numberOfUnits.toString(),
        conservationMethod: harvest.conservationMethod ?? "",
        additionalNotes: harvest.additionalNotes ?? "",
      });
    }
  }, [harvest, reset]);

  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiClient.PATCH("/v1/harvests/byId/{harvestId}", {
        params: { path: { harvestId } },
        body: {
          date: new Date(data.date).toISOString(),
          cropId: data.cropId,
          unit: data.unit,
          kilosPerUnit: parseFloat(data.kilosPerUnit),
          numberOfUnits: parseFloat(data.numberOfUnits),
          conservationMethod: data.conservationMethod || null,
          additionalNotes: data.additionalNotes || null,
        },
      });
      if (response.error) throw new Error("Failed to update harvest");
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["harvests"] });
      queryClient.invalidateQueries({ queryKey: ["plots"] });
      navigate({ to: "/field-calendar/harvests" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.DELETE("/v1/harvests/byId/{harvestId}", {
        params: { path: { harvestId } },
      });
      if (response.error) throw new Error("Failed to delete harvest");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["harvests"] });
      navigate({ to: "/field-calendar/harvests" });
    },
  });

  const watchedCropId = watch("cropId");
  const watchedUnit = watch("unit");
  const watchedConservation = watch("conservationMethod");

  if (!harvest) {
    return (
      <PageContent title={t("common.loading")} showBackButton backTo={() => navigate({ to: "/field-calendar/harvests" })}>
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </PageContent>
    );
  }

  const kilosPerUnitLabel =
    watchedUnit === "total_amount"
      ? `${t("fieldCalendar.harvests.units.total_amount")} (kg)`
      : `kg / ${t(`fieldCalendar.harvests.units.${watchedUnit}`)}`;

  return (
    <PageContent
      title={`${harvest.crop.name} – ${harvest.plot.name}`}
      showBackButton
      backTo={() => navigate({ to: "/field-calendar/harvests" })}
      actions={
        canWrite && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={deleteMutation.isPending}>
                {t("common.delete")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("common.confirm")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("fieldCalendar.harvests.deleteConfirm")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate()}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  {t("common.delete")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )
      }
    >
      <form
        onSubmit={handleSubmit((data) => updateMutation.mutate(data))}
        className="space-y-4 max-w-lg"
      >
        {/* Area is fixed after creation, only shown for reference */}
        <div className="rounded-md border p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("fieldCalendar.plots.plot")}</span>
            <span className="font-medium">{harvest.plot.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("fieldCalendar.tillages.size")}</span>
            <span className="font-medium">{(harvest.size / 100).toFixed(2)} a</span>
          </div>
        </div>

        <fieldset disabled={!canWrite} className="space-y-4">
          <div className="space-y-1">
            <Label>{t("fieldCalendar.harvests.crop")}</Label>
            <Select
              value={watchedCropId}
              onValueChange={(v) => {
                if (v) setValue("cropId", v);
              }}
              disabled={!canWrite}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
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
                onValueChange={(v) => {
                  const unit = HARVEST_UNITS.find((harvestUnit) => harvestUnit === v);
                  if (unit) setValue("unit", unit);
                }}
                disabled={!canWrite}
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
                min={0}
                step="any"
                {...register("numberOfUnits", { required: true })}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>{kilosPerUnitLabel}</Label>
            <Input
              type="number"
              min={0}
              step="any"
              {...register("kilosPerUnit", { required: true })}
            />
          </div>

          <div className="space-y-1">
            <Label>{t("fieldCalendar.harvests.conservationMethod")}</Label>
            <Select
              value={watchedConservation}
              onValueChange={(v) =>
                setValue(
                  "conservationMethod",
                  CONSERVATION_METHODS.find((method) => method === v) ?? "",
                )
              }
              disabled={!canWrite}
            >
              <SelectTrigger>
                <SelectValue />
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
        </fieldset>

        {canWrite && (
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={updateMutation.isPending}>
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
        )}
      </form>
    </PageContent>
  );
}
