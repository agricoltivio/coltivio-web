import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { type SponsorshipProgram } from "@/api/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";

export interface SponsorshipProgramFormData {
  name: string;
  description: string | null;
  yearlyCost: number;
}

export interface SponsorshipProgramFormProps {
  sponsorshipProgram?: SponsorshipProgram;
  onSubmit: (data: SponsorshipProgramFormData) => void;
  isSubmitting?: boolean;
}

export function SponsorshipProgramForm({
  sponsorshipProgram,
  onSubmit,
  isSubmitting = false,
}: SponsorshipProgramFormProps) {
  const { t } = useTranslation();

  const { register, handleSubmit } = useForm<SponsorshipProgramFormData>({
    defaultValues: sponsorshipProgram
      ? {
          name: sponsorshipProgram.name,
          description: sponsorshipProgram.description,
          yearlyCost: sponsorshipProgram.yearlyCost,
        }
      : {
          name: "",
          description: null,
          yearlyCost: 0,
        },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-lg">
      {/* Row 1: name */}
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">
            {t("sponsorshipPrograms.name")} *
          </FieldLabel>
          <Input
            id="name"
            type="text"
            {...register("name", { required: true })}
          />
        </Field>
      </FieldGroup>

      {/* Row 2: yearlyCost */}
      <FieldGroup className="mt-7">
        <Field className="max-w-40">
          <FieldLabel htmlFor="yearlyCost">
            {t("sponsorshipPrograms.yearlyCost")} *
          </FieldLabel>
          <Input
            id="yearlyCost"
            type="number"
            step="0.01"
            {...register("yearlyCost", { required: true, valueAsNumber: true })}
          />
        </Field>
      </FieldGroup>

      {/* Row 3: description */}
      <FieldGroup className="mt-7">
        <Field>
          <FieldLabel htmlFor="description">
            {t("sponsorshipPrograms.description")}
          </FieldLabel>
          <Textarea id="description" rows={3} {...register("description")} />
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
