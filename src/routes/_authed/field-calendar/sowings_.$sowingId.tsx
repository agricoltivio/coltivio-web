import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { cropsQueryOptions } from "@/api/crops.queries";
import { seedsQueryOptions } from "@/api/seeds.queries";
import { sowingQueryOptions, sowingUnitsQueryOptions } from "@/api/sowings.queries";
import type { SowingUnit } from "@/api/types";
import { useFeatureAccess } from "@/lib/useFeatureAccess";
import { computeCounterpart, formatBaseAmount, isPerAreaUnit, unitsForQuantityKind } from "@/lib/sowingUnits";
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

// Radix Select doesn't allow an empty item value
const NO_SEED = "none";

export const Route = createFileRoute("/_authed/field-calendar/sowings_/$sowingId")({
  loader: ({ context: { queryClient }, params: { sowingId } }) => {
    queryClient.ensureQueryData(sowingQueryOptions(sowingId));
    queryClient.ensureQueryData(cropsQueryOptions());
    queryClient.ensureQueryData(seedsQueryOptions());
    queryClient.ensureQueryData(sowingUnitsQueryOptions());
  },
  component: SowingDetail,
});

type FormData = {
  date: string;
  cropId: string;
  seedId: string;
  unit: SowingUnit;
  amount: string;
  additionalNotes: string;
};

function SowingDetail() {
  const { t } = useTranslation();
  const { sowingId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { canWrite } = useFeatureAccess("field_calendar");

  const sowingQuery = useQuery(sowingQueryOptions(sowingId));
  const sowing = sowingQuery.data;
  const crops = useQuery(cropsQueryOptions()).data?.result ?? [];
  const seeds = useQuery(seedsQueryOptions()).data?.result ?? [];
  const units = useQuery(sowingUnitsQueryOptions()).data ?? [];

  const { register, handleSubmit, setValue, watch, reset, getValues } = useForm<FormData>({
    defaultValues: {
      date: "",
      cropId: "",
      seedId: "",
      unit: "kg_per_ha",
      amount: "",
      additionalNotes: "",
    },
  });

  useEffect(() => {
    if (sowing) {
      reset({
        date: sowing.date.slice(0, 10),
        cropId: sowing.cropId,
        seedId: sowing.seedId ?? "",
        unit: sowing.unit,
        amount: sowing.amount.toString(),
        additionalNotes: sowing.additionalNotes ?? "",
      });
    }
  }, [sowing, reset]);

  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiClient.PATCH("/v1/sowings/byId/{sowingId}", {
        params: { path: { sowingId } },
        body: {
          date: data.date,
          // with a seed the API takes the crop from the seed
          cropId: data.seedId ? undefined : data.cropId,
          seedId: data.seedId || null,
          unit: data.unit,
          amount: parseFloat(data.amount) || 0,
          additionalNotes: data.additionalNotes || null,
        },
      });
      if (response.error) throw new Error("Failed to update sowing");
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sowings"] });
      queryClient.invalidateQueries({ queryKey: ["plots"] });
      navigate({ to: "/field-calendar/sowings" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.DELETE("/v1/sowings/byId/{sowingId}", {
        params: { path: { sowingId } },
      });
      if (response.error) throw new Error("Failed to delete sowing");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sowings"] });
      navigate({ to: "/field-calendar/sowings" });
    },
  });

  const watchedCropId = watch("cropId");
  const watchedSeedId = watch("seedId");
  const watchedUnit = watch("unit");
  const watchedAmount = watch("amount");

  if (!sowing) {
    return (
      <PageContent title={t("common.loading")} showBackButton backTo={() => navigate({ to: "/field-calendar/sowings" })}>
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </PageContent>
    );
  }

  const selectedSeed = seeds.find((seed) => seed.id === watchedSeedId);
  const availableUnits = unitsForQuantityKind(units, selectedSeed?.quantityKind);
  const perArea = isPerAreaUnit(units, watchedUnit);
  const counterpart = computeCounterpart(units, parseFloat(watchedAmount) || 0, watchedUnit, sowing.size);
  const storedQuantityKind = units.find((unitInfo) => unitInfo.unit === sowing.unit)?.quantityKind;

  function selectSeed(seedId: string) {
    setValue("seedId", seedId);
    const seed = seeds.find((candidate) => candidate.id === seedId);
    if (!seed) return;
    // the crop always comes from the seed
    setValue("cropId", seed.cropId);
    const fittingUnits = unitsForQuantityKind(units, seed.quantityKind);
    if (!fittingUnits.some((unitInfo) => unitInfo.unit === getValues("unit")) && fittingUnits[0]) {
      setValue("unit", fittingUnits[0].unit);
    }
  }

  return (
    <PageContent
      title={`${sowing.crop.name} – ${sowing.plot.name}`}
      showBackButton
      backTo={() => navigate({ to: "/field-calendar/sowings" })}
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
                  {t("fieldCalendar.sowings.deleteConfirm")}
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
            <span className="font-medium">{sowing.plot.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("fieldCalendar.tillages.size")}</span>
            <span className="font-medium">{(sowing.size / 100).toFixed(2)} a</span>
          </div>
          {storedQuantityKind && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("fieldCalendar.sowings.total")}</span>
              <span className="font-medium">
                {formatBaseAmount(sowing.totalBaseAmount, storedQuantityKind, t)}
              </span>
            </div>
          )}
        </div>

        <fieldset disabled={!canWrite} className="space-y-4">
          <div className="space-y-1">
            <Label>{t("fieldCalendar.sowings.seedOptional")}</Label>
            <Select
              value={watchedSeedId || NO_SEED}
              onValueChange={(value) => {
                if (value === NO_SEED) setValue("seedId", "");
                else if (value) selectSeed(value);
              }}
              disabled={!canWrite}
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
              onValueChange={(value) => {
                if (value) setValue("cropId", value);
              }}
              disabled={!canWrite || !!selectedSeed}
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
                disabled={!canWrite}
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
          {counterpart && (
            <p className="text-sm text-muted-foreground">
              {t(
                perArea ? "fieldCalendar.sowings.computedTotal" : "fieldCalendar.sowings.computedRate",
                {
                  amount: counterpart.amount.toLocaleString(),
                  unit: t(`fieldCalendar.sowings.units.${counterpart.unit}`),
                  area: counterpart.area,
                },
              )}
            </p>
          )}

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
              onClick={() => navigate({ to: "/field-calendar/sowings" })}
            >
              {t("common.cancel")}
            </Button>
          </div>
        )}
      </form>
    </PageContent>
  );
}
