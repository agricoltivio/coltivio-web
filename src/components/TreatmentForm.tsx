import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { Treatment, Drug, Animal } from "@/api/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/combobox";

export interface TreatmentFormData {
  animalIds: string[];
  drugId: string | null;
  startDate: string;
  endDate: string;
  name: string;
  notes: string | null;
  milkUsableDate: string | null;
  meatUsableDate: string | null;
  organsUsableDate: string | null;
  criticalAntibiotic: boolean;
  antibiogramAvailable: boolean;
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
    animalIds?: string[];
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
            animalIds: treatment.animals.map((a) => a.id),
            drugId: treatment.drugId,
            startDate: treatment.startDate.split("T")[0],
            endDate: treatment.endDate.split("T")[0],
            name: treatment.name,
            notes: treatment.notes,
            milkUsableDate: treatment.milkUsableDate?.split("T")[0] || null,
            meatUsableDate: treatment.meatUsableDate?.split("T")[0] || null,
            organsUsableDate: treatment.organsUsableDate?.split("T")[0] || null,
            criticalAntibiotic: treatment.criticalAntibiotic,
            antibiogramAvailable: treatment.antibiogramAvailable,
          }
        : {
            animalIds: initialDefaults?.animalIds || [],
            drugId: null,
            startDate: new Date().toISOString().split("T")[0],
            endDate: new Date().toISOString().split("T")[0],
            name: "",
            notes: null,
            milkUsableDate: null,
            meatUsableDate: null,
            organsUsableDate: null,
            criticalAntibiotic: false,
            antibiogramAvailable: false,
          },
    });

  const watchedAnimalIds = watch("animalIds");
  const watchedDrugId = watch("drugId");
  const watchedStartDate = watch("startDate");
  const watchedCriticalAntibiotic = watch("criticalAntibiotic");

  // Auto-calculate usable dates when drug or startDate changes
  useEffect(() => {
    if (!watchedDrugId || !watchedStartDate || watchedAnimalIds.length === 0) return;

    const selectedDrug = drugs.find((d) => d.id === watchedDrugId);
    if (!selectedDrug) {
      setValue("milkUsableDate", null);
      setValue("meatUsableDate", null);
      setValue("organsUsableDate", null);
      return;
    }

    // Use the first selected animal's type for drug dosing lookup
    const firstAnimal = animals.find((a) => a.id === watchedAnimalIds[0]);
    if (!firstAnimal) return;

    const drugTreatment = selectedDrug.drugTreatment.find(
      (dt) => dt.animalType === firstAnimal.type,
    );
    if (!drugTreatment) return;

    const startDate = new Date(watchedStartDate);

    if (drugTreatment.milkWaitingDays > 0) {
      const milkDate = new Date(startDate);
      milkDate.setDate(milkDate.getDate() + drugTreatment.milkWaitingDays);
      setValue("milkUsableDate", milkDate.toISOString().split("T")[0]);
    }

    if (drugTreatment.meatWaitingDays > 0) {
      const meatDate = new Date(startDate);
      meatDate.setDate(meatDate.getDate() + drugTreatment.meatWaitingDays);
      setValue("meatUsableDate", meatDate.toISOString().split("T")[0]);
    }

    if (drugTreatment.organsWaitingDays > 0) {
      const organsDate = new Date(startDate);
      organsDate.setDate(organsDate.getDate() + drugTreatment.organsWaitingDays);
      setValue("organsUsableDate", organsDate.toISOString().split("T")[0]);
    }
  }, [watchedDrugId, watchedStartDate, watchedAnimalIds, drugs, animals, setValue]);

  const showWaitingDates = !!watchedDrugId;

  function toggleAnimalId(animalId: string, currentIds: string[]) {
    if (currentIds.includes(animalId)) {
      setValue("animalIds", currentIds.filter((id) => id !== animalId));
    } else {
      setValue("animalIds", [...currentIds, animalId]);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-lg">
      {/* Animals multi-select */}
      <FieldGroup>
        <Field>
          <FieldLabel>{t("treatments.animals")} *</FieldLabel>
          <div className="border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
            {animalOptions.length === 0 ? (
              <span className="text-sm text-muted-foreground">{t("common.noResults")}</span>
            ) : (
              animalOptions.map((option) => (
                <div key={option.value} className="flex items-center gap-2">
                  <Controller
                    name="animalIds"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        id={`animal-${option.value}`}
                        checked={field.value.includes(option.value)}
                        onCheckedChange={() =>
                          toggleAnimalId(option.value, field.value)
                        }
                      />
                    )}
                  />
                  <Label htmlFor={`animal-${option.value}`} className="font-normal cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))
            )}
          </div>
        </Field>
      </FieldGroup>

      {/* Date range */}
      <FieldGroup className="flex-row mt-7">
        <Field className="max-w-48">
          <FieldLabel htmlFor="startDate">{t("treatments.startDate")} *</FieldLabel>
          <Input
            id="startDate"
            type="date"
            {...register("startDate", { required: true })}
          />
        </Field>
        <Field className="max-w-48">
          <FieldLabel htmlFor="endDate">{t("treatments.endDate")} *</FieldLabel>
          <Input
            id="endDate"
            type="date"
            {...register("endDate", { required: true })}
          />
        </Field>
      </FieldGroup>

      {/* Name */}
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

      {/* Drug */}
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

      {/* Waiting dates (shown when drug is selected) */}
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
          <Field>
            <FieldLabel htmlFor="organsUsableDate">
              {t("treatments.organsUsableDate")}
            </FieldLabel>
            <Input
              id="organsUsableDate"
              type="date"
              {...register("organsUsableDate")}
            />
          </Field>
        </FieldGroup>
      )}

      {/* Critical antibiotic */}
      <FieldGroup className="flex-row mt-7 gap-4">
        <Field className="flex flex-row items-center gap-2">
          <Controller
            name="criticalAntibiotic"
            control={control}
            render={({ field }) => (
              <Checkbox
                id="criticalAntibiotic"
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
              />
            )}
          />
          <Label htmlFor="criticalAntibiotic">{t("treatments.criticalAntibiotic")}</Label>
        </Field>
        {watchedCriticalAntibiotic && (
          <Field className="flex flex-row items-center gap-2">
            <Controller
              name="antibiogramAvailable"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="antibiogramAvailable"
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                />
              )}
            />
            <Label htmlFor="antibiogramAvailable">{t("treatments.antibiogramAvailable")}</Label>
          </Field>
        )}
      </FieldGroup>

      {/* Notes */}
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
