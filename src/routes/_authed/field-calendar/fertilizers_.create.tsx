import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { apiClient } from "@/api/client";
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
  "/_authed/field-calendar/fertilizers_/create",
)({
  component: CreateFertilizerPage,
});

type FertilizerFormData = {
  name: string;
  type: FertilizerType;
  unit: FertilizerUnit;
  description: string;
};

function CreateFertilizerPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { register, handleSubmit, setValue, watch } =
    useForm<FertilizerFormData>({
      defaultValues: {
        name: "",
        type: "mineral",
        unit: "kg",
        description: "",
      },
    });

  const createMutation = useMutation({
    mutationFn: async (data: FertilizerFormData) => {
      const response = await apiClient.POST("/v1/fertilizers", {
        body: {
          name: data.name,
          type: data.type,
          unit: data.unit,
          description: data.description || undefined,
        },
      });
      if (response.error) {
        throw new Error("Failed to create fertilizer");
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fertilizers"] });
      navigate({ to: "/field-calendar/fertilizers" });
    },
  });

  return (
    <PageContent
      title={t("fertilizers.createFertilizer")}
      showBackButton
      backTo={() => navigate({ to: "/field-calendar/fertilizers" })}
    >
      <form
        onSubmit={handleSubmit((data) => createMutation.mutate(data))}
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
            onClick={() => navigate({ to: "/field-calendar/fertilizers" })}
          >
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {t("common.create")}
          </Button>
        </div>
      </form>
    </PageContent>
  );
}
