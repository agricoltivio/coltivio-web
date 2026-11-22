import { describe, expect, it } from "vitest";
import { buildHerdYearBars, subtractDayRanges } from "./herdTimeline";

// Day of the year 2026 (Jan 1 = 0)
function day(month: number, dayOfMonth: number) {
  return Math.round(
    (new Date(2026, month - 1, dayOfMonth).getTime() - new Date(2026, 0, 1).getTime()) / 86_400_000,
  );
}

function schedule(
  startDate: string,
  endDate: string | null,
  recurrence: Parameters<typeof buildHerdYearBars>[0][number]["recurrence"] = null,
) {
  return { id: "s1", startDate, endDate, type: "pasture" as const, notes: null, recurrence };
}

function override(startDate: string, endDate: string, type: "pasture" | "exercise_yard" | "stable") {
  return { id: `o-${startDate}`, startDate, endDate, type, notes: null };
}

const simplify = (bars: ReturnType<typeof buildHerdYearBars>) =>
  bars.map((bar) => [bar.type, bar.isOverride, bar.startDay, bar.endDay]);

describe("subtractDayRanges", () => {
  it("cuts ranges at the start, in the middle and at the end", () => {
    expect(
      subtractDayRanges(10, 30, [
        { startDay: 5, endDay: 11 },
        { startDay: 20, endDay: 21 },
        { startDay: 30, endDay: 40 },
      ]),
    ).toEqual([
      { startDay: 12, endDay: 19 },
      { startDay: 22, endDay: 29 },
    ]);
  });
});

describe("buildHerdYearBars", () => {
  it("a stable exception splits the pasture schedule and gets its own bar", () => {
    const bars = buildHerdYearBars(
      [schedule("2026-11-02", "2026-11-30")],
      [override("2026-11-22", "2026-11-22", "stable")],
      2026,
    );
    expect(simplify(bars)).toEqual([
      ["pasture", false, day(11, 2), day(11, 21)],
      ["stable", true, day(11, 22), day(11, 22)],
      ["pasture", false, day(11, 23), day(11, 30)],
    ]);
  });

  it("an exception on days without a schedule adds them", () => {
    const bars = buildHerdYearBars([], [override("2026-03-01", "2026-03-02", "pasture")], 2026);
    expect(simplify(bars)).toEqual([["pasture", true, day(3, 1), day(3, 2)]]);
  });

  it("open-ended schedules and ranges outside the year are clamped", () => {
    const bars = buildHerdYearBars([schedule("2025-12-01", null)], [], 2026);
    expect(simplify(bars)).toEqual([["pasture", false, 0, day(12, 31)]]);
  });

  it("expands weekly weekday stays and yearly seasons like the server", () => {
    // 2026-05-04 is a Monday: Monday and Wednesday of two weeks
    const weekly = buildHerdYearBars(
      [schedule("2026-05-04", "2026-05-04", { frequency: "weekly", interval: 1, byWeekday: ["MO", "WE"], until: "2026-05-13" })],
      [],
      2026,
    );
    expect(simplify(weekly)).toEqual([
      ["pasture", false, day(5, 4), day(5, 4)],
      ["pasture", false, day(5, 6), day(5, 6)],
      ["pasture", false, day(5, 11), day(5, 11)],
      ["pasture", false, day(5, 13), day(5, 13)],
    ]);

    const yearly = buildHerdYearBars(
      [schedule("2024-05-01", "2024-09-30", { frequency: "yearly", interval: 1 })],
      [override("2026-06-10", "2026-06-12", "stable")],
      2026,
    );
    expect(simplify(yearly)).toEqual([
      ["pasture", false, day(5, 1), day(6, 9)],
      ["stable", true, day(6, 10), day(6, 12)],
      ["pasture", false, day(6, 13), day(9, 30)],
    ]);
  });
});
