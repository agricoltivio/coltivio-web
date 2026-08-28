import type { Plot } from "@/api/types";

export type PlotColorMode = "plot" | "crop" | "usage" | "cutting";

export const PLOT_COLOR_MODES: PlotColorMode[] = ["plot", "crop", "usage", "cutting"];

// djb2 hash → golden-angle hue → hex color, matching the RN app's plotIdToColor.
export function plotIdToColor(id: string): string {
  let hash = 5381;
  for (let i = 0; i < id.length; i++) hash = (hash * 33) ^ id.charCodeAt(i);
  const hue = Math.abs(hash % 360) * 137.508;
  const h = hue / 360;
  const s = 0.7;
  const l = 0.45;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Golden-angle hue walk for sequential indices (used for cutting-date month coloring).
function indexToDistinctColor(index: number): string {
  const hue = (index * 137.508) % 360;
  return plotIdToColor(`__index_${Math.round(hue)}__`);
}

/** The fill colour for a plot polygon under the chosen colour mode. */
export function resolvePlotColor(plot: Plot, mode: PlotColorMode): string {
  switch (mode) {
    case "crop":
      return plotIdToColor(plot.currentCropRotation?.cropId ?? "__no_crop__");
    case "usage":
      return plotIdToColor(String(plot.usage ?? "__no_usage__"));
    case "cutting":
      if (!plot.cuttingDate) return plotIdToColor("__no_cutting__");
      return indexToDistinctColor(new Date(plot.cuttingDate).getMonth());
    default:
      return plotIdToColor(plot.id);
  }
}
