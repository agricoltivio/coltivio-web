import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { apiClient } from "@/api/client";
import { cropsQueryOptions } from "@/api/crops.queries";
import { plotsQueryOptions } from "@/api/plots.queries";
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

const searchSchema = z.object({
  plotId: z.string().optional(),
});

export const Route = createFileRoute(
  "/_authed/field-calendar/crop-rotations_/create",
)({
  validateSearch: searchSchema,
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(plotsQueryOptions());
    queryClient.ensureQueryData(cropsQueryOptions());
  },
  component: CreateCropRotation,
});

type FormData = {
  plotId: string;
  cropId: string;
  fromDate: string;
  toDate: string;
  sowingDate: string;
};

function CreateCropRotation() {
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
      fromDate: "",
      toDate: "",
      sowingDate: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiClient.POST(
        "/v1/cropRotations/batch/byPlot",
        {
          body: {
            plotId: data.plotId,
            crops: [
              {
                cropId: data.cropId,
                fromDate: new Date(data.fromDate).toISOString(),
                toDate: new Date(data.toDate).toISOString(),
                sowingDate: data.sowingDate
                  ? new Date(data.sowingDate).toISOString()
                  : undefined,
              },
            ],
          },
        },
      );
      if (response.error) {
        throw new Error("Failed to create crop rotation");
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cropRotations"] });
      navigate({ to: "/field-calendar/crop-rotations" });
    },
  });

  const plots = plotsQuery.data?.result ?? [];
  const crops = cropsQuery.data?.result ?? [];
  const watchedPlotId = watch("plotId");
  const watchedCropId = watch("cropId");

  return (
    <PageContent
      title={t("fieldCalendar.cropRotations.create")}
      showBackButton
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
          <Label>{t("fieldCalendar.cropRotations.crop")}</Label>
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
          <Label>{t("fieldCalendar.cropRotations.fromDate")}</Label>
          <Input type="date" {...register("fromDate", { required: true })} />
        </div>

        <div className="space-y-1">
          <Label>{t("fieldCalendar.cropRotations.toDate")}</Label>
          <Input type="date" {...register("toDate", { required: true })} />
        </div>

        <div className="space-y-1">
          <Label>{t("fieldCalendar.cropRotations.sowingDate")}</Label>
          <Input type="date" {...register("sowingDate")} />
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            type="submit"
            disabled={createMutation.isPending}
          >
            {t("common.save")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: "/field-calendar/crop-rotations" })}
          >
            {t("common.cancel")}
          </Button>
        </div>
      </form>
    </PageContent>
  );
}
