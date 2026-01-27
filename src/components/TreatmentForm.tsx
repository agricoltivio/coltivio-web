import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { Treatment, Drug, Animal } from "@/api/types";
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

export interface TreatmentFormData {
  animalId: string;
  drugId: string | null;
  date: string;
  name: string;
  reason: string;
  notes: string | null;
  milkUsableDate: string | null;
  meatUsableDate: string | null;
}

type ComboboxOption = { value: string; label: string };

export interface TreatmentFormProps {
  treatment?: Treatment;
  animalOptions: ComboboxOption[];
  drugOptions: ComboboxOption[];
  drugs: Drug[];
  animals: Animal[];
  onSubmit: (data: TreatmentFormData) => void;
  isSubmitting?: boolean;
  defaultValues?: {
    animalId?: string;
  };
}

export function TreatmentForm({
  treatment,
  animalOptions,
  drugOptions,
  drugs,
  animals,
  onSubmit,
  isSubmitting = false,
  defaultValues: initialDefaults,
}: TreatmentFormProps) {
  const { t } = useTranslation();

  const { register, handleSubmit, control, watch, setValue } =
    useForm<TreatmentFormData>({
      defaultValues: treatment
        ? {
            animalId: treatment.animalId,
            drugId: treatment.drugId,
            date: treatment.date.split("T")[0],
            name: treatment.name,
            reason: treatment.reason,
            notes: treatment.notes,
            milkUsableDate: treatment.milkUsableDate?.split("T")[0] || null,
            meatUsableDate: treatment.meatUsableDate?.split("T")[0] || null,
          }
        : {
            animalId: initialDefaults?.animalId || "",
            drugId: null,
            date: new Date().toISOString().split("T")[0],
            name: "",
            reason: "",
            notes: null,
            milkUsableDate: null,
            meatUsableDate: null,
          },
    });

  const watchedAnimalId = watch("animalId");
  const watchedDrugId = watch("drugId");
  const watchedDate = watch("date");

  // Auto-calculate milk and meat usable dates when drug or date changes
  useEffect(() => {
    if (!watchedDrugId || !watchedDate || !watchedAnimalId) return;

    // Find the selected drug
    const selectedDrug = drugs.find((d) => d.id === watchedDrugId);
    if (!selectedDrug) {
      setValue("milkUsableDate", null);
      setValue("meatUsableDate", null);
      return;
    }

    // Find the selected animal's type
    const selectedAnimal = animals.find((a) => a.id === watchedAnimalId);
    if (!selectedAnimal) return;

    // Find the drug treatment for this animal type
    const drugTreatment = selectedDrug.drugTreatment.find(
      (dt) => dt.animalType === selectedAnimal.type,
    );
    if (!drugTreatment) return;

    // Calculate dates
    const treatmentDate = new Date(watchedDate);

    if (drugTreatment.milkWaitingDays > 0) {
      const milkDate = new Date(treatmentDate);
      milkDate.setDate(milkDate.getDate() + drugTreatment.milkWaitingDays);
      setValue("milkUsableDate", milkDate.toISOString().split("T")[0]);
    }

    if (drugTreatment.meatWaitingDays > 0) {
      const meatDate = new Date(treatmentDate);
      meatDate.setDate(meatDate.getDate() + drugTreatment.meatWaitingDays);
      setValue("meatUsableDate", meatDate.toISOString().split("T")[0]);
    }
  }, [watchedDrugId, watchedDate, watchedAnimalId, drugs, animals, setValue]);

  const showWaitingDates = !!watchedDrugId;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-lg">
      {/* Row 1: animal */}
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="animalId">{t("treatments.animal")} *</FieldLabel>
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

      {/* Row 2: date */}
      <FieldGroup className="mt-7">
        <Field className="max-w-48">
          <FieldLabel htmlFor="date">{t("treatments.date")} *</FieldLabel>
          <Input
            id="date"
            type="date"
            {...register("date", { required: true })}
          />
        </Field>
      </FieldGroup>

      {/* Row 3: name */}
      <FieldGroup className="mt-7">
        <Field>
          <FieldLabel htmlFor="name">{t("treatments.name")} *</FieldLabel>
          <Input
            id="name"
            type="text"
            {...register("name", { required: true })}
          />
        </Field>
      </FieldGroup>

      {/* Row 4: reason */}
      <FieldGroup className="mt-7">
        <Field>
          <FieldLabel htmlFor="reason">{t("treatments.reason")} *</FieldLabel>
          <Input
            id="reason"
            type="text"
            {...register("reason", { required: true })}
          />
        </Field>
      </FieldGroup>

      {/* Row 5: drug */}
      <FieldGroup className="mt-7">
        <Field>
          <FieldLabel htmlFor="drugId">{t("treatments.drug")}</FieldLabel>
          <Controller
            name="drugId"
            control={control}
            render={({ field }) => (
              <Combobox
                items={drugOptions}
                itemToStringValue={(item: ComboboxOption) => item.label}
                value={drugOptions.find((o) => o.value === field.value) || null}
                onValueChange={(item: ComboboxOption | null) =>
                  field.onChange(item?.value || null)
                }
              >
                <ComboboxInput
                  id="drugId"
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

      {/* Row 6: waiting dates (shown when drug is selected) */}
      {showWaitingDates && (
        <FieldGroup className="flex-row mt-7">
          <Field>
            <FieldLabel htmlFor="milkUsableDate">
              {t("treatments.milkUsableDate")}
            </FieldLabel>
            <Input
              id="milkUsableDate"
              type="date"
              {...register("milkUsableDate")}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="meatUsableDate">
              {t("treatments.meatUsableDate")}
            </FieldLabel>
            <Input
              id="meatUsableDate"
              type="date"
              {...register("meatUsableDate")}
            />
          </Field>
        </FieldGroup>
      )}

      {/* Row 7: notes */}
      <FieldGroup className="mt-7">
        <Field>
          <FieldLabel htmlFor="notes">{t("treatments.notes")}</FieldLabel>
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
