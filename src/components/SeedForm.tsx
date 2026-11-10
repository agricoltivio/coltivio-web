import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { cropsQueryOptions } from "@/api/crops.queries";
import { sowingUnitsQueryOptions } from "@/api/sowings.queries";
import {
  SEED_QUANTITY_KINDS,
  type SeedQuantityKind,
  type SowingUnit,
} from "@/api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { unitsForQuantityKind } from "@/lib/sowingUnits";

// Radix Select doesn't allow an empty item value
const NONE = "none";

export type SeedFormData = {
  name: string;
  cropId: string;
  quantityKind: SeedQuantityKind;
  defaultAmount: string;
  defaultUnit: SowingUnit | typeof NONE;
  description: string;
};

export function SeedForm({
  defaultValues,
  quantityKindLocked,
  submitLabel,
  submitting,
  onSubmit,
  onCancel,
}: {
  defaultValues: SeedFormData;
  // quantity kind can't change after creation, sowings of a seed must stay summable
  quantityKindLocked: boolean;
  submitLabel: string;
  submitting: boolean;
  onSubmit: (data: SeedFormData) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const cropsQuery = useQuery(cropsQueryOptions());
  const unitsQuery = useQuery(sowingUnitsQueryOptions());
  const crops = cropsQuery.data?.result ?? [];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SeedFormData>({
    defaultValues,
  });
  // the crop select is controlled, register it only for the required rule
  register("cropId", { required: true });

  const watchedQuantityKind = watch("quantityKind");
  const watchedDefaultUnit = watch("defaultUnit");
  const availableUnits = unitsForQuantityKind(
    unitsQuery.data ?? [],
    watchedQuantityKind,
  );

  return (
    <form
      onSubmit={handleSubmit((data) => onSubmit(data))}
      className="space-y-4 max-w-lg"
    >
      <div className="space-y-1">
        <Label htmlFor="name">{t("seeds.name")}</Label>
        <Input id="name" {...register("name", { required: true })} />
        {errors.name && (
          <p className="text-sm text-destructive">{t("common.required")}</p>
        )}
      </div>

      <div className="space-y-1">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="seed-crop">{t("seeds.crop")}</Label>
            <Select
              value={watch("cropId")}
              onValueChange={(value) => {
                if (value) setValue("cropId", value, { shouldValidate: true });
              }}
            >
              <SelectTrigger id="seed-crop" className="w-full">
                <SelectValue placeholder={t("seeds.selectCrop")} />
              </SelectTrigger>
              <SelectContent>
                {crops.map((crop) => (
                  <SelectItem key={crop.id} value={crop.id}>
                    {crop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.cropId && (
              <p className="text-sm text-destructive">{t("common.required")}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="seed-quantityKind">{t("seeds.quantityKind")}</Label>
            <Select
              value={watchedQuantityKind}
              disabled={quantityKindLocked}
              onValueChange={(value) => {
                const quantityKind = SEED_QUANTITY_KINDS.find(
                  (kind) => kind === value,
                );
                if (!quantityKind) return;
                setValue("quantityKind", quantityKind);
                // drop a default unit that doesn't fit the new kind
                const stillValid = unitsForQuantityKind(
                  unitsQuery.data ?? [],
                  quantityKind,
                ).some((unitInfo) => unitInfo.unit === watchedDefaultUnit);
                if (!stillValid) setValue("defaultUnit", NONE);
              }}
            >
              <SelectTrigger id="seed-quantityKind" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEED_QUANTITY_KINDS.map((kind) => (
                  <SelectItem key={kind} value={kind}>
                    {t(`seeds.quantityKinds.${kind}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {quantityKindLocked ? (
            t("seeds.quantityKindLockedHint")
          ) : (
            <>
              {t("seeds.quantityKindHint")}{" "}
              <span className="font-semibold">
                {t("seeds.quantityKindPermanent")}
              </span>
            </>
          )}
        </p>
      </div>

      <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
        <div className="space-y-1">
          <h3 className="text-sm font-medium">
            {t("seeds.defaultValuesOptional")}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t("seeds.defaultValuesDescription")}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="seed-defaultUnit">{t("seeds.defaultUnit")}</Label>
            <Select
              value={watchedDefaultUnit}
              onValueChange={(value) => {
                if (value === NONE) {
                  // an amount without a unit means nothing
                  setValue("defaultUnit", NONE);
                  setValue("defaultAmount", "");
                  return;
                }
                const unitInfo = availableUnits.find(
                  (info) => info.unit === value,
                );
                if (unitInfo) setValue("defaultUnit", unitInfo.unit);
              }}
            >
              <SelectTrigger id="seed-defaultUnit" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>-</SelectItem>
                {availableUnits.map((unitInfo) => (
                  <SelectItem key={unitInfo.unit} value={unitInfo.unit}>
                    {t(`fieldCalendar.sowings.units.${unitInfo.unit}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="seed-defaultAmountOptional">
              {t("seeds.defaultAmountOptional")}
            </Label>
            <Input
              id="seed-defaultAmountOptional"
              type="number"
              min={0}
              step="any"
              disabled={watchedDefaultUnit === NONE}
              {...register("defaultAmount")}
            />
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="description">{t("seeds.descriptionOptional")}</Label>
        <Textarea id="description" {...register("description")} />
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

/**
 * Converts form values to the API's optional default rate fields. A unit can be
 * saved on its own (it's preselected in a sowing), an amount only with a unit.
 */
export function seedDefaultRateFromForm(data: SeedFormData): {
  defaultAmount: number | null;
  defaultUnit: SowingUnit | null;
} {
  if (data.defaultUnit === NONE) {
    return { defaultAmount: null, defaultUnit: null };
  }
  const defaultAmount = parseFloat(data.defaultAmount);
  return {
    defaultAmount: Number.isNaN(defaultAmount) ? null : defaultAmount,
    defaultUnit: data.defaultUnit,
  };
}

export const SEED_FORM_NONE = NONE;
