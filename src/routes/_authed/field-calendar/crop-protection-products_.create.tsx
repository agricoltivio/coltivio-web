import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { apiClient } from "@/api/client";
import {
  CROP_PROTECTION_PRODUCT_UNITS,
  type CropProtectionProductUnit,
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
  "/_authed/field-calendar/crop-protection-products_/create",
)({
  component: CreateCropProtectionProductPage,
});

type ProductFormData = {
  name: string;
  unit: CropProtectionProductUnit;
  description: string;
};

function CreateCropProtectionProductPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { register, handleSubmit, setValue, watch } = useForm<ProductFormData>({
    defaultValues: { name: "", unit: "ml", description: "" },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const response = await apiClient.POST("/v1/cropProtectionProducts", {
        body: {
          name: data.name,
          unit: data.unit,
          description: data.description || undefined,
        },
      });
      if (response.error) {
        throw new Error("Failed to create crop protection product");
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cropProtectionProducts"] });
      navigate({ to: "/field-calendar/crop-protection-products" });
    },
  });

  return (
    <PageContent
      title={t("cropProtectionProducts.createProduct")}
      showBackButton
      backTo={() =>
        navigate({ to: "/field-calendar/crop-protection-products" })
      }
    >
      <form
        onSubmit={handleSubmit((data) => createMutation.mutate(data))}
        className="space-y-4 max-w-lg"
      >
        <div className="space-y-1">
          <Label htmlFor="name">{t("cropProtectionProducts.name")} *</Label>
          <Input id="name" {...register("name", { required: true })} />
        </div>

        <div className="space-y-1">
          <Label>{t("cropProtectionProducts.unit")} *</Label>
          <Select
            value={watch("unit")}
            onValueChange={(val) =>
              setValue("unit", val as CropProtectionProductUnit)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CROP_PROTECTION_PRODUCT_UNITS.map((unit) => (
                <SelectItem key={unit} value={unit}>
                  {unit}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="description">
            {t("cropProtectionProducts.description")}
          </Label>
          <Textarea id="description" {...register("description")} />
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              navigate({ to: "/field-calendar/crop-protection-products" })
            }
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
