import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  getDay,
  getDaysInMonth,
} from "date-fns";
import { parseDateOnly } from "@/lib/utils";

// Bars of one herd's timeline for a year: its schedules (recurrences expanded the same way
// as on the server) with the exceptions (overrides) applied. An exception takes precedence
// over the schedule on its days: those days are cut out of the schedule bars and the
// exception gets a bar of its own.

export type HerdTimelineType = "pasture" | "exercise_yard" | "stable";

type ScheduleForTimeline = {
  id: string;
  startDate: string;
  endDate: string | null;
  type: HerdTimelineType;
  notes: string | null;
  recurrence: {
    frequency: "weekly" | "monthly" | "yearly";
    interval: number;
    byWeekday?: string[] | null;
    byMonthDay?: number | null;
    until?: string | null;
    count?: number | null;
  } | null;
};

type OverrideForTimeline = {
  id: string;
  startDate: string;
  // inclusive
  endDate: string;
  type: HerdTimelineType;
  notes: string | null;
};

export type HerdTimelineBar = {
  // schedule or override id
  id: string;
  isOverride: boolean;
  type: HerdTimelineType;
  notes: string | null;
  // day of the year, 0 = Jan 1, both inclusive
  startDay: number;
  endDay: number;
};

type DayRange = { startDay: number; endDay: number };

const WEEKDAY_INDEX: Record<string, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};
const MAX_ITERATIONS = 10_000;

// Occurrences of a schedule as [start, end] dates (inclusive), up to windowEnd. Same rules as
// expandOutdoorSchedule in the API.
function expandSchedule(schedule: ScheduleForTimeline, windowEnd: Date): [Date, Date][] {
  const start = parseDateOnly(schedule.startDate);
  const end = schedule.endDate ? parseDateOnly(schedule.endDate) : null;
  const recurrence = schedule.recurrence;
  if (!recurrence) return [[start, end ?? windowEnd]];

  const durationDays = end ? differenceInCalendarDays(end, start) : 0;
  const plusDuration = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate() + durationDays);
  const until = recurrence.until ? parseDateOnly(recurrence.until) : null;
  const maxCount = recurrence.count ?? Infinity;
  const interval = recurrence.interval;
  const occurrences: [Date, Date][] = [];
  let occurrenceCount = 0;

  for (let step = 0; step < MAX_ITERATIONS; step++) {
    if (occurrenceCount >= maxCount) break;
    if (recurrence.frequency === "yearly") {
      const occurrenceStart = addYears(start, interval * step);
      if ((until && occurrenceStart > until) || occurrenceStart > windowEnd) break;
      occurrences.push([occurrenceStart, plusDuration(occurrenceStart)]);
      occurrenceCount++;
    } else if (recurrence.frequency === "monthly") {
      let occurrenceStart = addMonths(start, interval * step);
      if (recurrence.byMonthDay !== null && recurrence.byMonthDay !== undefined) {
        // Day 31 lands on the month's last day instead of spilling into the next month
        occurrenceStart = new Date(
          occurrenceStart.getFullYear(),
          occurrenceStart.getMonth(),
          Math.min(recurrence.byMonthDay, getDaysInMonth(occurrenceStart)),
        );
      }
      if ((until && occurrenceStart > until) || occurrenceStart > windowEnd) break;
      occurrences.push([occurrenceStart, plusDuration(occurrenceStart)]);
      occurrenceCount++;
    } else {
      const weekStart = addWeeks(start, interval * step);
      if ((until && weekStart > until) || weekStart > windowEnd) break;
      const weekdays =
        recurrence.byWeekday && recurrence.byWeekday.length > 0 ? recurrence.byWeekday : null;
      if (!weekdays) {
        occurrences.push([weekStart, plusDuration(weekStart)]);
        occurrenceCount++;
        continue;
      }
      for (const weekday of weekdays) {
        if (occurrenceCount >= maxCount) break;
        // That weekday within the week starting on weekStart (setDay with weekStartsOn =
        // weekStart's day, as on the server)
        const daysAhead = (WEEKDAY_INDEX[weekday] - getDay(weekStart) + 7) % 7;
        const occurrenceStart = addDays(weekStart, daysAhead);
        if (until && occurrenceStart > until) continue;
        if (occurrenceStart < start) continue;
        occurrences.push([occurrenceStart, plusDuration(occurrenceStart)]);
        occurrenceCount++;
      }
    }
  }
  return occurrences;
}

// Parts of [startDay, endDay] not covered by the given ranges (all inclusive)
export function subtractDayRanges(
  startDay: number,
  endDay: number,
  covered: DayRange[],
): DayRange[] {
  const parts: DayRange[] = [];
  let cursor = startDay;
  for (const range of [...covered].sort((a, b) => a.startDay - b.startDay)) {
    if (range.endDay < cursor || range.startDay > endDay) continue;
    if (range.startDay > cursor) parts.push({ startDay: cursor, endDay: range.startDay - 1 });
    cursor = Math.max(cursor, range.endDay + 1);
  }
  if (cursor <= endDay) parts.push({ startDay: cursor, endDay });
  return parts;
}

export function buildHerdYearBars(
  schedules: ScheduleForTimeline[],
  overrides: OverrideForTimeline[],
  year: number,
): HerdTimelineBar[] {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);
  const lastDay = differenceInCalendarDays(yearEnd, yearStart);
  // Clamped to the year; null when the range lies outside of it
  const toDayRange = (start: Date, end: Date): DayRange | null => {
    const startDay = Math.max(0, differenceInCalendarDays(start, yearStart));
    const endDay = Math.min(lastDay, differenceInCalendarDays(end, yearStart));
    return startDay <= endDay ? { startDay, endDay } : null;
  };

  const overrideBars: HerdTimelineBar[] = [];
  for (const override of overrides) {
    const range = toDayRange(parseDateOnly(override.startDate), parseDateOnly(override.endDate));
    if (!range) continue;
    overrideBars.push({
      id: override.id,
      isOverride: true,
      type: override.type,
      notes: override.notes,
      ...range,
    });
  }

  const scheduleBars: HerdTimelineBar[] = [];
  for (const schedule of schedules) {
    for (const [start, end] of expandSchedule(schedule, yearEnd)) {
      const range = toDayRange(start, end);
      if (!range) continue;
      for (const part of subtractDayRanges(range.startDay, range.endDay, overrideBars)) {
        scheduleBars.push({
          id: schedule.id,
          isOverride: false,
          type: schedule.type,
          notes: schedule.notes,
          ...part,
        });
      }
    }
  }

  return [...scheduleBars, ...overrideBars].sort((a, b) => a.startDay - b.startDay);
}
