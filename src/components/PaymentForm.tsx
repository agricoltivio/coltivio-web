import { useForm, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { PAYMENT_METHODS, type Payment, type PaymentMethod } from "@/api/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/combobox";

export interface PaymentFormData {
  contactId: string;
  sponsorshipId: string | null;
  orderId: string | null;
  date: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  notes: string | null;
}

type ComboboxOption = { value: string; label: string };

export interface PaymentFormProps {
  payment?: Payment;
  contactOptions: ComboboxOption[];
  sponsorshipOptions: ComboboxOption[];
  orderOptions: ComboboxOption[];
  onSubmit: (data: PaymentFormData) => void;
  isSubmitting?: boolean;
  defaultValues?: {
    contactId?: string;
    sponsorshipId?: string;
    orderId?: string;
  };
}

export function PaymentForm({
  payment,
  contactOptions,
  sponsorshipOptions,
  orderOptions,
  onSubmit,
  isSubmitting = false,
  defaultValues: initialDefaults,
}: PaymentFormProps) {
  const { t } = useTranslation();

  const { register, handleSubmit, control, watch } = useForm<PaymentFormData>({
    defaultValues: payment
      ? {
          contactId: payment.contactId,
          sponsorshipId: payment.sponsorshipId,
          orderId: payment.orderId,
          date: payment.date.split("T")[0],
          amount: payment.amount,
          currency: payment.currency,
          method: payment.method,
          notes: payment.notes,
        }
      : {
          contactId: initialDefaults?.contactId || "",
          sponsorshipId: initialDefaults?.sponsorshipId || null,
          orderId: initialDefaults?.orderId || null,
          date: new Date().toISOString().split("T")[0],
          amount: 0,
          currency: "CHF",
          method: "bank_transfer",
          notes: null,
        },
  });

  const sponsorshipId = watch("sponsorshipId");
  const orderId = watch("orderId");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-lg">
      {/* Row 1: contact */}
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="contactId">{t("payments.contact")} *</FieldLabel>
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

      {/* Row 2: sponsorship (optional, hidden if order is selected) */}
      {!orderId && (
        <FieldGroup className="mt-7">
          <Field>
            <FieldLabel htmlFor="sponsorshipId">
              {t("payments.sponsorship")}
            </FieldLabel>
            <Controller
              name="sponsorshipId"
              control={control}
              render={({ field }) => (
                <Combobox
                  items={sponsorshipOptions}
                  itemToStringValue={(item: ComboboxOption) => item.label}
                  value={
                    sponsorshipOptions.find((o) => o.value === field.value) ||
                    null
                  }
                  onValueChange={(item: ComboboxOption | null) =>
                    field.onChange(item?.value || null)
                  }
                >
                  <ComboboxInput
                    id="sponsorshipId"
                    placeholder="-"
                    showClear={!!field.value}
                  />
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
      )}

      {/* Row 2b: order (optional, hidden if sponsorship is selected) */}
      {!sponsorshipId && (
        <FieldGroup className="mt-7">
          <Field>
            <FieldLabel htmlFor="orderId">{t("payments.order")}</FieldLabel>
            <Controller
              name="orderId"
              control={control}
              render={({ field }) => (
                <Combobox
                  items={orderOptions}
                  itemToStringValue={(item: ComboboxOption) => item.label}
                  value={
                    orderOptions.find((o) => o.value === field.value) || null
                  }
                  onValueChange={(item: ComboboxOption | null) =>
                    field.onChange(item?.value || null)
                  }
                >
                  <ComboboxInput
                    id="orderId"
                    placeholder="-"
                    showClear={!!field.value}
                  />
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
      )}

      {/* Row 3: date, amount, currency */}
      <FieldGroup className="flex-row mt-7">
        <Field>
          <FieldLabel htmlFor="date">{t("payments.date")} *</FieldLabel>
          <Input
            id="date"
            type="date"
            {...register("date", { required: true })}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="amount">{t("payments.amount")} *</FieldLabel>
          <Input
            id="amount"
            type="number"
            step="0.01"
            {...register("amount", { required: true, valueAsNumber: true })}
          />
        </Field>
        <Field className="max-w-24">
          <FieldLabel htmlFor="currency">{t("payments.currency")}</FieldLabel>
          <Input id="currency" type="text" {...register("currency")} />
        </Field>
      </FieldGroup>

      {/* Row 4: method */}
      <FieldGroup className="mt-7">
        <Field className="max-w-48">
          <FieldLabel htmlFor="method">{t("payments.method")} *</FieldLabel>
          <Controller
            name="method"
            control={control}
            rules={{ required: true }}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="method" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method} value={method}>
                      {t(`payments.methods.${method}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      </FieldGroup>

      {/* Row 5: notes */}
      <FieldGroup className="mt-7">
        <Field>
          <FieldLabel htmlFor="notes">{t("payments.notes")}</FieldLabel>
          <Textarea id="notes" rows={3} {...register("notes")} />
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
