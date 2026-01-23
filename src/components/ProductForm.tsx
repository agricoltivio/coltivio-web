import { useForm, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_UNITS,
  type Product,
  type ProductCategory,
  type ProductUnit,
} from "@/api/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface ProductFormData {
  name: string;
  category: ProductCategory;
  unit: ProductUnit;
  pricePerUnit: number;
  stock: number;
  description: string | null;
  active: boolean;
}

export interface ProductFormProps {
  product?: Product;
  onSubmit: (data: ProductFormData) => void;
  isSubmitting?: boolean;
}

export function ProductForm({
  product,
  onSubmit,
  isSubmitting = false,
}: ProductFormProps) {
  const { t } = useTranslation();

  const { register, handleSubmit, control } = useForm<ProductFormData>({
    defaultValues: product
      ? {
          name: product.name,
          category: product.category,
          unit: product.unit,
          pricePerUnit: product.pricePerUnit,
          description: product.description,
          active: product.active,
        }
      : {
          name: "",
          category: "other",
          unit: "piece",
          pricePerUnit: 0,
          description: null,
          active: true,
        },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-lg">
      {/* Row 1: name, category */}
      <FieldGroup className="flex-row">
        <Field className="flex-1">
          <FieldLabel htmlFor="name">{t("products.name")} *</FieldLabel>
          <Input
            id="name"
            type="text"
            {...register("name", { required: true })}
          />
        </Field>
        <Field className="max-w-48">
          <FieldLabel htmlFor="category">{t("products.category")} *</FieldLabel>
          <Controller
            name="category"
            control={control}
            rules={{ required: true }}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {t(`products.categories.${category}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      </FieldGroup>

      {/* Row 2: pricePerUnit, unit, stock */}
      <FieldGroup className="flex-row mt-7">
        <Field>
          <FieldLabel htmlFor="pricePerUnit">
            {t("products.pricePerUnit")} *
          </FieldLabel>
          <Input
            id="pricePerUnit"
            type="number"
            step="0.01"
            {...register("pricePerUnit", {
              required: true,
              valueAsNumber: true,
            })}
          />
        </Field>
        <Field className="max-w-32">
          <FieldLabel htmlFor="unit">{t("products.unit")} *</FieldLabel>
          <Controller
            name="unit"
            control={control}
            rules={{ required: true }}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="unit" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_UNITS.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {t(`products.units.${unit}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      </FieldGroup>

      {/* Row 3: description */}
      <FieldGroup className="mt-7">
        <Field>
          <FieldLabel htmlFor="description">
            {t("products.description")}
          </FieldLabel>
          <Textarea id="description" rows={3} {...register("description")} />
        </Field>
      </FieldGroup>

      {/* Row 4: active */}
      <FieldGroup className="mt-7">
        <Field className="flex flex-row items-center gap-2 max-w-4">
          <Controller
            name="active"
            control={control}
            render={({ field }) => (
              <Checkbox
                id="active"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <FieldLabel htmlFor="active" className="mb-0">
            {t("products.active")}
          </FieldLabel>
        </Field>
      </FieldGroup>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-6">
        <Button type="submit" disabled={isSubmitting}>
          {t("common.save")}
        </Button>
      </div>
    </form>
  );
}
