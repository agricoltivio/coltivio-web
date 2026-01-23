import { useForm, Controller, useFieldArray } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { PlusIcon, TrashIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/combobox";

type ComboboxOption = { value: string; label: string };

export interface OrderFormData {
  contactId: string;
  orderDate: string;
  shippingDate: string | null;
  notes: string | null;
  items: { productId: string; quantity: number }[];
}

export interface OrderFormProps {
  contactOptions: ComboboxOption[];
  productOptions: ComboboxOption[];
  onSubmit: (data: OrderFormData) => void;
  isSubmitting?: boolean;
  defaultValues?: {
    contactId?: string;
    orderDate?: string;
    shippingDate?: string | null;
    notes?: string | null;
  };
}

export function OrderForm({
  contactOptions,
  productOptions,
  onSubmit,
  isSubmitting = false,
  defaultValues,
}: OrderFormProps) {
  const { t } = useTranslation();

  const { register, handleSubmit, control } = useForm<OrderFormData>({
    defaultValues: {
      contactId: defaultValues?.contactId || "",
      orderDate: defaultValues?.orderDate || new Date().toISOString().split("T")[0],
      shippingDate: defaultValues?.shippingDate || null,
      notes: defaultValues?.notes || null,
      items: [{ productId: "", quantity: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl">
      {/* Row 1: contact */}
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="contactId">{t("orders.contact")} *</FieldLabel>
          <Controller
            name="contactId"
            control={control}
            rules={{ required: true }}
            render={({ field }) => (
              <Combobox
                items={contactOptions}
                itemToStringValue={(item: ComboboxOption) => item.label}
                value={
                  contactOptions.find((o) => o.value === field.value) || null
                }
                onValueChange={(item: ComboboxOption | null) =>
                  field.onChange(item?.value || "")
                }
              >
                <ComboboxInput id="contactId" placeholder="-" />
                <ComboboxContent>
                  <ComboboxEmpty>{t("common.noResults")}</ComboboxEmpty>
                  <ComboboxList>
                    {(option) => (
                      <ComboboxItem key={option.value} value={option}>
                        {option.label}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            )}
          />
        </Field>
      </FieldGroup>

      {/* Row 2: orderDate, shippingDate */}
      <FieldGroup className="flex-row mt-7">
        <Field>
          <FieldLabel htmlFor="orderDate">{t("orders.orderDate")} *</FieldLabel>
          <Input
            id="orderDate"
            type="date"
            {...register("orderDate", { required: true })}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="shippingDate">{t("orders.shippingDate")}</FieldLabel>
          <Input id="shippingDate" type="date" {...register("shippingDate")} />
        </Field>
      </FieldGroup>

      {/* Row 3: notes */}
      <FieldGroup className="mt-7">
        <Field>
          <FieldLabel htmlFor="notes">{t("orders.notes")}</FieldLabel>
          <Textarea id="notes" rows={3} {...register("notes")} />
        </Field>
      </FieldGroup>

      {/* Line Items Section */}
      <div className="mt-7 border-t pt-6">
        <h3 className="text-sm font-medium mb-4">{t("orders.items")}</h3>

        {fields.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            {t("orders.noItems")}
          </div>
        ) : (
          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-end gap-3">
                <Field className="flex-1">
                  {index === 0 && (
                    <FieldLabel>{t("orders.product")} *</FieldLabel>
                  )}
                  <Controller
                    name={`items.${index}.productId`}
                    control={control}
                    rules={{ required: true }}
                    render={({ field: controllerField }) => (
                      <Combobox
                        items={productOptions}
                        itemToStringValue={(item: ComboboxOption) => item.label}
                        value={
                          productOptions.find(
                            (o) => o.value === controllerField.value
                          ) || null
                        }
                        onValueChange={(item: ComboboxOption | null) =>
                          controllerField.onChange(item?.value || "")
                        }
                      >
                        <ComboboxInput placeholder="-" />
                        <ComboboxContent>
                          <ComboboxEmpty>{t("common.noResults")}</ComboboxEmpty>
                          <ComboboxList>
                            {(option) => (
                              <ComboboxItem key={option.value} value={option}>
                                {option.label}
                              </ComboboxItem>
                            )}
                          </ComboboxList>
                        </ComboboxContent>
                      </Combobox>
                    )}
                  />
                </Field>
                <Field className="w-24">
                  {index === 0 && (
                    <FieldLabel>{t("orders.quantity")} *</FieldLabel>
                  )}
                  <Input
                    type="number"
                    min="1"
                    {...register(`items.${index}.quantity`, {
                      required: true,
                      valueAsNumber: true,
                      min: 1,
                    })}
                  />
                </Field>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                  className="mb-0.5"
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => append({ productId: "", quantity: 1 })}
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          {t("orders.addItem")}
        </Button>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-6">
        <Button type="submit" disabled={isSubmitting}>
          {t("common.save")}
        </Button>
      </div>
    </form>
  );
}
