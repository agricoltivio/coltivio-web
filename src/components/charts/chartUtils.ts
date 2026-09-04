/**
 * The single chart palette for the whole app, aligned to the brand tokens.
 * Keep in sync with --chart-1..8 in src/styles.css (used by ui/chart.tsx).
 * [0]=orange (brand secondary), [1]=teal (brand primary), then supporting hues.
 */
export const CHART_COLORS = [
  "#DB751D", "#2A5159", "#85A60F", "#8B6B55",
  "#C8A43C", "#5B8A91", "#B4571C", "#6E7F3A",
];

/** Assign stable colors by name (sorted alphabetically so colors don't shift). */
export function assignColors(names: string[]): Record<string, string> {
  const sorted = [...names].sort();
  return Object.fromEntries(
    sorted.map((name, i) => [name, CHART_COLORS[i % CHART_COLORS.length]]),
  );
}

/** Assign colors to years, indexed by year number. */
export function assignYearColors(years: number[]): Record<number, string> {
  return Object.fromEntries(
    years.map((year, i) => [year, CHART_COLORS[i % CHART_COLORS.length]]),
  );
}

export type BaseUnitType = "kg" | "l";

/** Pick a human-readable display unit given the max value in base units (kg or l). */
export function pickDisplayUnit(
  maxValue: number,
  type: BaseUnitType,
): { divisor: number; label: string } {
  if (type === "kg") {
    if (maxValue >= 1000) return { divisor: 1000, label: "t" };
    if (maxValue >= 100) return { divisor: 100, label: "dt" };
    if (maxValue >= 1) return { divisor: 1, label: "kg" };
    return { divisor: 0.001, label: "g" };
  }
  // litres
  if (maxValue >= 100) return { divisor: 100, label: "hl" };
  if (maxValue >= 1) return { divisor: 1, label: "l" };
  return { divisor: 0.001, label: "ml" };
}

/** Convert an amount + unit string to a base-unit value (kg or l). */
export function toBaseAmount(
  amount: number,
  unit: string,
): { value: number; type: BaseUnitType } {
  switch (unit) {
    case "g":  return { value: amount / 1000, type: "kg" };
    case "kg": return { value: amount, type: "kg" };
    case "dt": return { value: amount * 100, type: "kg" };
    case "t":  return { value: amount * 1000, type: "kg" };
    case "ml": return { value: amount / 1000, type: "l" };
    case "l":  return { value: amount, type: "l" };
    case "hl": return { value: amount * 100, type: "l" };
    default:   return { value: amount, type: "kg" };
  }
}

export interface PieSlice {
  name: string;
  value: number;
  // Present only on a synthetic "other" slice — the individual slices it was folded from,
  // so the tooltip can still break them out on hover. See pieTooltipFormatter.
  children?: PieSlice[];
}

/**
 * Collapse small pie/donut slices into a single trailing "other" slice so outside labels
 * with leader lines stay legible instead of overlapping. A slice's label needs room
 * proportional to its share of the total, not to how many slices there are — so the only
 * cutoff is `minSharePercent`; a chart with many slices above it is left alone.
 */
export function groupSmallPieSlices(
  items: PieSlice[],
  otherLabel: string,
  { minSharePercent = 4 }: { minSharePercent?: number } = {},
): PieSlice[] {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  if (total <= 0) return items;

  const sorted = [...items].sort((a, b) => b.value - a.value);
  const kept: PieSlice[] = [];
  const otherChildren: PieSlice[] = [];
  for (const item of sorted) {
    if ((item.value / total) * 100 < minSharePercent) {
      otherChildren.push(item);
    } else {
      kept.push(item);
    }
  }
  if (otherChildren.length > 0) {
    const otherValue = otherChildren.reduce((sum, item) => sum + item.value, 0);
    kept.push({ name: otherLabel, value: otherValue, children: otherChildren });
  }
  return kept;
}

/**
 * Echarts pie tooltip formatter: the usual "name: value (pct%)" line, plus — for the
 * synthetic "other" slice produced by groupSmallPieSlices — one indented line per folded-in
 * slice showing what it's made up of. `formatValue` renders a slice's raw value (add units,
 * a suffix, etc.); the same formatting is reused for the breakdown lines.
 */
export function pieTooltipFormatter(formatValue: (value: number) => string) {
  return (params: { name: string; value: number; percent: number; marker: string; data: PieSlice }) => {
    const mainLine = `${params.marker}${params.name}: ${formatValue(params.value)} (${params.percent}%)`;
    if (!params.data.children || params.data.children.length === 0) return mainLine;

    const breakdown = params.data.children
      .map((child) => {
        const share = params.value > 0 ? Math.round((child.value / params.value) * 100) : 0;
        return `<div style="margin-left:16px">${child.name}: ${formatValue(child.value)} (${share}%)</div>`;
      })
      .join("");
    return `${mainLine}${breakdown}`;
  };
}

/** Compute running cumulative sum of a 12-element monthly array. */
export function computeCumulative(data: number[]): number[] {
  let running = 0;
  return data.map((v) => (running += v));
}

/** Return localized month abbreviations (Jan, Feb, …) for the given locale. */
export function getMonthLabels(locale: string): string[] {
  return Array.from({ length: 12 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { month: "short" }).format(new Date(2000, i, 1)),
  );
}
