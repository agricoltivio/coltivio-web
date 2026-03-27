import type { Crop, CropRotation, Plot } from "@/api/types";

// Minimal rotation shape required by the timeline — a subset of CropRotation.
// CropRotation is assignable here; other sources (e.g. local draft state) can
// construct this without filling in unused API fields.
export type TimelineRotation = {
  id: string;
  plotId: string;
  fromDate: string;
  toDate: string;
  crop: { name: string; category: CropRotation["crop"]["category"] };
};

export type ZoomLevel = "years" | "months" | "weeks";

// --- Shared rotation entry types and utilities ---

export type RecurrenceRule = {
  interval: number; // every N years
  until?: Date;
};

export type RotationEntry = {
  entryId: string;
  cropId: string;
  fromDate: Date;
  toDate: Date;
  recurrence?: RecurrenceRule;
  isNew: boolean;
};

export type WaitingTimeViolation = { conflictingCropName: string; requiredYears: number };

export function addYears(date: Date, years: number): Date {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

// Expand one entry into its concrete date occurrences up to timelineEnd.
export function expandRanges(
  entry: RotationEntry,
  timelineEnd: Date,
): Array<{ from: Date; to: Date }> {
  if (!entry.recurrence) return [{ from: entry.fromDate, to: entry.toDate }];
  const effectiveUntil =
    entry.recurrence.until && entry.recurrence.until < timelineEnd
      ? entry.recurrence.until
      : timelineEnd;
  const ranges: Array<{ from: Date; to: Date }> = [];
  const durationMs = entry.toDate.getTime() - entry.fromDate.getTime();
  let currentFrom = new Date(entry.fromDate);
  let iteration = 0;
  while (currentFrom <= effectiveUntil && iteration < 100) {
    ranges.push({ from: new Date(currentFrom), to: new Date(currentFrom.getTime() + durationMs) });
    currentFrom = addYears(currentFrom, entry.recurrence.interval);
    iteration++;
  }
  return ranges;
}

// Returns a map of entryId → name of the conflicting crop.
export function detectConflicts(
  entries: RotationEntry[],
  crops: Crop[],
  timelineEnd: Date,
): Map<string, string> {
  const conflicts = new Map<string, string>();
  const expanded = entries.map((e) => expandRanges(e, timelineEnd));
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      let overlapping = false;
      outer: for (const rangeA of expanded[i]) {
        for (const rangeB of expanded[j]) {
          if (rangeA.from <= rangeB.to && rangeA.to >= rangeB.from) {
            overlapping = true;
            break outer;
          }
        }
      }
      if (overlapping) {
        const nameI = crops.find((c) => c.id === entries[i].cropId)?.name ?? "?";
        const nameJ = crops.find((c) => c.id === entries[j].cropId)?.name ?? "?";
        if (!conflicts.has(entries[i].entryId)) conflicts.set(entries[i].entryId, nameJ);
        if (!conflicts.has(entries[j].entryId)) conflicts.set(entries[j].entryId, nameI);
      }
    }
  }
  return conflicts;
}

// Returns a map of entryId → violation info for entries whose same-family gap is too short.
export function detectWaitingTimeViolations(
  entries: RotationEntry[],
  crops: Crop[],
  timelineEnd: Date,
): Map<string, WaitingTimeViolation> {
  const violations = new Map<string, WaitingTimeViolation>();
  type ExpandedRange = { entryId: string; cropName: string; groupKey: string; waitingTimeYears: number; from: Date; to: Date };
  const allRanges: ExpandedRange[] = [];
  for (const entry of entries) {
    const crop = crops.find((c) => c.id === entry.cropId);
    if (!crop) continue;
    const waitingTimeYears = crop.waitingTimeInYears ?? crop.family?.waitingTimeInYears ?? 0;
    if (waitingTimeYears <= 0) continue;
    const groupKey = crop.familyId ? `family:${crop.familyId}` : `crop:${crop.id}`;
    for (const range of expandRanges(entry, timelineEnd)) {
      allRanges.push({ entryId: entry.entryId, cropName: crop.name, groupKey, waitingTimeYears, from: range.from, to: range.to });
    }
  }
  const groups = new Map<string, ExpandedRange[]>();
  for (const r of allRanges) {
    const g = groups.get(r.groupKey) ?? [];
    g.push(r);
    groups.set(r.groupKey, g);
  }
  for (const groupRanges of groups.values()) {
    const sorted = [...groupRanges].sort((a, b) => a.from.getTime() - b.from.getTime());
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        if (sorted[i].to > sorted[j].from) continue;
        const gapMs = sorted[j].from.getTime() - sorted[i].to.getTime();
        const requiredYears = Math.max(sorted[i].waitingTimeYears, sorted[j].waitingTimeYears);
        if (gapMs < requiredYears * 365.25 * 24 * 60 * 60 * 1000) {
          if (!violations.has(sorted[i].entryId)) violations.set(sorted[i].entryId, { conflictingCropName: sorted[j].cropName, requiredYears });
          if (!violations.has(sorted[j].entryId)) violations.set(sorted[j].entryId, { conflictingCropName: sorted[i].cropName, requiredYears });
        }
      }
    }
  }
  return violations;
}

export type GridLine = {
  x: number;
  label: string;
  isMajor: boolean;
};

export type TimelineBar = {
  rotationId: string;
  cropName: string;
  cropCategory: CropRotation["crop"]["category"];
  left: number;
  width: number;
  fromDate: string;
  toDate: string;
};

export type TimelinePlotData = {
  plotId: string;
  plotName: string;
  bars: TimelineBar[];
};

export type TimelineData = {
  plots: TimelinePlotData[];
  gridLines: GridLine[];
  totalWidth: number;
  timelineStart: Date;
  timelineEnd: Date;
};

const CROP_COLOR_PALETTE = [
  "#FF6384", // Pink
  "#36A2EB", // Light Blue
  "#FFCE56", // Yellow
  "#4BC0C0", // Teal
  "#9966FF", // Purple
  "#8E44AD", // Deep Purple
  "#2ECC71", // Green
  "#E74C3C", // Red
  "#3498DB", // Blue
];

// djb2 hash of the crop name, stable regardless of render order
export function stringToColor(name: string): string {
  let hash = 5381;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 33) ^ name.charCodeAt(i);
  }
  return CROP_COLOR_PALETTE[Math.abs(hash) % CROP_COLOR_PALETTE.length];
}

export function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// px per day for each zoom level
const PX_PER_DAY: Record<ZoomLevel, number> = {
  years: 0.5,
  months: 3,
  weeks: 20,
};

export function getScaleForZoomLevel(zoom: ZoomLevel): number {
  return PX_PER_DAY[zoom];
}

// Color by crop category — returns a Tailwind bg class
const CATEGORY_COLORS: Record<CropRotation["crop"]["category"], string> = {
  grass: "bg-green-500",
  grain: "bg-yellow-500",
  vegetable: "bg-emerald-500",
  fruit: "bg-orange-500",
  other: "bg-slate-400",
};

export function getCropCategoryColor(category: CropRotation["crop"]["category"]): string {
  return CATEGORY_COLORS[category];
}

function daysBetween(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
}

export function buildTimelineData(
  rotations: TimelineRotation[],
  plots: Plot[],
  zoom: ZoomLevel,
  timelineStart: Date,
  timelineEnd: Date,
): TimelineData {
  const pxPerDay = PX_PER_DAY[zoom];
  const totalWidth = Math.ceil(daysBetween(timelineStart, timelineEnd) * pxPerDay);

  // Build a map from plotId → rotation entries
  const rotationsByPlot = new Map<string, TimelineRotation[]>();
  for (const rotation of rotations) {
    const existing = rotationsByPlot.get(rotation.plotId) ?? [];
    existing.push(rotation);
    rotationsByPlot.set(rotation.plotId, existing);
  }

  const timelinePlots: TimelinePlotData[] = plots.map((plot) => {
    const plotRotations = rotationsByPlot.get(plot.id) ?? [];
    const bars: TimelineBar[] = plotRotations
      .map((rotation) => {
        const fromDate = new Date(rotation.fromDate);
        const toDate = new Date(rotation.toDate);
        // Clamp to visible range
        const clampedFrom = fromDate < timelineStart ? timelineStart : fromDate;
        const clampedTo = toDate > timelineEnd ? timelineEnd : toDate;
        if (clampedFrom >= clampedTo) return null;

        const left = Math.max(0, daysBetween(timelineStart, clampedFrom) * pxPerDay);
        const width = Math.max(0, daysBetween(clampedFrom, clampedTo) * pxPerDay);
        return {
          rotationId: rotation.id,
          cropName: rotation.crop.name,
          cropCategory: rotation.crop.category,
          left,
          width,
          fromDate: rotation.fromDate,
          toDate: rotation.toDate,
        };
      })
      .filter((bar): bar is TimelineBar => bar !== null);

    return {
      plotId: plot.id,
      plotName: plot.name,
      bars,
    };
  });

  const gridLines = getAllGridLines(zoom, timelineStart, timelineEnd, pxPerDay);

  return {
    plots: timelinePlots,
    gridLines,
    totalWidth,
    timelineStart,
    timelineEnd,
  };
}

export function getAllGridLines(
  zoom: ZoomLevel,
  start: Date,
  end: Date,
  pxPerDay: number,
): GridLine[] {
  const lines: GridLine[] = [];

  if (zoom === "years") {
    // One grid line per month, major line at year start
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cursor <= end) {
      const x = daysBetween(start, cursor) * pxPerDay;
      const isYearStart = cursor.getMonth() === 0;
      lines.push({
        x,
        label: isYearStart
          ? cursor.getFullYear().toString()
          : cursor.toLocaleString("default", { month: "short" }),
        isMajor: isYearStart,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
  } else if (zoom === "months") {
    // Major lines at every month start, minor lines at every week start within each month.
    // Using two separate passes avoids the +7 day cursor skipping over the 1st of a month.
    const monthCursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (monthCursor <= end) {
      const x = daysBetween(start, monthCursor) * pxPerDay;
      lines.push({
        x,
        label: monthCursor.toLocaleString("default", { month: "short", year: "numeric" }),
        isMajor: true,
      });
      // Emit minor week lines inside this month (days 8, 15, 22)
      for (const weekDay of [8, 15, 22]) {
        const weekDate = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), weekDay);
        if (weekDate > end) break;
        lines.push({
          x: daysBetween(start, weekDate) * pxPerDay,
          label: `${weekDay}`,
          isMajor: false,
        });
      }
      monthCursor.setMonth(monthCursor.getMonth() + 1);
    }
    lines.sort((a, b) => a.x - b.x);
  } else {
    // weeks zoom: one grid line per day, major at week start (Monday)
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    while (cursor <= end) {
      const x = daysBetween(start, cursor) * pxPerDay;
      const isWeekStart = cursor.getDay() === 1; // Monday
      lines.push({
        x,
        label: isWeekStart
          ? cursor.toLocaleString("default", { day: "2-digit", month: "short" })
          : "",
        isMajor: isWeekStart,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return lines;
}

export function getTodayX(timelineStart: Date, pxPerDay: number): number {
  return daysBetween(timelineStart, new Date()) * pxPerDay;
}
