import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { apiClient } from "@/api/client";
import { PageContent } from "@/components/PageContent";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { InvoicePreview } from "@/components/InvoicePreview";

export const Route = createFileRoute("/_authed/orders/invoice-settings/create")({
  component: InvoiceSettingsCreatePage,
});

interface CreateFormData {
  name: string;
  senderName: string;
  street: string;
  zip: string;
  city: string;
  phone: string;
  email: string;
  website: string;
  iban: string;
  bankName: string;
  paymentTermsDays: number;
  introText: string;
  closingText: string;
}

function InvoiceSettingsCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { register, handleSubmit, watch, formState: { errors } } =
    useForm<CreateFormData>({
      defaultValues: {
        name: "",
        senderName: "",
        street: "",
        zip: "",
        city: "",
        phone: "",
        email: "",
        website: "",
        iban: "",
        bankName: "",
        paymentTermsDays: 30,
        introText: "",
        closingText: "",
      },
    });

  const formValues = watch();

  const createMutation = useMutation({
    mutationFn: async (data: CreateFormData) => {
      const response = await apiClient.POST("/v1/orders/invoiceSettings", {
        body: {
          name: data.name,
          senderName: data.senderName,
          street: data.street,
          zip: data.zip,
          city: data.city,
          phone: data.phone || null,
          email: data.email || null,
          website: data.website || null,
          iban: data.iban || null,
          bankName: data.bankName || null,
          paymentTermsDays: data.paymentTermsDays,
          introText: data.introText || null,
          closingText: data.closingText || null,
        },
      });
      if (response.error) throw new Error("Failed to create invoice settings");
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", "invoiceSettings"] });
      navigate({ to: "/orders/invoice-settings" });
    },
  });

  const previewSettings = {
    senderName: formValues.senderName,
    street: formValues.street,
    zip: formValues.zip,
    city: formValues.city,
    phone: formValues.phone || null,
    email: formValues.email || null,
    website: formValues.website || null,
    iban: formValues.iban || null,
    bankName: formValues.bankName || null,
    paymentTermsDays: formValues.paymentTermsDays || 30,
    introText: formValues.introText || null,
    closingText: formValues.closingText || null,
    hasLogo: false,
  };

  return (
    <PageContent
      title={t("orders.createInvoiceSettings")}
      showBackButton
      backTo={() => navigate({ to: "/orders/invoice-settings" })}
    >
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <div className="flex-1 min-w-0">
          <form onSubmit={handleSubmit((data) => createMutation.mutate(data))}>
            <FieldGroup>
              <Field>
                <FieldLabel>{t("common.name")} *</FieldLabel>
                <Input
                  {...register("name", { required: true })}
                  data-invalid={!!errors.name}
                />
              </Field>
              <Field>
                <FieldLabel>{t("orders.senderName")} *</FieldLabel>
                <Input
                  {...register("senderName", { required: true })}
                  data-invalid={!!errors.senderName}
                />
              </Field>
              <Field>
                <FieldLabel>{t("contacts.street")} *</FieldLabel>
                <Input
                  {...register("street", { required: true })}
                  data-invalid={!!errors.street}
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>{t("contacts.zip")} *</FieldLabel>
                  <Input
                    {...register("zip", { required: true })}
                    data-invalid={!!errors.zip}
                  />
                </Field>
                <Field>
                  <FieldLabel>{t("contacts.city")} *</FieldLabel>
                  <Input
                    {...register("city", { required: true })}
                    data-invalid={!!errors.city}
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel>{t("contacts.phone")}</FieldLabel>
                <Input {...register("phone")} />
              </Field>
              <Field>
                <FieldLabel>{t("contacts.email")}</FieldLabel>
                <Input {...register("email")} type="email" />
              </Field>
              <Field>
                <FieldLabel>{t("contacts.website")}</FieldLabel>
                <Input {...register("website")} />
              </Field>
              <Field>
                <FieldLabel>{t("orders.iban")}</FieldLabel>
                <Input {...register("iban")} />
              </Field>
              <Field>
                <FieldLabel>{t("orders.bankName")}</FieldLabel>
                <Input {...register("bankName")} />
              </Field>
              <Field>
                <FieldLabel>{t("orders.paymentTermsDays")} *</FieldLabel>
                <Input
                  {...register("paymentTermsDays", {
                    required: true,
                    valueAsNumber: true,
                    min: 0,
                  })}
                  type="number"
                  data-invalid={!!errors.paymentTermsDays}
                />
              </Field>
              <Field>
                <FieldLabel>{t("orders.introText")}</FieldLabel>
                <Textarea {...register("introText")} rows={3} />
              </Field>
              <Field>
                <FieldLabel>{t("orders.closingText")}</FieldLabel>
                <Textarea {...register("closingText")} rows={3} />
              </Field>
            </FieldGroup>
            <div className="mt-6 flex justify-end">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? t("common.loading") : t("common.create")}
              </Button>
            </div>
          </form>
        </div>

        <div className="lg:sticky lg:top-6" style={{ width: "387px", flexShrink: 0 }}>
          <p className="text-sm font-medium text-muted-foreground mb-3">{t("orders.invoicePreview")}</p>
          <div style={{ transform: "scale(0.65)", transformOrigin: "top left", width: "595px" }}>
            <InvoicePreview settings={previewSettings} />
          </div>
        </div>
      </div>
    </PageContent>
  );
}
