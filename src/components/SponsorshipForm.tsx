import { useForm, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  PREFERRED_COMMUNICATION_OPTIONS,
  type Sponsorship,
  type PreferredCommunication,
} from "@/api/types";
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

export interface SponsorshipFormData {
  contactId: string;
  animalId: string;
  sponsorshipProgramId: string;
  startDate: string;
  endDate: string | null;
  notes: string | null;
  preferredCommunication: PreferredCommunication | null;
}

type ComboboxOption = { value: string; label: string };

export interface SponsorshipFormProps {
  sponsorship?: Sponsorship;
  contactOptions: ComboboxOption[];
  animalOptions: ComboboxOption[];
  typeOptions: ComboboxOption[];
  onSubmit: (data: SponsorshipFormData) => void;
  isSubmitting?: boolean;
}

export function SponsorshipForm({
  sponsorship,
  contactOptions,
  animalOptions,
  typeOptions,
  onSubmit,
  isSubmitting = false,
}: SponsorshipFormProps) {
  const { t } = useTranslation();

  const { register, handleSubmit, control } = useForm<SponsorshipFormData>({
    defaultValues: sponsorship
      ? {
          contactId: sponsorship.contactId,
          animalId: sponsorship.animalId,
          sponsorshipProgramId: sponsorship.sponsorshipProgramId,
          startDate: sponsorship.startDate.split("T")[0],
          endDate: sponsorship.endDate
            ? sponsorship.endDate.split("T")[0]
            : null,
          notes: sponsorship.notes,
          preferredCommunication: sponsorship.preferredCommunication,
        }
      : {
          contactId: "",
          animalId: "",
          sponsorshipProgramId: "",
          startDate: "",
          endDate: null,
          notes: null,
          preferredCommunication: null,
        },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-lg">
      {/* Row 1: contact, animal */}
      <FieldGroup className="flex-row">
        <Field>
          <FieldLabel htmlFor="contactId">
            {t("sponsorships.contact")} *
          </FieldLabel>
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
        <Field>
          <FieldLabel htmlFor="animalId">
            {t("sponsorships.animal")} *
          </FieldLabel>
          <Controller
            name="animalId"
            control={control}
            rules={{ required: true }}
            render={({ field }) => (
              <Combobox
                items={animalOptions}
                itemToStringValue={(item: ComboboxOption) => item.label}
                value={
                  animalOptions.find((o) => o.value === field.value) || null
                }
                onValueChange={(item: ComboboxOption | null) =>
                  field.onChange(item?.value || "")
                }
              >
                <ComboboxInput id="animalId" placeholder="-" />
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

      {/* Row 2: type */}
      <FieldGroup className="mt-7">
        <Field>
          <FieldLabel htmlFor="sponsorshipProgramId">
            {t("sponsorships.type")} *
          </FieldLabel>
          <Controller
            name="sponsorshipProgramId"
            control={control}
            rules={{ required: true }}
            render={({ field }) => (
              <Combobox
                items={typeOptions}
                itemToStringValue={(item: ComboboxOption) => item.label}
                value={typeOptions.find((o) => o.value === field.value) || null}
                onValueChange={(item: ComboboxOption | null) =>
                  field.onChange(item?.value || "")
                }
              >
                <ComboboxInput id="sponsorshipProgramId" placeholder="-" />
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

      {/* Row 3: startDate, endDate */}
      <FieldGroup className="flex-row mt-7">
        <Field>
          <FieldLabel htmlFor="startDate">
            {t("sponsorships.startDate")} *
          </FieldLabel>
          <Input
            id="startDate"
            type="date"
            {...register("startDate", { required: true })}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="endDate">{t("sponsorships.endDate")}</FieldLabel>
          <Input id="endDate" type="date" {...register("endDate")} />
        </Field>
      </FieldGroup>

      {/* Row 4: preferredCommunication */}
      <FieldGroup className="mt-7">
        <Field className="max-w-48">
          <FieldLabel htmlFor="preferredCommunication">
            {t("sponsorships.preferredCommunication")}
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

      {/* Row 5: notes */}
      <FieldGroup className="mt-7">
        <Field>
          <FieldLabel htmlFor="notes">{t("sponsorships.notes")}</FieldLabel>
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
