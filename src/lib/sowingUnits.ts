import type { TFunction } from "i18next";
import { round2 } from "@/lib/utils";
import type { SeedQuantityKind, SowingUnit, SowingUnitInfo } from "@/api/types";

// Display-only conversions between a per-area rate and the matching total, known
// locally so hints are right before GET /v1/sowings/units has loaded. Which units a
// seed allows (quantity kind) still comes from that endpoint.
const AREA_COUNTERPARTS: Record<
  SowingUnit,
  {
    perArea: boolean;
    counterpartUnit: SowingUnit;
    squareMetersPerAreaUnit: number;
  }
> = {
  kg_per_ha: {
    perArea: true,
    counterpartUnit: "kg",
    squareMetersPerAreaUnit: 10000,
  },
  g_per_m2: { perArea: true, counterpartUnit: "g", squareMetersPerAreaUnit: 1 },
  seeds_per_ha: {
    perArea: true,
    counterpartUnit: "seeds",
    squareMetersPerAreaUnit: 10000,
  },
  seeds_per_m2: {
    perArea: true,
    counterpartUnit: "seeds",
    squareMetersPerAreaUnit: 1,
  },
  plants_per_ha: {
    perArea: true,
    counterpartUnit: "plants",
    squareMetersPerAreaUnit: 10000,
  },
  plants_per_m2: {
    perArea: true,
    counterpartUnit: "plants",
    squareMetersPerAreaUnit: 1,
  },
  kg: {
    perArea: false,
    counterpartUnit: "kg_per_ha",
    squareMetersPerAreaUnit: 10000,
  },
  g: {
    perArea: false,
    counterpartUnit: "g_per_m2",
    squareMetersPerAreaUnit: 1,
  },
  seeds: {
    perArea: false,
    counterpartUnit: "seeds_per_ha",
    squareMetersPerAreaUnit: 10000,
  },
  plants: {
    perArea: false,
    counterpartUnit: "plants_per_ha",
    squareMetersPerAreaUnit: 10000,
  },
};

export function isPerAreaUnit(unit: SowingUnit): boolean {
  return AREA_COUNTERPARTS[unit].perArea;
}

export function unitsForQuantityKind(
  units: SowingUnitInfo[],
  quantityKind: SeedQuantityKind | undefined,
): SowingUnitInfo[] {
  if (!quantityKind) return units;
  return units.filter((unitInfo) => unitInfo.quantityKind === quantityKind);
}

/** m² for small areas, a (Aren) up to one hectare, ha above. */
export function formatArea(sizeInSquareMeters: number): string {
  if (sizeInSquareMeters < 100) {
    return `${round2(sizeInSquareMeters).toLocaleString()} m²`;
  }
  if (sizeInSquareMeters < 10000) {
    return `${round2(sizeInSquareMeters / 100).toLocaleString()} a`;
  }
  return `${round2(sizeInSquareMeters / 10000).toLocaleString()} ha`;
}

/**
 * Per-area rate → total for the given area, or total → rate per area.
 * Weight totals switch between g and kg so large values stay readable.
 */
export function computeCounterpart(
  amount: number,
  unit: SowingUnit,
  sizeInSquareMeters: number,
): { amount: number; unit: SowingUnit; area: string } | null {
  if (sizeInSquareMeters <= 0) return null;
  const { counterpartUnit, squareMetersPerAreaUnit } = AREA_COUNTERPARTS[unit];
  const areaUnits = sizeInSquareMeters / squareMetersPerAreaUnit;
  const area = formatArea(sizeInSquareMeters);
  if (!isPerAreaUnit(unit)) {
    return { amount: round2(amount / areaUnits), unit: counterpartUnit, area };
  }
  const total = amount * areaUnits;
  if (counterpartUnit === "g" && total >= 1000) {
    return { amount: round2(total / 1000), unit: "kg", area };
  }
  if (counterpartUnit === "kg" && total > 0 && total < 1) {
    return { amount: round2(total * 1000), unit: "g", area };
  }
  return { amount: round2(total), unit: counterpartUnit, area };
}

/**
 * Base amounts from the API are grams (weight) or pieces (seeds / plants); the
 * unit info says which, so seeds and plants keep their own label.
 */
export function formatBaseAmount(
  totalBaseAmount: number,
  unitInfo: SowingUnitInfo,
  t: TFunction,
): string {
  if (unitInfo.countUnit) {
    return `${Math.round(totalBaseAmount).toLocaleString()} ${t(`fieldCalendar.sowings.units.${unitInfo.countUnit}`)}`;
  }
  if (totalBaseAmount >= 1000) {
    return `${round2(totalBaseAmount / 1000).toLocaleString()} kg`;
  }
  return `${round2(totalBaseAmount).toLocaleString()} g`;
}
