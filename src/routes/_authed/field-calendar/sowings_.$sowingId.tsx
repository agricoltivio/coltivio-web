import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { apiClient } from "@/api/client";
import { cropsQueryOptions } from "@/api/crops.queries";
import { seedsQueryOptions } from "@/api/seeds.queries";
import { sowingQueryOptions, sowingUnitsQueryOptions } from "@/api/sowings.queries";
import type { SowingUnit } from "@/api/types";
import { useFeatureAccess } from "@/lib/useFeatureAccess";
import { computeCounterpart, formatArea, formatBaseAmount, isPerAreaUnit, unitsForQuantityKind } from "@/lib/sowingUnits";
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

const searchSchema = z.object({
  plotId: z.string().optional(),
  returnTo: z.string().optional(),
});

export const Route = createFileRoute("/_authed/field-calendar/sowings_/$sowingId")({
  validateSearch: searchSchema,
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
  const { plotId, returnTo } = Route.useSearch();
  // back to the list the sowing was opened from (per plot or all)
  function goToList() {
    navigate({
      to: "/field-calendar/sowings",
      search: plotId ? { plotId, ...(returnTo ? { returnTo } : {}) } : {},
    });
  }
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { canWrite } = useFeatureAccess("field_calendar");

  const sowingQuery = useQuery(sowingQueryOptions(sowingId));
  const sowing = sowingQuery.data;
  const crops = useQuery(cropsQueryOptions()).data?.result ?? [];
  const seeds = useQuery(seedsQueryOptions()).data?.result ?? [];
  const units = useQuery(sowingUnitsQueryOptions()).data ?? [];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    getValues,
    formState: { errors },
  } = useForm<FormData>({
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
      goToList();
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
      queryClient.invalidateQueries({ queryKey: ["plots"] });
      goToList();
    },
  });

  const watchedCropId = watch("cropId");
  const watchedSeedId = watch("seedId");
  const watchedUnit = watch("unit");
  const watchedAmount = watch("amount");

  if (!sowing) {
    return (
      <PageContent title={t("common.loading")} showBackButton backTo={goToList}>
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </PageContent>
    );
  }

  const selectedSeed = seeds.find((seed) => seed.id === watchedSeedId);
  const availableUnits = unitsForQuantityKind(units, selectedSeed?.quantityKind);
  const perArea = isPerAreaUnit(watchedUnit);
  const counterpart = computeCounterpart(parseFloat(watchedAmount) || 0, watchedUnit, sowing.size);
  const storedUnitInfo = units.find((unitInfo) => unitInfo.unit === sowing.unit);

  function selectSeed(seedId: string) {
    setValue("seedId", seedId);
    const seed = seeds.find((candidate) => candidate.id === seedId);
    if (!seed) return;
    // the crop always comes from the seed
    setValue("cropId", seed.cropId);
    // A seed of another kind brings its own default unit and amount, the old
    // number would mean something else in the new unit
    const fittingUnits = unitsForQuantityKind(units, seed.quantityKind);
    if (fittingUnits.some((unitInfo) => unitInfo.unit === getValues("unit"))) return;
    const nextUnit = seed.defaultUnit ?? fittingUnits[0]?.unit;
    if (nextUnit) setValue("unit", nextUnit);
    setValue("amount", seed.defaultAmount?.toString() ?? "");
  }

  return (
    <PageContent
      title={`${sowing.crop.name} – ${sowing.plot.name}`}
      showBackButton
      backTo={goToList}
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
            <span className="font-medium">{formatArea(sowing.size)}</span>
          </div>
          {storedUnitInfo && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("fieldCalendar.sowings.total")}</span>
              <span className="font-medium">
                {formatBaseAmount(sowing.totalBaseAmount, storedUnitInfo, t)}
              </span>
            </div>
          )}
        </div>

        <fieldset disabled={!canWrite} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="sowing-edit-seedOptional">{t("fieldCalendar.sowings.seedOptional")}</Label>
            <Select
              value={watchedSeedId || NO_SEED}
              onValueChange={(value) => {
                if (value === NO_SEED) setValue("seedId", "");
                else if (value) selectSeed(value);
              }}
              disabled={!canWrite}
            >
              <SelectTrigger id="sowing-edit-seedOptional" className="w-full">
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
            <Label htmlFor="sowing-edit-crop">{t("fieldCalendar.sowings.crop")}</Label>
            <Select
              value={watchedCropId}
              onValueChange={(value) => {
                if (value) setValue("cropId", value);
              }}
              disabled={!canWrite || !!selectedSeed}
            >
              <SelectTrigger id="sowing-edit-crop" className="w-full">
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
            <Label htmlFor="sowing-edit-date">{t("fieldCalendar.sowings.date")}</Label>
            <Input id="sowing-edit-date" type="date" {...register("date", { required: true })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="sowing-edit-amount">{t("fieldCalendar.sowings.amount")}</Label>
              <Input id="sowing-edit-amount"
                type="number"
                min={0}
                step="any"
                {...register("amount", {
                  required: true,
                  // "." or "0" would be saved as an empty sowing
                  validate: (value) => Number(value) > 0,
                })}
              />
              {errors.amount && (
                <p className="text-sm text-destructive">{t("fieldCalendar.sowings.amountInvalid")}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="sowing-edit-unit">{t("fieldCalendar.sowings.unit")}</Label>
              <Select
                value={watchedUnit}
                onValueChange={(value) => {
                  const unitInfo = availableUnits.find((info) => info.unit === value);
                  if (unitInfo) setValue("unit", unitInfo.unit);
                }}
                disabled={!canWrite}
              >
                <SelectTrigger id="sowing-edit-unit">
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
            <Label htmlFor="sowing-edit-notes">{t("fieldCalendar.tillages.notes")}</Label>
            <Textarea id="sowing-edit-notes" {...register("additionalNotes")} rows={3} />
          </div>
        </fieldset>

        {(updateMutation.isError || deleteMutation.isError) && (
          <p className="text-sm text-destructive">{t("common.saveFailed")}</p>
        )}
        {canWrite && (
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={updateMutation.isPending}>
              {t("common.save")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={goToList}
            >
              {t("common.cancel")}
            </Button>
          </div>
        )}
      </form>
    </PageContent>
  );
}
