import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { Treatment, Drug, Animal, DrugTreatment } from "@/api/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
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
  isAntibiotic: boolean;
  criticalAntibiotic: boolean;
  antibiogramAvailable: boolean;
  drugDoseValue: string | null;
  drugDoseUnit: DrugTreatment["doseUnit"] | null;
  drugDosePerUnit: DrugTreatment["dosePerUnit"] | null;
  drugReceivedFrom: string | null;
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

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { dirtyFields },
  } = useForm<TreatmentFormData>({
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
          isAntibiotic: treatment.isAntibiotic,
          criticalAntibiotic: treatment.criticalAntibiotic,
          antibiogramAvailable: treatment.antibiogramAvailable,
          drugDoseValue: treatment.drugDoseValue != null ? String(treatment.drugDoseValue) : null,
          drugDoseUnit: treatment.drugDoseUnit,
          drugDosePerUnit: treatment.drugDosePerUnit,
          drugReceivedFrom: treatment.drugReceivedFrom,
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
          isAntibiotic: false,
          criticalAntibiotic: false,
          antibiogramAvailable: false,
          drugDoseValue: null,
          drugDoseUnit: null,
          drugDosePerUnit: null,
          drugReceivedFrom: null,
        },
  });

  const watchedAnimalIds = watch("animalIds");
  const watchedDrugId = watch("drugId");
  const watchedStartDate = watch("startDate");
  const watchedEndDate = watch("endDate");

  // Sync drug-derived fields when the user explicitly changes the drug (guarded by dirtyFields.drugId)
  useEffect(() => {
    if (!dirtyFields.drugId) return;

    if (!watchedDrugId) {
      // Drug was cleared — reset all drug-derived fields
      setValue("isAntibiotic", false);
      setValue("criticalAntibiotic", false);
      setValue("drugReceivedFrom", null);
      setValue("drugDoseValue", null);
      setValue("drugDoseUnit", null);
      setValue("drugDosePerUnit", null);
      setValue("milkUsableDate", null);
      setValue("meatUsableDate", null);
      setValue("organsUsableDate", null);
      return;
    }

    const selectedDrug = drugs.find((d) => d.id === watchedDrugId);
    if (!selectedDrug) return;

    setValue("isAntibiotic", selectedDrug.isAntibiotic);
    setValue("criticalAntibiotic", selectedDrug.criticalAntibiotic);
    setValue("drugReceivedFrom", selectedDrug.receivedFrom ?? null);

    // Use first selected animal's type for dosing lookup
    const firstAnimal = animals.find((a) => a.id === watchedAnimalIds[0]);
    if (!firstAnimal) return;

    const drugTreatment = selectedDrug.drugTreatment.find(
      (dt) => dt.animalType === firstAnimal.type,
    );
    if (!drugTreatment) return;

    setValue("drugDoseValue", String(drugTreatment.doseValue));
    setValue("drugDoseUnit", drugTreatment.doseUnit);
    setValue("drugDosePerUnit", drugTreatment.dosePerUnit);

    const endDate = new Date(watchedEndDate);
    if (drugTreatment.milkWaitingDays > 0) {
      const d = new Date(endDate);
      d.setDate(d.getDate() + drugTreatment.milkWaitingDays);
      setValue("milkUsableDate", d.toISOString().split("T")[0]);
    }
    if (drugTreatment.meatWaitingDays > 0) {
      const d = new Date(endDate);
      d.setDate(d.getDate() + drugTreatment.meatWaitingDays);
      setValue("meatUsableDate", d.toISOString().split("T")[0]);
    }
    if (drugTreatment.organsWaitingDays > 0) {
      const d = new Date(endDate);
      d.setDate(d.getDate() + drugTreatment.organsWaitingDays);
      setValue("organsUsableDate", d.toISOString().split("T")[0]);
    }
  }, [watchedDrugId, dirtyFields.drugId, watchedAnimalIds, watchedEndDate, drugs, animals, setValue]);

  // Recalculate waiting dates when endDate changes (drug already selected, doesn't touch dose/antibiotic fields)
  useEffect(() => {
    if (!watchedDrugId || !watchedEndDate || watchedAnimalIds.length === 0) return;
    // Skip if the drug field itself was just dirtied — the drug-sync effect handles dates too
    if (dirtyFields.drugId) return;

    const selectedDrug = drugs.find((d) => d.id === watchedDrugId);
    if (!selectedDrug) return;

    const firstAnimal = animals.find((a) => a.id === watchedAnimalIds[0]);
    if (!firstAnimal) return;

    const drugTreatment = selectedDrug.drugTreatment.find(
      (dt) => dt.animalType === firstAnimal.type,
    );
    if (!drugTreatment) return;

    const endDate = new Date(watchedEndDate);
    if (drugTreatment.milkWaitingDays > 0) {
      const d = new Date(endDate);
      d.setDate(d.getDate() + drugTreatment.milkWaitingDays);
      setValue("milkUsableDate", d.toISOString().split("T")[0]);
    }
    if (drugTreatment.meatWaitingDays > 0) {
      const d = new Date(endDate);
      d.setDate(d.getDate() + drugTreatment.meatWaitingDays);
      setValue("meatUsableDate", d.toISOString().split("T")[0]);
    }
    if (drugTreatment.organsWaitingDays > 0) {
      const d = new Date(endDate);
      d.setDate(d.getDate() + drugTreatment.organsWaitingDays);
      setValue("organsUsableDate", d.toISOString().split("T")[0]);
    }
  }, [watchedEndDate, watchedDrugId, watchedAnimalIds, dirtyFields.drugId, drugs, animals, setValue]);

  const showWaitingDates = !!watchedDrugId;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-lg">
      {/* Animals multi-select */}
      <FieldGroup>
        <Field>
          <FieldLabel>{t("treatments.animals")} *</FieldLabel>
          <Controller
            name="animalIds"
            control={control}
            render={({ field }) => (
              <MultiSelect
                options={animalOptions}
                value={field.value}
                onValueChange={field.onChange}
                placeholder={t("treatments.selectAnimals")}
                searchPlaceholder={t("common.search")}
                emptyText={t("common.noResults")}
              />
            )}
          />
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

      {/* Dose fields and waiting dates (shown when drug is selected) */}
      {showWaitingDates && (
        <>
          <FieldGroup className="flex-row mt-7">
            <Field>
              <FieldLabel htmlFor="drugDoseValue">{t("treatments.drugDoseValue")}</FieldLabel>
              <Input id="drugDoseValue" type="number" step="any" {...register("drugDoseValue")} />
            </Field>
            <Field>
              <FieldLabel htmlFor="drugDoseUnit">{t("treatments.drugDoseUnit")}</FieldLabel>
              <select id="drugDoseUnit" className="w-full border rounded px-3 py-2 text-sm" {...register("drugDoseUnit")}>
                <option value="">-</option>
                {(["tablet", "capsule", "patch", "dose", "mg", "mcg", "g", "ml", "drop"] as const).map((u) => (
                  <option key={u} value={u}>{t(`drugs.doseUnits.${u}`)}</option>
                ))}
              </select>
            </Field>
            <Field>
              <FieldLabel htmlFor="drugDosePerUnit">{t("treatments.drugDosePerUnit")}</FieldLabel>
              <select id="drugDosePerUnit" className="w-full border rounded px-3 py-2 text-sm" {...register("drugDosePerUnit")}>
                <option value="">-</option>
                {(["kg", "animal", "day", "total_amount"] as const).map((u) => (
                  <option key={u} value={u}>{t(`drugs.dosePerUnits.${u}`)}</option>
                ))}
              </select>
            </Field>
          </FieldGroup>
          <FieldGroup className="mt-7">
            <Field>
              <FieldLabel htmlFor="drugReceivedFrom">{t("treatments.drugReceivedFrom")}</FieldLabel>
              <Input id="drugReceivedFrom" type="text" {...register("drugReceivedFrom")} />
            </Field>
          </FieldGroup>
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
        </>
      )}

      {/* Antibiotic flags */}
      <FieldGroup className="flex-row mt-7 gap-4">
        <Field className="flex flex-row items-center gap-2">
          <Controller
            name="isAntibiotic"
            control={control}
            render={({ field }) => (
              <Checkbox
                id="isAntibiotic"
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
              />
            )}
          />
          <Label htmlFor="isAntibiotic">{t("treatments.isAntibiotic")}</Label>
        </Field>
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
