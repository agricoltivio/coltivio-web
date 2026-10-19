import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { fertilizerApplicationQueryOptions } from "@/api/fertilizerApplications.queries";
import { fertilizersQueryOptions } from "@/api/fertilizers.queries";
import type { FertilizerApplication } from "@/api/types";
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

export const Route = createFileRoute(
  "/_authed/field-calendar/fertilizer-applications_/$fertilizerApplicationId",
)({
  loader: ({ context: { queryClient }, params: { fertilizerApplicationId } }) => {
    queryClient.ensureQueryData(fertilizerApplicationQueryOptions(fertilizerApplicationId));
    queryClient.ensureQueryData(fertilizersQueryOptions());
  },
  component: FertilizerApplicationDetail,
});

type FormData = {
  date: string;
  fertilizerId: string;
  unit: FertilizerApplicationUnit;
  method: FertilizerMethod | "";
  amountPerUnit: string;
  numberOfUnits: string;
  additionalNotes: string;
};

function FertilizerApplicationDetail() {
  const { t } = useTranslation();
  const { fertilizerApplicationId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { canWrite } = useFeatureAccess("field_calendar");
  const appQuery = useQuery(fertilizerApplicationQueryOptions(fertilizerApplicationId));
  const app = appQuery.data;
  const fertilizersQuery = useQuery(fertilizersQueryOptions());
  const fertilizers = fertilizersQuery.data?.result ?? [];

  const { register, handleSubmit, setValue, watch, reset } = useForm<FormData>({
    defaultValues: {
      date: "",
      fertilizerId: "",
      unit: "total_amount",
      method: "",
      amountPerUnit: "",
      numberOfUnits: "",
      additionalNotes: "",
    },
  });

  useEffect(() => {
    if (app) {
      reset({
        date: app.date.slice(0, 10),
        fertilizerId: app.fertilizerId,
        unit: app.unit,
        method: app.method ?? "",
        // total_amount is edited as a single total, a multi-plot split may have
        // stored it as a fractional unit count
        amountPerUnit:
          app.unit === "total_amount"
            ? (Math.round((app.amountPerUnit * app.numberOfUnits + Number.EPSILON) * 100) / 100).toString()
            : app.amountPerUnit.toString(),
        numberOfUnits: app.unit === "total_amount" ? "1" : app.numberOfUnits.toString(),
        additionalNotes: app.additionalNotes ?? "",
      });
    }
  }, [app, reset]);

  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!app) throw new Error("Application not loaded");
      const response = await apiClient.PATCH(
        "/v1/fertilizerApplications/byId/{fertilizerApplicationId}",
        {
          params: { path: { fertilizerApplicationId } },
          body: {
            date: data.date,
            fertilizerId: data.fertilizerId,
            unit: data.unit,
            method: data.method || null,
            amountPerUnit: parseFloat(data.amountPerUnit),
            // Same as the create flow: total_amount is one unit, amount_per_hectare
            // counts the plot's hectares
            numberOfUnits:
              data.unit === "total_amount"
                ? 1
                : data.unit === "amount_per_hectare"
                  ? app.size / 10000
                  : parseFloat(data.numberOfUnits),
            additionalNotes: data.additionalNotes || null,
          },
        },
      );
      if (response.error) throw new Error("Failed to update fertilizer application");
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fertilizerApplications"] });
      queryClient.invalidateQueries({ queryKey: ["plots"] });
      navigate({ to: "/field-calendar/fertilizer-applications" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.DELETE(
        "/v1/fertilizerApplications/byId/{fertilizerApplicationId}",
        { params: { path: { fertilizerApplicationId } } },
      );
      if (response.error) throw new Error("Failed to delete fertilizer application");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fertilizerApplications"] });
      navigate({ to: "/field-calendar/fertilizer-applications" });
    },
  });

  const watchedFertilizerId = watch("fertilizerId");
  const watchedUnit = watch("unit");
  const watchedMethod = watch("method");
  const isFixedAmountUnit =
    watchedUnit === "total_amount" || watchedUnit === "amount_per_hectare";

  if (!app) {
    return (
      <PageContent title={t("common.loading")} showBackButton backTo={() => navigate({ to: "/field-calendar/fertilizer-applications" })}>
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </PageContent>
    );
  }

  const selectedFertilizer = fertilizers.find(
    (fertilizer) => fertilizer.id === watchedFertilizerId,
  );
  const fertilizerUnit = selectedFertilizer?.unit ?? app.fertilizer.unit;
  const amountPerUnitLabel =
    watchedUnit === "total_amount"
      ? `${t("fieldCalendar.fertilizerApplications.units.total_amount")} (${fertilizerUnit})`
      : watchedUnit === "amount_per_hectare"
        ? `${fertilizerUnit} / ha`
        : `${fertilizerUnit} / ${t(`fieldCalendar.fertilizerApplications.units.${watchedUnit}`)}`;

  return (
    <PageContent
      title={`${app.fertilizer.name} – ${app.plot.name}`}
      showBackButton
      backTo={() => navigate({ to: "/field-calendar/fertilizer-applications" })}
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
                  {t("fieldCalendar.fertilizerApplications.deleteConfirm")}
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
            <span className="font-medium">{app.plot.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("fieldCalendar.tillages.size")}</span>
            <span className="font-medium">{(app.size / 100).toFixed(2)} a</span>
          </div>
        </div>

        <fieldset disabled={!canWrite} className="space-y-4">
          <div className="space-y-1">
            <Label>{t("fieldCalendar.fertilizerApplications.fertilizer")}</Label>
            <Select
              value={watchedFertilizerId}
              onValueChange={(v) => {
                if (v) setValue("fertilizerId", v);
              }}
              disabled={!canWrite}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
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
              <Label>{amountPerUnitLabel}</Label>
              <Input
                type="number"
                min={0}
                step="any"
                {...register("amountPerUnit", { required: true })}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("fieldCalendar.fertilizerApplications.unit")}</Label>
              <Select
                value={watchedUnit}
                onValueChange={(v) => {
                  const unit = FERTILIZER_APPLICATION_UNITS.find(
                    (applicationUnit) => applicationUnit === v,
                  );
                  if (unit) setValue("unit", unit);
                }}
                disabled={!canWrite}
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

          {!isFixedAmountUnit && (
            <div className="space-y-1">
              <Label>
                {t("fieldCalendar.fertilizerApplications.numberOfUnitsWith", {
                  unit: t(`fieldCalendar.fertilizerApplications.units.${watchedUnit}`),
                })}
              </Label>
              <Input
                type="number"
                min={0}
                step="any"
                {...register("numberOfUnits", { required: !isFixedAmountUnit })}
              />
            </div>
          )}

          <div className="space-y-1">
            <Label>{t("fieldCalendar.fertilizerApplications.method")}</Label>
            <Select
              value={watchedMethod}
              onValueChange={(v) => {
                // Radix fires onValueChange("") spuriously, ignore unknown values
                const method = FERTILIZER_METHODS.find((fertilizerMethod) => fertilizerMethod === v);
                if (method) setValue("method", method);
              }}
              disabled={!canWrite}
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
              onClick={() => navigate({ to: "/field-calendar/fertilizer-applications" })}
            >
              {t("common.cancel")}
            </Button>
          </div>
        )}
      </form>
    </PageContent>
  );
}
