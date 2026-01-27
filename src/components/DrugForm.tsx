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
import { Plus, Trash2 } from "lucide-react";

interface DrugTreatmentFormData {
  animalType: AnimalType;
  dosePerKg: number;
  milkWaitingDays: number;
  meatWaitingDays: number;
}

export interface DrugFormData {
  name: string;
  notes: string | null;
  drugTreatment: DrugTreatmentFormData[];
}

export interface DrugFormProps {
  drug?: Drug;
  onSubmit: (data: DrugFormData) => void;
  isSubmitting?: boolean;
}

export function DrugForm({ drug, onSubmit, isSubmitting = false }: DrugFormProps) {
  const { t } = useTranslation();

  const { register, handleSubmit, control, watch } = useForm<DrugFormData>({
    defaultValues: drug
      ? {
          name: drug.name,
          notes: drug.notes,
          drugTreatment: drug.drugTreatment.map((dt) => ({
            animalType: dt.animalType,
            dosePerKg: dt.dosePerKg,
            milkWaitingDays: dt.milkWaitingDays,
            meatWaitingDays: dt.meatWaitingDays,
          })),
        }
      : {
          name: "",
          notes: null,
          drugTreatment: [],
        },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "drugTreatment",
  });

  const watchedTreatments = watch("drugTreatment");

  // Get animal types that are already used so we can filter them from the dropdown
  const usedAnimalTypes = watchedTreatments.map((dt) => dt.animalType);
  const availableAnimalTypes = ANIMAL_TYPES.filter(
    (type) => !usedAnimalTypes.includes(type),
  );

  function handleAddAnimalType() {
    if (availableAnimalTypes.length > 0) {
      append({
        animalType: availableAnimalTypes[0],
        dosePerKg: 0,
        milkWaitingDays: 0,
        meatWaitingDays: 0,
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

      {/* Row 2: notes */}
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
                className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-3 items-end p-4 border rounded-md"
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
                          {/* Show current value plus available types */}
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
                  <FieldLabel htmlFor={`drugTreatment.${index}.dosePerKg`}>
                    {t("drugs.dosePerKg")}
                  </FieldLabel>
                  <Input
                    id={`drugTreatment.${index}.dosePerKg`}
                    type="number"
                    step="0.01"
                    {...register(`drugTreatment.${index}.dosePerKg`, {
                      required: true,
                      valueAsNumber: true,
                    })}
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
