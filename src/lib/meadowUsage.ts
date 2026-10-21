import type { MeadowUsageEntry } from "@/api/types";

const MS_PER_DAY = 86_400_000;

export type MeadowMonthlyUsage = {
  // Distinct days with any herd on the meadow, per month (index 0 = January)
  occupiedDays: number[];
  // Animal-days per animal type per month: days on the meadow × animals of that type
  animalDaysByType: Record<string, number[]>;
};

// Day number from the date part only ("2025-05-16…"), so the calendar day the
// backend means is used regardless of the browser timezone
function toDayNumber(isoDate: string): number {
  const [year, month, day] = isoDate.slice(0, 10).split("-").map(Number);
  return Date.UTC(year, month - 1, day) / MS_PER_DAY;
}

function monthOfDayNumber(dayNumber: number): number {
  return new Date(dayNumber * MS_PER_DAY).getUTCMonth();
}

// Monthly usage of a meadow in one year. Stays count inclusive on both ends; days
// after `untilDate` (usually today) are left out, so planned stays don't count yet.
export function computeMeadowMonthlyUsage(
  entries: MeadowUsageEntry[],
  year: number,
  untilDate: Date,
): MeadowMonthlyUsage {
  const yearStart = Date.UTC(year, 0, 1) / MS_PER_DAY;
  const yearEnd = Date.UTC(year, 11, 31) / MS_PER_DAY;
  const lastCountedDay = Math.min(
    yearEnd,
    Date.UTC(untilDate.getFullYear(), untilDate.getMonth(), untilDate.getDate()) /
      MS_PER_DAY,
  );

  const occupiedDaySet = new Set<number>();
  const animalDaysByType: Record<string, number[]> = {};
  for (const entry of entries) {
    const firstDay = Math.max(toDayNumber(entry.startDate), yearStart);
    const lastDay = Math.min(toDayNumber(entry.endDate), lastCountedDay);
    for (let day = firstDay; day <= lastDay; day++) {
      const month = monthOfDayNumber(day);
      occupiedDaySet.add(day);
      for (const [animalType, count] of Object.entries(entry.animalCountsByType)) {
        const perMonth = (animalDaysByType[animalType] ??= new Array(12).fill(0));
        perMonth[month] += count;
      }
    }
  }

  const occupiedDays = new Array(12).fill(0);
  for (const day of occupiedDaySet) {
    occupiedDays[monthOfDayNumber(day)] += 1;
  }
  return { occupiedDays, animalDaysByType };
}

// Years from the first stay up to the current year, newest first
export function getMeadowUsageYears(
  entries: MeadowUsageEntry[],
  currentYear: number,
): number[] {
  const firstYear = entries.reduce(
    (earliest, entry) => Math.min(earliest, Number(entry.startDate.slice(0, 4))),
    currentYear,
  );
  return Array.from(
    { length: currentYear - firstYear + 1 },
    (_, index) => currentYear - index,
  );
}

// Stays covering today (date part), for "animals now" and "last used"
export function getCurrentAndLastStays(
  entries: MeadowUsageEntry[],
  today: Date,
): { currentStays: MeadowUsageEntry[]; lastEndDate: string | null } {
  const todayDay =
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) / MS_PER_DAY;
  const currentStays = entries.filter(
    (entry) =>
      toDayNumber(entry.startDate) <= todayDay &&
      toDayNumber(entry.endDate) >= todayDay,
  );
  const pastEndDates = entries
    .map((entry) => entry.endDate)
    .filter((endDate) => toDayNumber(endDate) < todayDay)
    .sort();
  return {
    currentStays,
    lastEndDate: pastEndDates.length > 0 ? pastEndDates[pastEndDates.length - 1] : null,
  };
}

type ScheduleEndInfo = {
  meadowId: string | null;
  endDate: string | null;
  recurrence: { until: string | null } | null;
};

// Names of the herds with a schedule on this meadow that hasn't ended yet (ongoing or
// upcoming). A repeating schedule ends with its "until" date, a single stay with its
// end date; without one it's open-ended. today is a "YYYY-MM-DD" local date.
// Such a meadow can't be archived.
export function getHerdsWithActiveSchedules(
  herds: { name: string; outdoorSchedules: ScheduleEndInfo[] }[],
  meadowId: string,
  today: string,
): string[] {
  return herds
    .filter((herd) =>
      herd.outdoorSchedules.some((schedule) => {
        if (schedule.meadowId !== meadowId) return false;
        const lastDay = schedule.recurrence ? schedule.recurrence.until : schedule.endDate;
        return lastDay === null || lastDay.slice(0, 10) >= today;
      }),
    )
    .map((herd) => herd.name);
}

// Local calendar date as "YYYY-MM-DD"
export function todayLocalDateString(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}
