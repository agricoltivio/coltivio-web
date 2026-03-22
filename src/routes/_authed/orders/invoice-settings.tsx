import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { useEffect, useRef } from "react";
import { apiClient } from "@/api/client";
import { invoiceSettingsQueryOptions } from "@/api/orders.queries";
import { PageContent } from "@/components/PageContent";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";

export const Route = createFileRoute("/_authed/orders/invoice-settings")({
  loader: ({ context: { queryClient } }) => {
    return queryClient.ensureQueryData(invoiceSettingsQueryOptions());
  },
  component: InvoiceSettingsPage,
});

interface InvoiceSettingsFormData {
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

function InvoiceSettingsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const settingsQuery = useQuery(invoiceSettingsQueryOptions());
  const settings = settingsQuery.data;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, reset, formState: { errors } } =
    useForm<InvoiceSettingsFormData>({
      defaultValues: {
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

  const saveMutation = useMutation({
    mutationFn: async (data: InvoiceSettingsFormData) => {
      const response = await apiClient.PUT("/v1/orders/invoiceSettings", {
        body: {
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
    },
  });

  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      // Read file as base64 and determine mimeType
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          // result is "data:image/png;base64,<data>" — strip the prefix
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const mimeType = file.type === "image/png" ? "png" : "jpg";
      const response = await apiClient.PUT("/v1/orders/invoiceSettings/logo", {
        body: { base64, mimeType },
      });
      if (response.error) throw new Error("Failed to upload logo");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", "invoiceSettings"] });
      // Reset file input so the same file can be re-selected if needed
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
  });

  const deleteLogoMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.DELETE("/v1/orders/invoiceSettings/logo");
      if (response.error) throw new Error("Failed to delete logo");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", "invoiceSettings"] });
    },
  });

  return (
    <PageContent title={t("orders.invoiceSettings")}>
      {/* Logo upload section — separate from the main settings form */}
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
    </PageContent>
  );
}
