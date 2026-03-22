import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { apiClient } from "@/api/client";
import { cropQueryOptions, cropFamiliesQueryOptions } from "@/api/crops.queries";
import { CROP_CATEGORIES, type CropCategory } from "@/api/types";
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

export const Route = createFileRoute("/_authed/field-calendar/crops_/$cropId_/edit")({
  loader: ({ params, context: { queryClient } }) => {
    return Promise.all([
      queryClient.ensureQueryData(cropQueryOptions(params.cropId)),
      queryClient.ensureQueryData(cropFamiliesQueryOptions()),
    ]);
  },
  component: EditCropPage,
});

type CropFormData = {
  name: string;
  category: CropCategory;
  variety: string;
  waitingTimeInYears: string;
  familyId: string;
  additionalNotes: string;
};

function EditCropPage() {
  const { t } = useTranslation();
  const { cropId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const crop = useQuery(cropQueryOptions(cropId)).data!;
  const familiesQuery = useQuery(cropFamiliesQueryOptions());

  const { register, handleSubmit, setValue, watch } = useForm<CropFormData>({
    defaultValues: {
      name: crop.name,
      category: crop.category,
      variety: crop.variety ?? "",
      waitingTimeInYears: crop.waitingTimeInYears?.toString() ?? "",
      familyId: crop.familyId ?? "",
      additionalNotes: crop.additionalNotes ?? "",
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: CropFormData) => {
      const response = await apiClient.PATCH("/v1/crops/byId/{cropId}", {
        params: { path: { cropId } },
        body: {
          name: data.name,
          category: data.category,
          variety: data.variety || undefined,
          waitingTimeInYears: data.waitingTimeInYears ? Number(data.waitingTimeInYears) : null,
          familyId: data.familyId || null,
          additionalNotes: data.additionalNotes || undefined,
          usageCodes: [],
        },
      });
      if (response.error) {
        throw new Error("Failed to update crop");
      }
      return response.data.data;
    },
    onSuccess: () => {
      navigate({ to: "/field-calendar/crops/$cropId", params: { cropId } });
      queryClient.invalidateQueries({ queryKey: ["crops"] });
    },
  });

  return (
    <PageContent
      title={t("crops.editCrop")}
      showBackButton
      backTo={() => navigate({ to: "/field-calendar/crops/$cropId", params: { cropId } })}
    >
      <form
        onSubmit={handleSubmit((data) => updateMutation.mutate(data))}
        className="space-y-4 max-w-lg"
      >
        <div className="space-y-1">
          <Label htmlFor="name">{t("crops.name")} *</Label>
          <Input id="name" {...register("name", { required: true })} />
        </div>

        <div className="space-y-1">
          <Label>{t("crops.category")} *</Label>
          <Select
            value={watch("category")}
            onValueChange={(val) => setValue("category", val as CropCategory)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CROP_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {t(`crops.categories.${cat}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="variety">{t("crops.variety")}</Label>
          <Input id="variety" {...register("variety")} />
        </div>

        <div className="space-y-1">
          <Label>{t("crops.family")}</Label>
          <Select
            value={watch("familyId") || "__none__"}
            onValueChange={(val) => setValue("familyId", val === "__none__" ? "" : val)}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("common.noSelection")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">{t("common.noSelection")}</SelectItem>
              {(familiesQuery.data?.result ?? []).map((family) => (
                <SelectItem key={family.id} value={family.id}>
                  {family.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="waitingTimeInYears">{t("crops.waitingTimeInYears")}</Label>
          <Input id="waitingTimeInYears" type="number" min="0" {...register("waitingTimeInYears")} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="additionalNotes">{t("crops.additionalNotes")}</Label>
          <Textarea id="additionalNotes" {...register("additionalNotes")} />
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: "/field-calendar/crops/$cropId", params: { cropId } })}
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
