import { describe, expect, test } from "vitest";
import type { MeadowUsageEntry } from "@/api/types";
import {
  computeMeadowMonthlyUsage,
  getCurrentAndLastStays,
  getMeadowUsageYears,
} from "./meadowUsage";

function stay(
  herdName: string,
  startDate: string,
  endDate: string,
  animalCountsByType: Record<string, number>,
): MeadowUsageEntry {
  return {
    meadowId: "m1",
    meadowName: "Allmend",
    meadowSize: 10000,
    herdId: `herd-${herdName}`,
    herdName,
    type: "pasture",
    startDate: `${startDate}T00:00:00.000Z`,
    endDate: `${endDate}T00:00:00.000Z`,
    animalCount: Object.values(animalCountsByType).reduce((a, b) => a + b, 0),
    animalCountsByType,
  };
}

const END_OF_YEAR = new Date(2025, 11, 31);

describe("computeMeadowMonthlyUsage", () => {
  test("counts days inclusive on both ends", () => {
    const usage = computeMeadowMonthlyUsage(
      [stay("A", "2025-05-01", "2025-05-15", { cow: 2 })],
      2025,
      END_OF_YEAR,
    );
    expect(usage.occupiedDays[4]).toBe(15);
    expect(usage.animalDaysByType.cow[4]).toBe(30);
  });

  test("two herds at the same time count each day once", () => {
    const usage = computeMeadowMonthlyUsage(
      [
        stay("A", "2025-06-01", "2025-06-10", { cow: 3 }),
        stay("B", "2025-06-05", "2025-06-12", { sheep: 5 }),
      ],
      2025,
      END_OF_YEAR,
    );
    expect(usage.occupiedDays[5]).toBe(12);
  });

  test("leaves out days after the until date", () => {
    const usage = computeMeadowMonthlyUsage(
      [stay("A", "2024-12-20", "2025-03-31", { cow: 1 })],
      2025,
      new Date(2025, 1, 10),
    );
    expect(usage.occupiedDays.slice(0, 3)).toEqual([31, 10, 0]);
  });
});

describe("getMeadowUsageYears", () => {
  test("from the first stay to the current year, newest first", () => {
    expect(
      getMeadowUsageYears([stay("A", "2023-05-01", "2023-05-15", { cow: 1 })], 2025),
    ).toEqual([2025, 2024, 2023]);
  });
});

describe("getCurrentAndLastStays", () => {
  test("current stays and the last finished stay", () => {
    const result = getCurrentAndLastStays(
      [
        stay("A", "2025-05-01", "2025-05-20", { cow: 1 }),
        stay("B", "2025-06-01", "2025-06-30", { cow: 2 }),
      ],
      new Date(2025, 5, 10),
    );
    expect(result.currentStays.map((s) => s.herdName)).toEqual(["B"]);
    expect(result.lastEndDate?.slice(0, 10)).toBe("2025-05-20");
  });
});
