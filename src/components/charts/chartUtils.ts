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
