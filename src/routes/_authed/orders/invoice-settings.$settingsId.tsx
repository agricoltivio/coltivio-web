import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { useEffect, useRef } from "react";
import { apiClient } from "@/api/client";
import { invoiceSettingQueryOptions, invoiceSettingsQueryOptions } from "@/api/orders.queries";
import { PageContent } from "@/components/PageContent";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { InvoicePreview } from "@/components/InvoicePreview";

export const Route = createFileRoute("/_authed/orders/invoice-settings/$settingsId")({
  loader: ({ params, context: { queryClient } }) => {
    return queryClient.ensureQueryData(invoiceSettingQueryOptions(params.settingsId));
  },
  component: InvoiceSettingDetailPage,
});

interface InvoiceSettingsFormData {
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

function InvoiceSettingDetailPage() {
  const { t } = useTranslation();
  const { settingsId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const settingsQuery = useQuery(invoiceSettingQueryOptions(settingsId));
  const settings = settingsQuery.data;

  const { register, handleSubmit, reset, watch, formState: { errors } } =
    useForm<InvoiceSettingsFormData>({
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

  useEffect(() => {
    if (settings) {
      reset({
        name: settings.name,
        senderName: settings.senderName,
        street: settings.street,
        zip: settings.zip,
        city: settings.city,
        phone: settings.phone ?? "",
        email: settings.email ?? "",
        website: settings.website ?? "",
        iban: settings.iban ?? "",
        bankName: settings.bankName ?? "",
        paymentTermsDays: settings.paymentTermsDays,
        introText: settings.introText ?? "",
        closingText: settings.closingText ?? "",
      });
    }
  }, [settings, reset]);

  const formValues = watch();

  const saveMutation = useMutation({
    mutationFn: async (data: InvoiceSettingsFormData) => {
      const response = await apiClient.PUT("/v1/orders/invoiceSettings/{id}", {
        params: { path: { id: settingsId } },
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
      if (response.error) throw new Error("Failed to save invoice settings");
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", "invoiceSettings"] });
      navigate({ to: "/orders/invoice-settings" });
    },
  });

  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const mimeType = file.type === "image/png" ? "png" : "jpg";
      const response = await apiClient.PUT("/v1/orders/invoiceSettings/{id}/logo", {
        params: { path: { id: settingsId } },
        body: { base64, mimeType },
      });
      if (response.error) throw new Error("Failed to upload logo");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", "invoiceSettings"] });
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
  });

  const deleteLogoMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.DELETE("/v1/orders/invoiceSettings/{id}/logo", {
        params: { path: { id: settingsId } },
      });
      if (response.error) throw new Error("Failed to delete logo");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", "invoiceSettings"] });
    },
  });

  // Build preview settings from live form values + persisted hasLogo
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
    hasLogo: settings?.hasLogo ?? false,
  };

  return (
    <PageContent title={settings?.name ?? t("orders.invoiceSettings")} backTo={() => navigate({ to: "/orders/invoice-settings" })} showBackButton>
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Left: form + logo */}
        <div className="flex-1 min-w-0">
          {/* Logo upload section */}
          <div className="mb-6 rounded-md border p-4">
            <p className="text-sm font-medium mb-3">{t("orders.logo")}</p>
            {settings?.hasLogo ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">{t("orders.logoUploaded")}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadLogoMutation.isPending}
                >
                  {t("orders.replaceLogo")}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteLogoMutation.mutate()}
                  disabled={deleteLogoMutation.isPending}
                >
                  {t("common.delete")}
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadLogoMutation.isPending}
              >
                {uploadLogoMutation.isPending ? t("common.loading") : t("orders.uploadLogo")}
              </Button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadLogoMutation.mutate(file);
              }}
            />
          </div>

          <form onSubmit={handleSubmit((data) => saveMutation.mutate(data))}>
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
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? t("common.loading") : t("common.save")}
              </Button>
            </div>
          </form>
        </div>

        {/* Right: live preview */}
        {/* Outer div constrains layout width to the visual scaled size (595 × 0.65 ≈ 387px)
            because CSS transform does not affect document flow */}
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
