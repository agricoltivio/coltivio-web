import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { apiClient } from "@/api/client";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute(
  "/_authed/field-calendar/crop-families_/create",
)({
  component: CreateCropFamilyPage,
});

type CropFamilyFormData = {
  name: string;
  waitingTimeInYears: string;
  additionalNotes: string;
};

function CreateCropFamilyPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { register, handleSubmit } = useForm<CropFamilyFormData>({
    defaultValues: { name: "", waitingTimeInYears: "0", additionalNotes: "" },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CropFamilyFormData) => {
      const response = await apiClient.POST("/v1/crops/families", {
        body: {
          name: data.name,
          waitingTimeInYears: Number(data.waitingTimeInYears),
          additionalNotes: data.additionalNotes || undefined,
        },
      });
      if (response.error) {
        throw new Error("Failed to create crop family");
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cropFamilies"] });
      navigate({ to: "/field-calendar/crop-families" });
    },
  });

  return (
    <PageContent
      title={t("cropFamilies.createCropFamily")}
      showBackButton
      backTo={() => navigate({ to: "/field-calendar/crop-families" })}
    >
      <form
        onSubmit={handleSubmit((data) => createMutation.mutate(data))}
        className="space-y-4 max-w-lg"
      >
        <div className="space-y-1">
          <Label htmlFor="name">{t("cropFamilies.name")} *</Label>
          <Input id="name" {...register("name", { required: true })} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="waitingTimeInYears">
            {t("cropFamilies.waitingTimeInYears")}
          </Label>
          <Input
            id="waitingTimeInYears"
            type="number"
            min="0"
            {...register("waitingTimeInYears")}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="additionalNotes">
            {t("cropFamilies.additionalNotes")}
          </Label>
          <Textarea id="additionalNotes" {...register("additionalNotes")} />
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: "/field-calendar/crop-families" })}
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
