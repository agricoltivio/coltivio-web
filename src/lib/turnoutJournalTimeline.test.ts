import { describe, expect, test } from "vitest";
import type { OutdoorJournalMeadowEntry } from "@/api/types";
import {
  buildCategoryRows,
  buildMeadowRows,
  daysInYear,
} from "./turnoutJournalTimeline";

function day(dayOfMonth: number, month = 5): string {
  const mm = String(month).padStart(2, "0");
  const dd = String(dayOfMonth).padStart(2, "0");
  return `2025-${mm}-${dd}T00:00:00.000Z`;
}

function meadowEntry(
  meadowId: string,
  meadowName: string,
  herdName: string,
  startDate: string,
  endDate: string,
): OutdoorJournalMeadowEntry {
  return {
    meadowId,
    meadowName,
    meadowSize: 10000,
    herdId: `herd-${herdName}`,
    herdName,
    type: "pasture",
    startDate,
    endDate,
    animalCount: 10,
    animalCountsByType: { cow: 10 },
  };
}

describe("buildCategoryRows", () => {
  test("a single-day entry covers its own day", () => {
    const [row] = buildCategoryRows(
      [{ category: "A1", startDate: day(5), endDate: day(5), animalCount: 3 }],
      ["A1"],
      2025,
    );
    expect(row.bars[0].endDay - row.bars[0].startDay).toBe(1);
  });

  test("consecutive single-day entries merge into one bar", () => {
    const [row] = buildCategoryRows(
      [5, 6, 7].map((d) => ({
        category: "A1",
        startDate: day(d),
        endDate: day(d),
        animalCount: 3,
      })),
      ["A1"],
      2025,
    );
    expect(row.bars).toHaveLength(1);
    expect(row.bars[0].endDay - row.bars[0].startDay).toBe(3);
  });

  test("a different animal count keeps bars separate", () => {
    const [row] = buildCategoryRows(
      [
        { category: "A1", startDate: day(5), endDate: day(5), animalCount: 3 },
        { category: "A1", startDate: day(6), endDate: day(6), animalCount: 4 },
      ],
      ["A1"],
      2025,
    );
    expect(row.bars).toHaveLength(2);
  });

  test("entries are clipped to the year", () => {
    const [row] = buildCategoryRows(
      [
        {
          category: "A1",
          startDate: "2024-12-20T00:00:00.000Z",
          endDate: "2026-01-10T00:00:00.000Z",
          animalCount: 3,
        },
      ],
      ["A1"],
      2025,
    );
    expect(row.bars[0].startDay).toBe(0);
    expect(row.bars[0].endDay).toBe(daysInYear(2025));
  });
});

describe("buildMeadowRows", () => {
  test("overlapping herds go on separate lanes", () => {
    const [row] = buildMeadowRows(
      [
        meadowEntry("m1", "Allmend", "Kühe", day(1), day(10)),
        meadowEntry("m1", "Allmend", "Rinder", day(5), day(15)),
      ],
      2025,
    );
    expect(row.laneCount).toBe(2);
    expect(row.bars.map((bar) => bar.lane)).toEqual([0, 1]);
  });

  test("a free lane is reused", () => {
    const [row] = buildMeadowRows(
      [
        meadowEntry("m1", "Allmend", "Kühe", day(1), day(10)),
        meadowEntry("m1", "Allmend", "Rinder", day(12), day(15)),
      ],
      2025,
    );
    expect(row.laneCount).toBe(1);
  });

  test("most recently used meadow first", () => {
    const rows = buildMeadowRows(
      [
        meadowEntry("m1", "Allmend", "Kühe", day(1), day(10)),
        meadowEntry("m2", "Zelg", "Kühe", day(1, 8), day(10, 8)),
      ],
      2025,
    );
    expect(rows.map((row) => row.label)).toEqual(["Zelg", "Allmend"]);
  });

  test("meadows without a stay in the year are left out", () => {
    const rows = buildMeadowRows(
      [
        meadowEntry(
          "m1",
          "Allmend",
          "Kühe",
          "2023-05-01T00:00:00.000Z",
          "2023-05-10T00:00:00.000Z",
        ),
      ],
      2025,
    );
    expect(rows).toHaveLength(0);
  });
});
