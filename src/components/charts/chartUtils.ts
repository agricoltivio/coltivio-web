export const CHART_COLORS = [
  "#4A90D9", "#E67E22", "#2ECC71", "#9B59B6", "#E74C3C",
  "#1ABC9C", "#F39C12", "#3498DB", "#8E44AD", "#27AE60",
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
