import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { Plot } from "@/api/types";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Sum of the current per-plot amounts (parsed), rounded to 2 decimals. */
export function sumDivided(unitsByPlot: Record<string, string>, plotIds: string[]): number {
  return round2(
    plotIds.reduce((total, id) => total + (parseFloat(unitsByPlot[id] ?? "") || 0), 0),
  );
}

/**
 * Distribute `totalUnits` across the selected plots. A switch (on by default)
 * auto-splits proportionally by plot area, giving the rounding remainder to the
 * last plot; turning it off lets each plot's amount be typed by hand. Mirrors the
 * RN app's "divide on plots" screen.
 */
export function PlotDivideSection({
  plots,
  totalUnits,
  unitLabel,
  byArea,
  onByAreaChange,
  unitsByPlot,
  onChange,
}: {
  plots: Plot[];
  totalUnits: number;
  unitLabel?: string;
  byArea: boolean;
  onByAreaChange: (byArea: boolean) => void;
  unitsByPlot: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}) {
  const { t } = useTranslation();

  // Work with a 2-decimal total so the rounded per-plot split adds back up exactly.
  const total = round2(totalUnits);
  const plotKey = plots.map((p) => p.id).join(",");

  // Auto-split by area whenever the switch is on and the inputs change.
  useEffect(() => {
    if (!byArea) return;
    const totalArea = plots.reduce((sum, plot) => sum + plot.size, 0);
    let distributed = 0;
    const next: Record<string, string> = {};
    plots.forEach((plot, index) => {
      let quantity: number;
      if (totalArea === 0) {
        quantity = index === plots.length - 1 ? round2(total - distributed) : 0;
      } else if (index === plots.length - 1) {
        quantity = round2(total - distributed);
      } else {
        quantity = round2(total * (plot.size / totalArea));
      }
      distributed = round2(distributed + quantity);
      next[plot.id] = String(quantity);
    });
    onChange(next);
  }, [byArea, plotKey, total]);

  const distributed = sumDivided(unitsByPlot, plots.map((p) => p.id));
  const remaining = round2(total - distributed);

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{t("fieldCalendar.divide.heading")}</p>
        <span
          className={cn(
            "text-sm tabular-nums",
            remaining !== 0 ? "font-medium text-destructive" : "text-muted-foreground",
          )}
        >
          {t("fieldCalendar.divide.remaining", {
            amount: remaining,
            unit: unitLabel ?? "",
          })}
        </span>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Switch checked={byArea} onCheckedChange={onByAreaChange} />
        {t("fieldCalendar.divide.byArea")}
      </label>

      <div className="space-y-2">
        {plots.map((plot) => (
          <div key={plot.id} className="flex items-center gap-3">
            <span className="min-w-0 flex-1 truncate text-sm">
              {plot.name}{" "}
              <span className="text-muted-foreground">
                ({(plot.size / 100).toFixed(1)} a)
              </span>
            </span>
            <Input
              type="number"
              step="0.01"
              className="w-24"
              value={unitsByPlot[plot.id] ?? ""}
              onChange={(e) => {
                if (byArea) onByAreaChange(false);
                onChange({ ...unitsByPlot, [plot.id]: e.target.value });
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
