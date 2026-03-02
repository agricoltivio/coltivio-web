import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { cropRotationQueryOptions } from "@/api/cropRotations.queries";
import { cropsQueryOptions } from "@/api/crops.queries";
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

export const Route = createFileRoute(
  "/_authed/field-calendar/crop-rotations_/$rotationId/edit",
)({
  loader: ({ context: { queryClient }, params: { rotationId } }) => {
    queryClient.ensureQueryData(cropRotationQueryOptions(rotationId));
    queryClient.ensureQueryData(cropsQueryOptions());
  },
  component: EditCropRotation,
});

type FormData = {
  cropId: string;
  fromDate: string;
  toDate: string;
  sowingDate: string;
};

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function EditCropRotation() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { rotationId } = Route.useParams();

  const rotationQuery = useQuery(cropRotationQueryOptions(rotationId));
  const cropsQuery = useQuery(cropsQueryOptions());
  const rotation = rotationQuery.data;

  const { register, handleSubmit, setValue, watch, reset } = useForm<FormData>({
    defaultValues: {
      cropId: "",
      fromDate: "",
      toDate: "",
      sowingDate: "",
    },
  });

  useEffect(() => {
    if (rotation) {
      reset({
        cropId: rotation.cropId,
        fromDate: toDateInput(rotation.fromDate),
        toDate: toDateInput(rotation.toDate),
        sowingDate: toDateInput(rotation.sowingDate),
      });
    }
  }, [rotation, reset]);

  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiClient.PATCH(
        "/v1/cropRotations/byId/{rotationId}",
        {
          params: { path: { rotationId } },
          body: {
            cropId: data.cropId || undefined,
            fromDate: data.fromDate
              ? new Date(data.fromDate).toISOString()
              : undefined,
            toDate: data.toDate
              ? new Date(data.toDate).toISOString()
              : undefined,
            sowingDate: data.sowingDate
              ? new Date(data.sowingDate).toISOString()
              : undefined,
          },
        },
      );
      if (response.error) {
        throw new Error("Failed to update crop rotation");
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cropRotations"] });
      navigate({ to: "/field-calendar/crop-rotations" });
    },
  });

  const crops = cropsQuery.data?.result ?? [];
  const watchedCropId = watch("cropId");

  return (
    <PageContent
      title={t("fieldCalendar.cropRotations.edit")}
      showBackButton
      backTo={() => navigate({ to: "/field-calendar/crop-rotations" })}
    >
      <form
        onSubmit={handleSubmit((data) => updateMutation.mutate(data))}
        className="space-y-4 max-w-lg"
      >
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
          <Input type="date" {...register("fromDate")} />
        </div>

        <div className="space-y-1">
          <Label>{t("fieldCalendar.cropRotations.toDate")}</Label>
          <Input type="date" {...register("toDate")} />
        </div>

        <div className="space-y-1">
          <Label>{t("fieldCalendar.cropRotations.sowingDate")}</Label>
          <Input type="date" {...register("sowingDate")} />
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={updateMutation.isPending}>
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
