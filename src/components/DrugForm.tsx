import { useForm, useFieldArray, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { ANIMAL_TYPES, type Drug, type AnimalType } from "@/api/types";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";

type DoseUnit = "tablet" | "capsule" | "patch" | "dose" | "mg" | "mcg" | "g" | "ml" | "drop";
type DosePerUnit = "kg" | "animal" | "day" | "total_amount";

interface DrugTreatmentFormData {
  animalType: AnimalType;
  doseValue: number;
  doseUnit: DoseUnit;
  dosePerUnit: DosePerUnit;
  milkWaitingDays: number;
  meatWaitingDays: number;
  organsWaitingDays: number;
}

export interface DrugFormData {
  name: string;
  notes: string | null;
  isAntibiotic: boolean;
  criticalAntibiotic: boolean;
  receivedFrom: string;
  drugTreatment: DrugTreatmentFormData[];
}

export interface DrugFormProps {
  drug?: Drug;
  onSubmit: (data: DrugFormData) => void;
  isSubmitting?: boolean;
}

const DOSE_UNITS: DoseUnit[] = ["tablet", "capsule", "patch", "dose", "mg", "mcg", "g", "ml", "drop"];
const DOSE_PER_UNITS: DosePerUnit[] = ["kg", "animal", "day", "total_amount"];

export function DrugForm({ drug, onSubmit, isSubmitting = false }: DrugFormProps) {
  const { t } = useTranslation();

  const { register, handleSubmit, control, watch } = useForm<DrugFormData>({
    defaultValues: drug
      ? {
          name: drug.name,
          notes: drug.notes,
          isAntibiotic: drug.isAntibiotic,
          criticalAntibiotic: drug.criticalAntibiotic,
          receivedFrom: drug.receivedFrom,
          drugTreatment: drug.drugTreatment.map((dt) => ({
            animalType: dt.animalType,
            doseValue: dt.doseValue,
            doseUnit: dt.doseUnit,
            dosePerUnit: dt.dosePerUnit,
            milkWaitingDays: dt.milkWaitingDays,
            meatWaitingDays: dt.meatWaitingDays,
            organsWaitingDays: dt.organsWaitingDays,
          })),
        }
      : {
          name: "",
          notes: null,
          isAntibiotic: false,
          criticalAntibiotic: false,
          receivedFrom: "",
          drugTreatment: [],
        },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "drugTreatment",
  });

  const watchedTreatments = watch("drugTreatment");

  // Get animal types already used to filter the dropdown
  const usedAnimalTypes = watchedTreatments.map((dt) => dt.animalType);
  const availableAnimalTypes = ANIMAL_TYPES.filter(
    (type) => !usedAnimalTypes.includes(type),
  );

  function handleAddAnimalType() {
    if (availableAnimalTypes.length > 0) {
      append({
        animalType: availableAnimalTypes[0],
        doseValue: 0,
        doseUnit: "mg",
        dosePerUnit: "kg",
        milkWaitingDays: 0,
        meatWaitingDays: 0,
        organsWaitingDays: 0,
      });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl">
      {/* Row 1: name */}
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">{t("drugs.name")} *</FieldLabel>
          <Input
            id="name"
            type="text"
            {...register("name", { required: true })}
          />
        </Field>
      </FieldGroup>

      {/* Row 2: isAntibiotic + criticalAntibiotic */}
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
          <Label htmlFor="isAntibiotic">{t("drugs.isAntibiotic")}</Label>
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
          <Label htmlFor="criticalAntibiotic">{t("drugs.criticalAntibiotic")}</Label>
        </Field>
      </FieldGroup>

      {/* receivedFrom */}
      <FieldGroup className="mt-7">
        <Field>
          <FieldLabel htmlFor="receivedFrom">{t("drugs.receivedFrom")} *</FieldLabel>
          <Input
            id="receivedFrom"
            type="text"
            {...register("receivedFrom", { required: true })}
          />
        </Field>
      </FieldGroup>

      {/* notes */}
      <FieldGroup className="mt-7">
        <Field>
          <FieldLabel htmlFor="notes">{t("drugs.notes")}</FieldLabel>
          <Textarea id="notes" rows={3} {...register("notes")} />
        </Field>
      </FieldGroup>

      {/* Animal type dosing section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium">{t("drugs.dosing")}</h3>
          {availableAnimalTypes.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddAnimalType}
            >
              <Plus className="h-4 w-4 mr-1" />
              {t("drugs.addAnimalType")}
            </Button>
          )}
        </div>

        {fields.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground border border-dashed rounded-md">
            {t("drugs.noDosing")}
          </div>
        ) : (
          <div className="space-y-4">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_1fr_auto] gap-3 items-end p-4 border rounded-md"
              >
                <Field>
                  <FieldLabel htmlFor={`drugTreatment.${index}.animalType`}>
                    {t("drugs.animalType")}
                  </FieldLabel>
                  <Controller
                    name={`drugTreatment.${index}.animalType`}
                    control={control}
                    rules={{ required: true }}
                    render={({ field: selectField }) => (
                      <Select
                        value={selectField.value}
                        onValueChange={selectField.onChange}
                      >
                        <SelectTrigger
                          id={`drugTreatment.${index}.animalType`}
                          className="w-full"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ANIMAL_TYPES.filter(
                            (type) =>
                              type === selectField.value ||
                              !usedAnimalTypes.includes(type),
                          ).map((type) => (
                            <SelectItem key={type} value={type}>
                              {t(`animals.types.${type}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`drugTreatment.${index}.doseValue`}>
                    {t("drugs.doseValue")}
                  </FieldLabel>
                  <Input
                    id={`drugTreatment.${index}.doseValue`}
                    type="number"
                    step="0.01"
                    {...register(`drugTreatment.${index}.doseValue`, {
                      required: true,
                      valueAsNumber: true,
                    })}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`drugTreatment.${index}.doseUnit`}>
                    {t("drugs.doseUnit")}
                  </FieldLabel>
                  <Controller
                    name={`drugTreatment.${index}.doseUnit`}
                    control={control}
                    rules={{ required: true }}
                    render={({ field: selectField }) => (
                      <Select
                        value={selectField.value}
                        onValueChange={selectField.onChange}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DOSE_UNITS.map((unit) => (
                            <SelectItem key={unit} value={unit}>
                              {unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`drugTreatment.${index}.dosePerUnit`}>
                    {t("drugs.dosePerUnit")}
                  </FieldLabel>
                  <Controller
                    name={`drugTreatment.${index}.dosePerUnit`}
                    control={control}
                    rules={{ required: true }}
                    render={({ field: selectField }) => (
                      <Select
                        value={selectField.value}
                        onValueChange={selectField.onChange}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DOSE_PER_UNITS.map((perUnit) => (
                            <SelectItem key={perUnit} value={perUnit}>
                              {perUnit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`drugTreatment.${index}.milkWaitingDays`}>
                    {t("drugs.milkWaitingDays")}
                  </FieldLabel>
                  <Input
                    id={`drugTreatment.${index}.milkWaitingDays`}
                    type="number"
                    {...register(`drugTreatment.${index}.milkWaitingDays`, {
                      required: true,
                      valueAsNumber: true,
                    })}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`drugTreatment.${index}.meatWaitingDays`}>
                    {t("drugs.meatWaitingDays")}
                  </FieldLabel>
                  <Input
                    id={`drugTreatment.${index}.meatWaitingDays`}
                    type="number"
                    {...register(`drugTreatment.${index}.meatWaitingDays`, {
                      required: true,
                      valueAsNumber: true,
                    })}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`drugTreatment.${index}.organsWaitingDays`}>
                    {t("drugs.organsWaitingDays")}
                  </FieldLabel>
                  <Input
                    id={`drugTreatment.${index}.organsWaitingDays`}
                    type="number"
                    {...register(`drugTreatment.${index}.organsWaitingDays`, {
                      required: true,
                      valueAsNumber: true,
                    })}
                  />
                </Field>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-6">
        <Button type="submit" disabled={isSubmitting}>
          {t("common.save")}
        </Button>
      </div>
    </form>
  );
}
