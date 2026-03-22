import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { apiClient } from "@/api/client";
import { cropProtectionProductQueryOptions } from "@/api/cropProtectionProducts.queries";
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
  "/_authed/field-calendar/crop-protection-products_/$cropProtectionProductId_/edit",
)({
  loader: ({ params, context: { queryClient } }) => {
    return queryClient.ensureQueryData(
      cropProtectionProductQueryOptions(params.cropProtectionProductId),
    );
  },
  component: EditCropProtectionProductPage,
});

type ProductFormData = {
  name: string;
  unit: CropProtectionProductUnit;
  description: string;
};

function EditCropProtectionProductPage() {
  const { t } = useTranslation();
  const { cropProtectionProductId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const product = useQuery(
    cropProtectionProductQueryOptions(cropProtectionProductId),
  ).data!;

  const { register, handleSubmit, setValue, watch } = useForm<ProductFormData>({
    defaultValues: {
      name: product.name,
      unit: product.unit,
      description: product.description ?? "",
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const response = await apiClient.PATCH(
        "/v1/cropProtectionProducts/byId/{cropProtectionProductId}",
        {
          params: { path: { cropProtectionProductId } },
          body: {
            name: data.name,
            unit: data.unit,
            description: data.description || undefined,
          },
        },
      );
      if (response.error) {
        throw new Error("Failed to update crop protection product");
      }
      return response.data.data;
    },
    onSuccess: () => {
      navigate({
        to: "/field-calendar/crop-protection-products/$cropProtectionProductId",
        params: { cropProtectionProductId },
      });
      queryClient.invalidateQueries({ queryKey: ["cropProtectionProducts"] });
    },
  });

  return (
    <PageContent
      title={t("cropProtectionProducts.editProduct")}
      showBackButton
      backTo={() =>
        navigate({
          to: "/field-calendar/crop-protection-products/$cropProtectionProductId",
          params: { cropProtectionProductId },
        })
      }
    >
      <form
        onSubmit={handleSubmit((data) => updateMutation.mutate(data))}
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
              navigate({
                to: "/field-calendar/crop-protection-products/$cropProtectionProductId",
                params: { cropProtectionProductId },
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
