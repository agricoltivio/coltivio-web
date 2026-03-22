import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PlusIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { cropProtectionApplicationsQueryOptions } from "@/api/cropProtectionApplications.queries";
import { cropProtectionProductsQueryOptions } from "@/api/cropProtectionProducts.queries";
import type {
  CropProtectionApplication,
  FertilizerApplication,
} from "@/api/types";
import {
  CROP_PROTECTION_PRODUCT_UNITS,
  type CropProtectionProductUnit,
} from "@/api/types";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

type CropProtectionMethod = NonNullable<CropProtectionApplication["method"]>;
type ApplicationUnit = FertilizerApplication["unit"];

const CROP_PROTECTION_METHODS: CropProtectionMethod[] = [
  "spraying",
  "misting",
  "broadcasting",
  "injecting",
  "other",
];

const APPLICATION_UNITS: ApplicationUnit[] = [
  "load",
  "bag",
  "total_amount",
  "amount_per_hectare",
  "other",
];

export const Route = createFileRoute(
  "/_authed/field-calendar/crop-protection-applications_/$id/edit",
)({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(cropProtectionProductsQueryOptions());
    queryClient.ensureQueryData(cropProtectionApplicationsQueryOptions());
  },
  component: EditCropProtectionApplication,
});

type FormData = {
  productId: string;
  dateTime: string;
  method: CropProtectionMethod | "";
  unit: ApplicationUnit;
  amountPerUnit: string;
  numberOfUnits: string;
  additionalNotes: string;
};

type ProductModalFormData = {
  name: string;
  unit: CropProtectionProductUnit;
  description: string;
};

function EditCropProtectionApplication() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = Route.useParams();

  const [createProductOpen, setCreateProductOpen] = useState(false);

  const allAppsQuery = useQuery(cropProtectionApplicationsQueryOptions());
  const productsQuery = useQuery(cropProtectionProductsQueryOptions());

  // Find the specific app from the list
  const app = allAppsQuery.data?.result.find((a) => a.id === id);

  const { register, handleSubmit, setValue, watch, reset } = useForm<FormData>({
    defaultValues: {
      productId: "",
      dateTime: "",
      method: "spraying",
      unit: "total_amount",
      amountPerUnit: "0",
      numberOfUnits: "1",
      additionalNotes: "",
    },
  });

  const productForm = useForm<ProductModalFormData>({
    defaultValues: { name: "", unit: "ml", description: "" },
  });

  useEffect(() => {
    if (app) {
      reset({
        productId: app.productId,
        dateTime: app.dateTime.slice(0, 16),
        method: app.method ?? "spraying",
        unit: app.unit,
        amountPerUnit: app.amountPerUnit.toString(),
        numberOfUnits: app.numberOfUnits.toString(),
        additionalNotes: app.additionalNotes ?? "",
      });
    }
  }, [app, reset]);

  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiClient.PATCH(
        "/v1/cropProtectionApplications/byId/{cropProtectionApplicationId}",
        {
          params: { path: { cropProtectionApplicationId: id } },
          body: {
            productId: data.productId || undefined,
            dateTime: data.dateTime
              ? new Date(data.dateTime).toISOString()
              : undefined,
            method: data.method || undefined,
            unit: data.unit,
            amountPerUnit: parseFloat(data.amountPerUnit),
            numberOfUnits: parseFloat(data.numberOfUnits),
            additionalNotes: data.additionalNotes || undefined,
          },
        },
      );
      if (response.error) {
        throw new Error("Failed to update crop protection application");
      }
      return response.data.data;
    },
    onSuccess: () => {
      navigate({ to: "/field-calendar/crop-protection-applications" });
      queryClient.invalidateQueries({
        queryKey: ["cropProtectionApplications"],
      });
    },
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: ProductModalFormData) => {
      const response = await apiClient.POST("/v1/cropProtectionProducts", {
        body: {
          name: data.name,
          unit: data.unit,
          description: data.description || undefined,
        },
      });
      if (response.error)
        throw new Error("Failed to create crop protection product");
      return response.data.data;
    },
    onSuccess: (newProduct) => {
      queryClient.setQueryData(
        cropProtectionProductsQueryOptions().queryKey,
        (old) => {
          if (!old) return old;
          return { ...old, result: [...old.result, newProduct] };
        },
      );
      queryClient.invalidateQueries({ queryKey: ["cropProtectionProducts"] });
      setValue("productId", newProduct.id);
      setCreateProductOpen(false);
      productForm.reset();
    },
  });

  const products = productsQuery.data?.result ?? [];
  const watchedProductId = watch("productId");
  const watchedMethod = watch("method");
  const watchedUnit = watch("unit");

  return (
    <PageContent
      title={t("fieldCalendar.cropProtectionApplications.edit")}
      showBackButton
      backTo={() =>
        navigate({ to: "/field-calendar/crop-protection-applications" })
      }
    >
      <form
        onSubmit={handleSubmit((data) => updateMutation.mutate(data))}
        className="space-y-4 max-w-lg"
      >
        <div className="space-y-1">
          <Label>{t("fieldCalendar.cropProtectionApplications.product")}</Label>
          <div className="flex gap-1">
            <div className="flex-1 min-w-0">
            <Select
              value={watchedProductId}
              onValueChange={(v) => { if (v) setValue("productId", v); }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setCreateProductOpen(true)}
            >
              <PlusIcon className="size-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-1">
          <Label>{t("fieldCalendar.cropProtectionApplications.date")}</Label>
          <Input
            type="datetime-local"
            {...register("dateTime", { required: true })}
          />
        </div>

        <div className="space-y-1">
          <Label>{t("fieldCalendar.cropProtectionApplications.method")}</Label>
          <Select
            value={watchedMethod}
            onValueChange={(v) =>
              setValue("method", v as CropProtectionMethod | "")
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CROP_PROTECTION_METHODS.map((method) => (
                <SelectItem key={method} value={method}>
                  {t(
                    `fieldCalendar.cropProtectionApplications.methods.${method}`,
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>{t("fieldCalendar.fertilizerApplications.unit")}</Label>
            <Select
              value={watchedUnit}
              onValueChange={(v) => setValue("unit", v as ApplicationUnit)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APPLICATION_UNITS.map((unit) => (
                  <SelectItem key={unit} value={unit}>
                    {t(`fieldCalendar.fertilizerApplications.units.${unit}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>{t("fieldCalendar.harvests.numberOfUnits")}</Label>
            <Input
              type="number"
              min={1}
              {...register("numberOfUnits", { required: true })}
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label>
            {t("fieldCalendar.fertilizerApplications.amountPerUnit")}
          </Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            {...register("amountPerUnit", { required: true })}
          />
        </div>

        <div className="space-y-1">
          <Label>{t("fieldCalendar.tillages.notes")}</Label>
          <Textarea {...register("additionalNotes")} rows={3} />
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={updateMutation.isPending}>
            {t("common.save")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              navigate({ to: "/field-calendar/crop-protection-applications" })
            }
          >
            {t("common.cancel")}
          </Button>
        </div>
      </form>

      {/* Inline create product dialog */}
      <Dialog
        open={createProductOpen}
        onOpenChange={(open) => {
          setCreateProductOpen(open);
          if (!open) productForm.reset();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("cropProtectionProducts.createProduct")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>{t("cropProtectionProducts.name")} *</Label>
              <Input
                {...productForm.register("name", { required: true })}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("cropProtectionProducts.unit")} *</Label>
              <Select
                value={productForm.watch("unit")}
                onValueChange={(v) =>
                  productForm.setValue("unit", v as CropProtectionProductUnit)
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
              <Label>{t("cropProtectionProducts.description")}</Label>
              <Textarea {...productForm.register("description")} />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateProductOpen(false);
                productForm.reset();
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={productForm.handleSubmit((data) =>
                createProductMutation.mutate(data),
              )}
              disabled={createProductMutation.isPending}
            >
              {t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContent>
  );
}
