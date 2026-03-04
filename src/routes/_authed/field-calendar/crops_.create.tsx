import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { apiClient } from "@/api/client";
import { cropFamiliesQueryOptions } from "@/api/crops.queries";
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

export const Route = createFileRoute("/_authed/field-calendar/crops_/create")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(cropFamiliesQueryOptions());
  },
  component: CreateCropPage,
});

type CropFormData = {
  name: string;
  category: CropCategory;
  variety: string;
  waitingTimeInYears: string;
  familyId: string;
  additionalNotes: string;
};

function CreateCropPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const familiesQuery = useQuery(cropFamiliesQueryOptions());

  const { register, handleSubmit, setValue, watch } = useForm<CropFormData>({
    defaultValues: {
      name: "",
      category: "grain",
      variety: "",
      waitingTimeInYears: "",
      familyId: "",
      additionalNotes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CropFormData) => {
      const response = await apiClient.POST("/v1/crops", {
        body: {
          name: data.name,
          category: data.category,
          variety: data.variety || undefined,
          waitingTimeInYears: data.waitingTimeInYears
            ? Number(data.waitingTimeInYears)
            : undefined,
          familyId: data.familyId || undefined,
          additionalNotes: data.additionalNotes || undefined,
          usageCodes: [],
        },
      });
      if (response.error) {
        throw new Error("Failed to create crop");
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crops"] });
      navigate({ to: "/field-calendar/crops" });
    },
  });

  return (
    <PageContent
      title={t("crops.createCrop")}
      showBackButton
      backTo={() => navigate({ to: "/field-calendar/crops" })}
    >
      <form
        onSubmit={handleSubmit((data) => createMutation.mutate(data))}
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
          <Label htmlFor="waitingTimeInYears">
            {t("crops.waitingTimeInYears")}
          </Label>
          <Input
            id="waitingTimeInYears"
            type="number"
            min="0"
            {...register("waitingTimeInYears")}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="additionalNotes">{t("crops.additionalNotes")}</Label>
          <Textarea id="additionalNotes" {...register("additionalNotes")} />
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: "/field-calendar/crops" })}
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
