import type { CropRotation, Plot } from "@/api/types";

export type ZoomLevel = "years" | "months" | "weeks";

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

// px per day for each zoom level
const PX_PER_DAY: Record<ZoomLevel, number> = {
  years: 2,
  months: 8,
  weeks: 30,
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
  rotations: CropRotation[],
  plots: Plot[],
  zoom: ZoomLevel,
  timelineStart: Date,
  timelineEnd: Date,
): TimelineData {
  const pxPerDay = PX_PER_DAY[zoom];
  const totalWidth = Math.ceil(daysBetween(timelineStart, timelineEnd) * pxPerDay);

  // Build a map from plotId → rotation entries
  const rotationsByPlot = new Map<string, CropRotation[]>();
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
    // One grid line per week, major line at month start
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cursor <= end) {
      const x = daysBetween(start, cursor) * pxPerDay;
      const isMonthStart = cursor.getDate() === 1;
      lines.push({
        x,
        label: isMonthStart
          ? cursor.toLocaleString("default", { month: "short", year: "numeric" })
          : `${cursor.getDate()}`,
        isMajor: isMonthStart,
      });
      cursor.setDate(cursor.getDate() + 7);
    }
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
