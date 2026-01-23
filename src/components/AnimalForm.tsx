import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  ANIMAL_TYPES,
  ANIMAL_SEX_OPTIONS,
  DEATH_REASONS,
  type Animal,
  type AnimalType,
  type AnimalSex,
  type DeathReason,
} from "@/api/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

export interface AnimalFormData {
  name: string;
  type: AnimalType;
  sex: AnimalSex;
  dateOfBirth: string;
  earTagId: string | null;
  motherId: string | null;
  fatherId: string | null;
  dateOfDeath: string | null;
  deathReason: DeathReason | null;
}

type ComboboxOption = { value: string; label: string };

export interface AnimalFormProps {
  animal?: Animal;
  earTagOptions: ComboboxOption[];
  motherOptions: ComboboxOption[];
  fatherOptions: ComboboxOption[];
  onSubmit: (data: AnimalFormData) => void;
  isSubmitting?: boolean;
}

export function AnimalForm({
  animal,
  earTagOptions,
  motherOptions,
  fatherOptions,
  onSubmit,
  isSubmitting = false,
}: AnimalFormProps) {
  const { t } = useTranslation();

  const { register, handleSubmit, control, watch, setValue } =
    useForm<AnimalFormData>({
      defaultValues: animal
        ? {
            name: animal.name,
            type: animal.type,
            sex: animal.sex,
            dateOfBirth: animal.dateOfBirth.split("T")[0],
            earTagId: animal.earTagId,
            motherId: animal.motherId,
            fatherId: animal.fatherId,
            dateOfDeath: animal.dateOfDeath
              ? animal.dateOfDeath.split("T")[0]
              : null,
            deathReason: animal.deathReason,
          }
        : {
            name: "",
            type: "goat",
            sex: "female",
            dateOfBirth: "",
            earTagId: null,
            motherId: null,
            fatherId: null,
            dateOfDeath: null,
            deathReason: null,
          },
    });

  const dateOfDeath = watch("dateOfDeath");

  // Clear death reason when date of death is cleared
  useEffect(() => {
    if (!dateOfDeath) {
      setValue("deathReason", null);
    }
  }, [dateOfDeath, setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-lg">
      <FieldGroup className="flex-row">
        {/* Name */}
        <Field>
          <FieldLabel htmlFor="name">{t("animals.name")} *</FieldLabel>
          <Input
            id="name"
            type="text"
            {...register("name", { required: true })}
          />
        </Field>

        {/* Type */}
        <Field className="max-w-40">
          <FieldLabel htmlFor="type">{t("animals.type")} *</FieldLabel>
          <Controller
            name="type"
            control={control}
            rules={{ required: true }}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ANIMAL_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(`animals.types.${type}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      </FieldGroup>
      <FieldGroup className="flex-row mt-7">
        <Field className="max-w-40">
          <FieldLabel htmlFor="sex">{t("animals.sex")} *</FieldLabel>
          <Controller
            name="sex"
            control={control}
            rules={{ required: true }}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="sex" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ANIMAL_SEX_OPTIONS.map((sex) => (
                    <SelectItem key={sex} value={sex}>
                      {t(`animals.sexOptions.${sex}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="earTagId">{t("animals.earTag")}</FieldLabel>
          <Controller
            name="earTagId"
            control={control}
            render={({ field }) => (
              <Combobox
                items={earTagOptions}
                itemToStringValue={(item: ComboboxOption) => item.label}
                value={
                  earTagOptions.find((o) => o.value === field.value) || null
                }
                onValueChange={(item: ComboboxOption | null) =>
                  field.onChange(item?.value || null)
                }
              >
                <ComboboxInput
                  id="earTagId"
                  placeholder={t("animals.noEarTag")}
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

        {/* Date of Birth */}
      </FieldGroup>
      <FieldGroup className="flex-row mt-7">
        <Field>
          <FieldLabel htmlFor="dateOfBirth">
            {t("animals.dateOfBirth")} *
          </FieldLabel>
          <Input
            id="dateOfBirth"
            type="date"
            {...register("dateOfBirth", { required: true })}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="dateOfDeath">
            {t("animals.dateOfDeath")}
          </FieldLabel>
          <Input id="dateOfDeath" type="date" {...register("dateOfDeath")} />
        </Field>

        {/* Death Reason (only show if date of death is set) */}
        {dateOfDeath && (
          <Field>
            <FieldLabel htmlFor="deathReason">
              {t("animals.deathReason")}
            </FieldLabel>
            <Controller
              name="deathReason"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value || ""}
                  onValueChange={(value) => field.onChange(value || null)}
                >
                  <SelectTrigger id="deathReason" className="w-full">
                    <SelectValue placeholder="-" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEATH_REASONS.map((reason) => (
                      <SelectItem key={reason} value={reason}>
                        {t(`animals.deathReasons.${reason}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        )}
      </FieldGroup>
      <FieldGroup className="flex-row mt-7">
        <Field>
          <FieldLabel htmlFor="motherId">{t("animals.mother")}</FieldLabel>
          <Controller
            name="motherId"
            control={control}
            render={({ field }) => (
              <Combobox
                items={motherOptions}
                itemToStringValue={(item: ComboboxOption) => item.label}
                value={
                  motherOptions.find((o) => o.value === field.value) || null
                }
                onValueChange={(item: ComboboxOption | null) =>
                  field.onChange(item?.value || null)
                }
              >
                <ComboboxInput
                  id="motherId"
                  placeholder={t("animals.noMother")}
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

        {/* Father */}
        <Field>
          <FieldLabel htmlFor="fatherId">{t("animals.father")}</FieldLabel>
          <Controller
            name="fatherId"
            control={control}
            render={({ field }) => (
              <Combobox
                items={fatherOptions}
                itemToStringValue={(item: ComboboxOption) => item.label}
                value={
                  fatherOptions.find((o) => o.value === field.value) || null
                }
                onValueChange={(item: ComboboxOption | null) =>
                  field.onChange(item?.value || null)
                }
              >
                <ComboboxInput
                  id="fatherId"
                  placeholder={t("animals.noFather")}
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

        {/* Actions */}
      </FieldGroup>
      <div className="flex justify-end gap-3 pt-6">
        <Button type="submit" disabled={isSubmitting}>
          {t("common.save")}
        </Button>
      </div>
    </form>
  );
}
