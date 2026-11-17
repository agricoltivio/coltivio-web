import { describe, expect, test } from "vitest";
import { keptRecurrenceExtras, monthlyAnchorDay } from "./taskRecurrence";

describe("monthlyAnchorDay", () => {
  test("new monthly task anchors on the due date's day", () => {
    expect(monthlyAnchorDay("monthly", "2027-01-31")).toBe(31);
    expect(monthlyAnchorDay("monthly", "2027-03-05")).toBe(5);
  });

  test("no anchor without due date or for other frequencies", () => {
    expect(monthlyAnchorDay("monthly", undefined)).toBeUndefined();
    expect(monthlyAnchorDay("monthly", null)).toBeUndefined();
    expect(monthlyAnchorDay("weekly", "2027-01-31")).toBeUndefined();
    expect(monthlyAnchorDay("yearly", "2027-01-31")).toBeUndefined();
  });

  test("keeps the loaded anchor while the due date is unchanged", () => {
    const loaded = { frequency: "monthly", dueDate: "2027-02-28", byMonthDay: 31 };
    expect(monthlyAnchorDay("monthly", "2027-02-28", loaded)).toBe(31);
  });

  test("follows a changed due date", () => {
    const loaded = { frequency: "monthly", dueDate: "2027-02-28", byMonthDay: 31 };
    expect(monthlyAnchorDay("monthly", "2027-02-15", loaded)).toBe(15);
  });

  test("sets an anchor on tasks saved without one", () => {
    const loaded = { frequency: "monthly", dueDate: "2027-01-31", byMonthDay: null };
    expect(monthlyAnchorDay("monthly", "2027-01-31", loaded)).toBe(31);
  });

  test("ignores the loaded anchor when switching to monthly", () => {
    const loaded = { frequency: "weekly", dueDate: "2027-01-31", byMonthDay: 3 };
    expect(monthlyAnchorDay("monthly", "2027-01-31", loaded)).toBe(31);
  });

  test("drops the anchor when switching away from monthly", () => {
    const loaded = { frequency: "monthly", dueDate: "2027-01-31", byMonthDay: 31 };
    expect(monthlyAnchorDay("weekly", "2027-01-31", loaded)).toBeUndefined();
  });
});

describe("keptRecurrenceExtras", () => {
  const loaded = { frequency: "weekly", byWeekday: ["MO", "TH"], count: 5 };

  test("keeps weekdays and count while frequency and open end are unchanged", () => {
    expect(keptRecurrenceExtras("weekly", "", loaded)).toEqual({ byWeekday: ["MO", "TH"], count: 5 });
  });

  test("drops count when an end date is set", () => {
    expect(keptRecurrenceExtras("weekly", "2027-06-30", loaded)).toEqual({
      byWeekday: ["MO", "TH"],
      count: undefined,
    });
  });

  test("drops everything when the frequency changed", () => {
    expect(keptRecurrenceExtras("monthly", "", loaded)).toEqual({});
  });

  test("nothing to keep without a stored recurrence or stored values", () => {
    expect(keptRecurrenceExtras("weekly", "", null)).toEqual({});
    expect(keptRecurrenceExtras("weekly", "", { frequency: "weekly", byWeekday: null, count: null })).toEqual({
      byWeekday: undefined,
      count: undefined,
    });
  });
});
