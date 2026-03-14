import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { apiClient } from "@/api/client";
import { fertilizerQueryOptions } from "@/api/fertilizers.queries";
import {
  FERTILIZER_TYPES,
  FERTILIZER_UNITS,
  type FertilizerType,
  type FertilizerUnit,
} from "@/api/types";
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

export const Route = createFileRoute(
  "/_authed/field-calendar/fertilizers_/$fertilizerId_/edit",
)({
  loader: ({ params, context: { queryClient } }) => {
    return queryClient.ensureQueryData(
      fertilizerQueryOptions(params.fertilizerId),
    );
  },
  component: EditFertilizerPage,
});

type FertilizerFormData = {
  name: string;
  type: FertilizerType;
  unit: FertilizerUnit;
  description: string;
};

function EditFertilizerPage() {
  const { t } = useTranslation();
  const { fertilizerId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const fertilizer = useQuery(fertilizerQueryOptions(fertilizerId)).data!;

  const { register, handleSubmit, setValue, watch } =
    useForm<FertilizerFormData>({
      defaultValues: {
        name: fertilizer.name,
        type: fertilizer.type,
        unit: fertilizer.unit,
        description: fertilizer.description ?? "",
      },
    });

  const updateMutation = useMutation({
    mutationFn: async (data: FertilizerFormData) => {
      const response = await apiClient.PATCH(
        "/v1/fertilizers/byId/{fertilizerId}",
        {
          params: { path: { fertilizerId } },
          body: {
            name: data.name,
            type: data.type,
            unit: data.unit,
            description: data.description || undefined,
          },
        },
      );
      if (response.error) {
        throw new Error("Failed to update fertilizer");
      }
      return response.data.data;
    },
    onSuccess: () => {
      navigate({
        to: "/field-calendar/fertilizers/$fertilizerId",
        params: { fertilizerId },
      });
      queryClient.invalidateQueries({ queryKey: ["fertilizers"] });
    },
  });

  return (
    <PageContent
      title={t("fertilizers.editFertilizer")}
      showBackButton
      backTo={() =>
        navigate({
          to: "/field-calendar/fertilizers/$fertilizerId",
          params: { fertilizerId },
        })
      }
    >
      <form
        onSubmit={handleSubmit((data) => updateMutation.mutate(data))}
        className="space-y-4 max-w-lg"
      >
        <div className="space-y-1">
          <Label htmlFor="name">{t("fertilizers.name")} *</Label>
          <Input id="name" {...register("name", { required: true })} />
        </div>

        <div className="space-y-1">
          <Label>{t("fertilizers.type")} *</Label>
          <Select
            value={watch("type")}
            onValueChange={(val) => setValue("type", val as FertilizerType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FERTILIZER_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {t(`fertilizers.types.${type}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>{t("fertilizers.unit")} *</Label>
          <Select
            value={watch("unit")}
            onValueChange={(val) => setValue("unit", val as FertilizerUnit)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FERTILIZER_UNITS.map((unit) => (
                <SelectItem key={unit} value={unit}>
                  {unit}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="description">{t("fertilizers.description")}</Label>
          <Textarea id="description" {...register("description")} />
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              navigate({
                to: "/field-calendar/fertilizers/$fertilizerId",
                params: { fertilizerId },
              })
            }
          >
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={updateMutation.isPending}>
            {t("common.save")}
          </Button>
        </div>
      </form>
    </PageContent>
  );
}
