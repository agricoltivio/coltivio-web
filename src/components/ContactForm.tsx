import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import {
  PREFERRED_COMMUNICATION_OPTIONS,
  type Contact,
  type PreferredCommunication,
} from "@/api/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface ContactFormData {
  firstName: string;
  lastName: string;
  street: string | null;
  city: string | null;
  zip: string | null;
  phone: string | null;
  email: string | null;
  preferredCommunication: PreferredCommunication | null;
  labels: string[];
}

export interface ContactFormProps {
  contact?: Contact;
  onSubmit: (data: ContactFormData) => void;
  isSubmitting?: boolean;
}

export function ContactForm({
  contact,
  onSubmit,
  isSubmitting = false,
}: ContactFormProps) {
  const { t } = useTranslation();
  const [labelInput, setLabelInput] = useState("");

  const { register, handleSubmit, control, watch, setValue } =
    useForm<ContactFormData>({
      defaultValues: contact
        ? {
            firstName: contact.firstName,
            lastName: contact.lastName,
            street: contact.street,
            city: contact.city,
            zip: contact.zip,
            phone: contact.phone,
            email: contact.email,
            preferredCommunication: contact.preferredCommunication,
            labels: contact.labels || [],
          }
        : {
            firstName: "",
            lastName: "",
            street: null,
            city: null,
            zip: null,
            phone: null,
            email: null,
            preferredCommunication: null,
            labels: [],
          },
    });

  const labels = watch("labels");

  function addLabel() {
    const trimmed = labelInput.trim();
    if (trimmed && !labels.includes(trimmed)) {
      setValue("labels", [...labels, trimmed]);
      setLabelInput("");
    }
  }

  function removeLabel(labelToRemove: string) {
    setValue(
      "labels",
      labels.filter((l) => l !== labelToRemove),
    );
  }

  function handleLabelKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      addLabel();
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-lg">
      {/* Row 1: firstName, lastName */}
      <FieldGroup className="flex-row">
        <Field>
          <FieldLabel htmlFor="firstName">
            {t("contacts.firstName")} *
          </FieldLabel>
          <Input
            id="firstName"
            type="text"
            {...register("firstName", { required: true })}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="lastName">{t("contacts.lastName")} *</FieldLabel>
          <Input
            id="lastName"
            type="text"
            {...register("lastName", { required: true })}
          />
        </Field>
      </FieldGroup>

      {/* Row 2: street */}
      <FieldGroup className="mt-7">
        <Field>
          <FieldLabel htmlFor="street">{t("contacts.street")}</FieldLabel>
          <Input id="street" type="text" {...register("street")} />
        </Field>
      </FieldGroup>

      {/* Row 3: zip, city */}
      <FieldGroup className="flex-row mt-7">
        <Field className="max-w-24">
          <FieldLabel htmlFor="zip">{t("contacts.zip")}</FieldLabel>
          <Input id="zip" type="text" {...register("zip")} />
        </Field>
        <Field>
          <FieldLabel htmlFor="city">{t("contacts.city")}</FieldLabel>
          <Input id="city" type="text" {...register("city")} />
        </Field>
      </FieldGroup>

      {/* Row 4: phone, email */}
      <FieldGroup className="flex-row mt-7">
        <Field>
          <FieldLabel htmlFor="phone">{t("contacts.phone")}</FieldLabel>
          <Input id="phone" type="tel" {...register("phone")} />
        </Field>
        <Field>
          <FieldLabel htmlFor="email">{t("contacts.email")}</FieldLabel>
          <Input id="email" type="email" {...register("email")} />
        </Field>
      </FieldGroup>

      {/* Row 5: preferredCommunication */}
      <FieldGroup className="mt-7">
        <Field className="max-w-48">
          <FieldLabel htmlFor="preferredCommunication">
            {t("contacts.preferredCommunication")}
          </FieldLabel>
          <Controller
            name="preferredCommunication"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value || ""}
                onValueChange={(value) => field.onChange(value || null)}
              >
                <SelectTrigger id="preferredCommunication" className="w-full">
                  <SelectValue placeholder="-" />
                </SelectTrigger>
                <SelectContent>
                  {PREFERRED_COMMUNICATION_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {t(`contacts.preferredCommunicationOptions.${option}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      </FieldGroup>

      {/* Row 6: labels */}
      <FieldGroup className="mt-7">
        <Field>
          <FieldLabel htmlFor="labelInput">{t("contacts.labels")}</FieldLabel>
          <div className="flex gap-2">
            <Input
              id="labelInput"
              type="text"
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              onKeyDown={handleLabelKeyDown}
              placeholder="Label eingeben..."
            />
            <Button type="button" variant="outline" onClick={addLabel}>
              +
            </Button>
          </div>
          {labels.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {labels.map((label) => (
                <Badge key={label} variant="secondary" className="gap-1">
                  {label}
                  <button
                    type="button"
                    onClick={() => removeLabel(label)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
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
