import type {
  OutdoorJournalData,
  OutdoorJournalMeadowEntry,
} from "@/api/types";

type CategoryEntry = OutdoorJournalData["entries"][number];

const MS_PER_DAY = 86_400_000;

export type TimelineBar = {
  // Day within the year, inclusive start (0 = 1 January) and exclusive end
  startDay: number;
  endDay: number;
  animalCount: number;
  // Herd shown on the bar (meadow view only)
  herdName?: string;
  scheduleType?: OutdoorJournalMeadowEntry["type"];
  // Sub-line within the row when bars overlap (0 = top)
  lane: number;
};

export type TimelineRow = {
  key: string;
  label: string;
  bars: TimelineBar[];
  laneCount: number;
};

// Day number from the date part only ("2025-05-16…"), so the calendar day the
// backend means is used regardless of the browser timezone
function toDayNumber(isoDate: string): number {
  const [year, month, day] = isoDate.slice(0, 10).split("-").map(Number);
  return Date.UTC(year, month - 1, day) / MS_PER_DAY;
}

export function daysInYear(year: number): number {
  return (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / MS_PER_DAY;
}

// Day range of an entry within the year: inclusive on both ends, so a single-day
// entry still covers its own day. Null when it lies outside the year.
function dayRangeInYear(
  startDate: string,
  endDate: string,
  year: number,
): { startDay: number; endDay: number } | null {
  const yearStart = Date.UTC(year, 0, 1) / MS_PER_DAY;
  const startDay = Math.max(0, toDayNumber(startDate) - yearStart);
  const endDay = Math.min(
    daysInYear(year),
    toDayNumber(endDate) - yearStart + 1,
  );
  return endDay > startDay ? { startDay, endDay } : null;
}

// Joins bars that touch or overlap and describe the same stay, so consecutive
// single-day entries (e.g. weekday stays) render as one continuous bar
function mergeTouchingBars(
  bars: TimelineBar[],
  isSameStay: (previous: TimelineBar, next: TimelineBar) => boolean,
): TimelineBar[] {
  const sorted = [...bars].sort((a, b) => a.startDay - b.startDay);
  const merged: TimelineBar[] = [];
  for (const bar of sorted) {
    const previous = merged[merged.length - 1];
    if (previous && bar.startDay <= previous.endDay && isSameStay(previous, bar)) {
      previous.endDay = Math.max(previous.endDay, bar.endDay);
    } else {
      merged.push({ ...bar });
    }
  }
  return merged;
}

// One row per category (in the given order), one bar per stay
export function buildCategoryRows(
  entries: CategoryEntry[],
  categories: readonly string[],
  year: number,
): TimelineRow[] {
  return categories.map((category) => {
    const bars = entries
      .filter((entry) => entry.category === category)
      .flatMap((entry): TimelineBar[] => {
        const range = dayRangeInYear(entry.startDate, entry.endDate, year);
        return range
          ? [{ ...range, animalCount: entry.animalCount, lane: 0 }]
          : [];
      });
    return {
      key: category,
      label: category,
      bars: mergeTouchingBars(
        bars,
        (previous, next) => previous.animalCount === next.animalCount,
      ),
      laneCount: 1,
    };
  });
}

// One row per meadow, most recently used on top. Herds on the meadow at the same
// time get separate lanes; a herd keeps its lane when it's free.
export function buildMeadowRows(
  entries: OutdoorJournalMeadowEntry[],
  year: number,
): TimelineRow[] {
  const entriesByMeadow = new Map<string, OutdoorJournalMeadowEntry[]>();
  for (const entry of entries) {
    entriesByMeadow.set(entry.meadowId, [
      ...(entriesByMeadow.get(entry.meadowId) ?? []),
      entry,
    ]);
  }

  const rows: TimelineRow[] = [];
  for (const [meadowId, meadowEntries] of entriesByMeadow) {
    const bars = meadowEntries.flatMap((entry): TimelineBar[] => {
      const range = dayRangeInYear(entry.startDate, entry.endDate, year);
      return range
        ? [
            {
              ...range,
              animalCount: entry.animalCount,
              herdName: entry.herdName,
              scheduleType: entry.type,
              lane: 0,
            },
          ]
        : [];
    });
    if (bars.length === 0) continue;
    const mergedBars = mergeTouchingBars(
      bars,
      (previous, next) =>
        previous.herdName === next.herdName &&
        previous.scheduleType === next.scheduleType &&
        previous.animalCount === next.animalCount,
    );

    const laneEndDays: number[] = [];
    const lastLaneByHerd = new Map<string, number>();
    for (const bar of mergedBars) {
      const herdKey = bar.herdName ?? "";
      const preferredLane = lastLaneByHerd.get(herdKey);
      let lane =
        preferredLane !== undefined &&
        laneEndDays[preferredLane] <= bar.startDay
          ? preferredLane
          : laneEndDays.findIndex((endDay) => endDay <= bar.startDay);
      if (lane === -1) lane = laneEndDays.length;
      laneEndDays[lane] = bar.endDay;
      lastLaneByHerd.set(herdKey, lane);
      bar.lane = lane;
    }

    rows.push({
      key: meadowId,
      label: meadowEntries[0].meadowName,
      bars: mergedBars,
      laneCount: Math.max(1, laneEndDays.length),
    });
  }

  const lastDay = (row: TimelineRow) =>
    Math.max(-1, ...row.bars.map((bar) => bar.endDay));
  return rows.sort(
    (a, b) => lastDay(b) - lastDay(a) || a.label.localeCompare(b.label),
  );
}
