import { createInstance } from "i18next";
import { beforeAll, describe, expect, test } from "vitest";
import type { SowingUnitInfo } from "@/api/types";
import {
  computeCounterpart,
  formatArea,
  formatBaseAmount,
  isPerAreaUnit,
} from "./sowingUnits";

const translator = createInstance();

beforeAll(async () => {
  await translator.init({
    lng: "de",
    resources: {
      de: {
        translation: {
          fieldCalendar: {
            sowings: { units: { plants: "Pflanzen", seeds: "Körner" } },
          },
        },
      },
    },
  });
});

const kgPerHectare: SowingUnitInfo = {
  unit: "kg_per_ha",
  quantityKind: "weight",
  countUnit: null,
  perArea: true,
};
const plants: SowingUnitInfo = {
  unit: "plants",
  quantityKind: "count",
  countUnit: "plants",
  perArea: false,
};

describe("isPerAreaUnit", () => {
  test("knows per-area and total units without the unit list", () => {
    expect(isPerAreaUnit("kg_per_ha")).toBe(true);
    expect(isPerAreaUnit("plants_per_m2")).toBe(true);
    expect(isPerAreaUnit("kg")).toBe(false);
    expect(isPerAreaUnit("seeds")).toBe(false);
  });
});

describe("formatArea", () => {
  test("picks m², a or ha by size", () => {
    expect(formatArea(45)).toBe("45 m²");
    expect(formatArea(3875)).toBe("38.75 a");
    expect(formatArea(24000)).toBe("2.4 ha");
  });
});

describe("computeCounterpart", () => {
  test("turns a rate per hectare into a total", () => {
    expect(computeCounterpart(30, "kg_per_ha", 5000)).toEqual({
      amount: 15,
      unit: "kg",
      area: "50 a",
    });
  });

  test("switches large gram totals to kg", () => {
    // 10 g/m² on 3875 m² = 38'750 g
    expect(computeCounterpart(10, "g_per_m2", 3875)).toEqual({
      amount: 38.75,
      unit: "kg",
      area: "38.75 a",
    });
  });

  test("turns a total into a rate", () => {
    // 200 plants on 100 m² = 20'000 plants/ha
    expect(computeCounterpart(200, "plants", 100)).toEqual({
      amount: 20000,
      unit: "plants_per_ha",
      area: "1 a",
    });
  });

  test("has no counterpart without an area", () => {
    expect(computeCounterpart(30, "kg_per_ha", 0)).toBeNull();
  });
});

describe("formatBaseAmount", () => {
  test("shows weight in g or kg", () => {
    expect(formatBaseAmount(500, kgPerHectare, translator.t)).toBe("500 g");
    expect(formatBaseAmount(30000, kgPerHectare, translator.t)).toBe("30 kg");
  });

  test("labels counts with what is counted", () => {
    expect(formatBaseAmount(400, plants, translator.t)).toBe("400 Pflanzen");
  });
});
