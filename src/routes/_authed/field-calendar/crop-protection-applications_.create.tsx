import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { apiClient } from "@/api/client";
import { cropProtectionProductsQueryOptions } from "@/api/cropProtectionProducts.queries";
import { plotsQueryOptions } from "@/api/plots.queries";
import type { CropProtectionApplication, FertilizerApplication } from "@/api/types";
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

function CreateCropProtectionApplication() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { plotId: defaultPlotId } = Route.useSearch();

  const plotsQuery = useQuery(plotsQueryOptions());
  const productsQuery = useQuery(cropProtectionProductsQueryOptions());

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

  const plots = plotsQuery.data?.result ?? [];
  const products = productsQuery.data?.result ?? [];
  const watchedPlotId = watch("plotId");
  const watchedProductId = watch("productId");
  const watchedMethod = watch("method");
  const watchedUnit = watch("unit");

  return (
    <PageContent
      title={t("fieldCalendar.cropProtectionApplications.create")}
      showBackButton
      backTo={() => navigate({ to: "/field-calendar/crop-protection-applications" })}
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
          <Label>{t("fieldCalendar.cropProtectionApplications.product")}</Label>
          <Select
            value={watchedProductId}
            onValueChange={(v) => setValue("productId", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("fieldCalendar.cropProtectionApplications.selectProduct")} />
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

        <div className="space-y-1">
          <Label>{t("fieldCalendar.cropProtectionApplications.date")}</Label>
          <Input
            type="datetime-local"
            {...register("dateTime", { required: true })}
          />
        </div>

        <div className="space-y-1">
          <Label>{t("fieldCalendar.cropProtectionApplications.method")}</Label>
          <Select
            value={watchedMethod}
            onValueChange={(v) => setValue("method", v as CropProtectionMethod)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CROP_PROTECTION_METHODS.map((method) => (
                <SelectItem key={method} value={method}>
                  {t(`fieldCalendar.cropProtectionApplications.methods.${method}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
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
            step="0.01"
            {...register("amountPerUnit", { required: true })}
          />
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
              navigate({ to: "/field-calendar/crop-protection-applications" })
            }
          >
            {t("common.cancel")}
          </Button>
        </div>
      </form>
    </PageContent>
  );
}
