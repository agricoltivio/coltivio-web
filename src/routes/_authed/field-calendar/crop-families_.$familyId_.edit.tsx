import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { apiClient } from "@/api/client";
import { cropFamilyQueryOptions } from "@/api/crops.queries";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute(
  "/_authed/field-calendar/crop-families_/$familyId_/edit",
)({
  loader: ({ params, context: { queryClient } }) => {
    return queryClient.ensureQueryData(cropFamilyQueryOptions(params.familyId));
  },
  component: EditCropFamilyPage,
});

type CropFamilyFormData = {
  name: string;
  waitingTimeInYears: string;
  additionalNotes: string;
};

function EditCropFamilyPage() {
  const { t } = useTranslation();
  const { familyId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const family = useQuery(cropFamilyQueryOptions(familyId)).data!;

  const { register, handleSubmit } = useForm<CropFamilyFormData>({
    defaultValues: {
      name: family.name,
      waitingTimeInYears: family.waitingTimeInYears.toString(),
      additionalNotes: family.additionalNotes ?? "",
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: CropFamilyFormData) => {
      const response = await apiClient.PATCH(
        "/v1/crops/families/byId/{familyId}",
        {
          params: { path: { familyId } },
          body: {
            name: data.name,
            waitingTimeInYears: Number(data.waitingTimeInYears),
            additionalNotes: data.additionalNotes || undefined,
          },
        },
      );
      if (response.error) {
        throw new Error("Failed to update crop family");
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cropFamilies"] });
      navigate({
        to: "/field-calendar/crop-families/$familyId",
        params: { familyId },
      });
    },
  });

  return (
    <PageContent
      title={t("cropFamilies.editCropFamily")}
      showBackButton
      backTo={() =>
        navigate({
          to: "/field-calendar/crop-families/$familyId",
          params: { familyId },
        })
      }
    >
      <form
        onSubmit={handleSubmit((data) => updateMutation.mutate(data))}
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
            onClick={() =>
              navigate({
                to: "/field-calendar/crop-families/$familyId",
                params: { familyId },
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
