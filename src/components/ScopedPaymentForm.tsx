import { useForm, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { PAYMENT_METHODS, type PaymentMethod, type ScopedPayment } from "@/api/types";
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

export interface ScopedPaymentFormData {
  date: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  notes: string | null;
}

export interface ScopedPaymentFormProps {
  payment?: ScopedPayment;
  onSubmit: (data: ScopedPaymentFormData) => void;
  isSubmitting?: boolean;
}

export function ScopedPaymentForm({
  payment,
  onSubmit,
  isSubmitting = false,
}: ScopedPaymentFormProps) {
  const { t } = useTranslation();

  const { register, handleSubmit, control } = useForm<ScopedPaymentFormData>({
    defaultValues: payment
      ? {
          date: payment.date.split("T")[0],
          amount: payment.amount,
          currency: payment.currency,
          method: payment.method,
          notes: payment.notes,
        }
      : {
          date: new Date().toISOString().split("T")[0],
          amount: 0,
          currency: "CHF",
          method: "bank_transfer",
          notes: null,
        },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-lg">
      <FieldGroup className="flex-row">
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

      <FieldGroup className="mt-7">
        <Field>
          <FieldLabel htmlFor="notes">{t("payments.notes")}</FieldLabel>
          <Textarea id="notes" rows={3} {...register("notes")} />
        </Field>
      </FieldGroup>

      <div className="flex justify-end gap-3 pt-6">
        <Button type="submit" disabled={isSubmitting}>
          {t("common.save")}
        </Button>
      </div>
    </form>
  );
}
