import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import { useTranslation } from "react-i18next";
import {
  PARASITE_RESULT_GRADES,
  type ParasiteResult,
  type ParasiteType,
} from "@/api/types";
import { cn, parseDateOnly } from "@/lib/utils";

// FAMACHA card colors: 1 = red mucosa (healthy) … 5 = white (severely anaemic)
export const FAMACHA_COLORS: Record<number, string> = {
  1: "#B71C1C",
  2: "#E53935",
  3: "#F06292",
  4: "#F8BBD0",
  5: "#FDF2F5",
};

export const FAMACHA_TEXT_COLORS: Record<number, string> = {
  1: "#FFFFFF",
  2: "#FFFFFF",
  3: "#FFFFFF",
  4: "#5D4037",
  5: "#5D4037",
};

const LINE_COLOR = "#0f766e";
const TREATMENT_COLOR = "#f59e0b";
// Initially visible values; older ones are reachable with the zoom slider
const VISIBLE_POINTS = 10;

// Labs count oocysts for coccidia and larvae for lungworms, eggs for all others
export function parasiteCountUnitKey(parasiteType: ParasiteType) {
  if (parasiteType === "coccidia") return "parasiteChecks.countUnits.opg";
  if (parasiteType === "lungworm") return "parasiteChecks.countUnits.lpg";
  return "parasiteChecks.countUnits.epg";
}

// Animals are shown by name, the ear tag only when they have no name
export function animalDisplayName(
  name: string,
  earTagNumber: string | null | undefined,
): string {
  return name.trim() || earTagNumber || "–";
}

export function FamachaBadge({ score }: { score: number }) {
  return (
    <span
      className="inline-flex size-6 items-center justify-center rounded-full border text-xs font-bold"
      style={{
        backgroundColor: FAMACHA_COLORS[score],
        color: FAMACHA_TEXT_COLORS[score],
      }}
    >
      {score}
    </span>
  );
}

// Buttons for FAMACHA 1–5 in the colors of the FAMACHA card
export function FamachaScoreButtons({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (score: number | null) => void;
}) {
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((score) => {
        const selected = value === score;
        return (
          <button
            key={score}
            type="button"
            // Clicking the selected score again clears it
            onClick={() => onChange(selected ? null : score)}
            className={cn(
              "size-8 rounded-full border text-sm font-bold transition-opacity",
              selected && "ring-2 ring-primary ring-offset-1",
              value !== null && !selected && "opacity-35",
            )}
            style={{
              backgroundColor: FAMACHA_COLORS[score],
              color: FAMACHA_TEXT_COLORS[score],
            }}
          >
            {score}
          </button>
        );
      })}
    </div>
  );
}

// coverage: number of animals the value is based on, shown above the point
export type TimelinePoint = { date: string; value: number; coverage?: number };

function toTimestamp(date: string) {
  return parseDateOnly(date).getTime();
}

// Value over time with dashed treatment markers. Shows the latest values,
// older ones are reachable via the zoom slider.
export function TimelineChart({
  points,
  treatmentDates = [],
  seriesName,
  unitLabel,
  famachaScale = false,
  percentScale = false,
  gradeScale = false,
  averageValues = false,
  height = 240,
}: {
  points: TimelinePoint[];
  treatmentDates?: string[];
  seriesName: string;
  unitLabel?: string;
  // FAMACHA: fixed 1–5 axis with 1 (healthy) on top
  famachaScale?: boolean;
  // Change in %: values can be negative, labels with %
  percentScale?: boolean;
  // Grades: fixed 0–3 axis (index in PARASITE_RESULT_GRADES) labelled – / + / ++ / +++
  gradeScale?: boolean;
  // Values are averages per check: grade tooltips get "Ø" (count tooltips
  // already show it through the series name)
  averageValues?: boolean;
  height?: number;
}) {
  const { t, i18n } = useTranslation();
  // Short ("++") on the axis, with the word ("++ mittel") in the tooltip.
  // Averages show the nearest step and the exact value: "Ø ++ mittel (1.6)"
  const gradeLabel = (value: number, short = true) => {
    const grade = PARASITE_RESULT_GRADES[Math.round(value)];
    if (!grade) return "";
    if (short) return t(`parasiteChecks.gradesShort.${grade}`);
    const label = t(`parasiteChecks.grades.${grade}`);
    if (!averageValues) return label;
    return Number.isInteger(value)
      ? `Ø ${label}`
      : `Ø ${label} (${Math.round(value * 10) / 10})`;
  };
  const sortedPoints = [...points].sort(
    (a, b) => toTimestamp(a.date) - toTimestamp(b.date),
  );
  const timestamps = sortedPoints.map((point) => toTimestamp(point.date));
  const minTime = Math.min(...timestamps);
  const maxTime = Math.max(...timestamps);
  const isZoomed = sortedPoints.length > VISIBLE_POINTS;

  // Only treatments within the data range, an old unrelated one would stretch the axis
  const visibleTreatmentTimes = treatmentDates
    .map(toTimestamp)
    .filter((time) => time >= minTime && time <= maxTime);

  const option: EChartsOption = {
    tooltip: {
      trigger: "axis",
      valueFormatter: (value) =>
        typeof value === "number" && gradeScale
          ? gradeLabel(value, false)
          : typeof value === "number"
            ? `${Math.round(value * 10) / 10}${unitLabel ? ` ${unitLabel}` : ""}`
            : String(value),
    },
    grid: { left: 45, right: 16, top: 24, bottom: isZoomed ? 56 : 30 },
    xAxis: {
      type: "time",
      // Fewer ticks in half-width cards; labels that would still collide are hidden
      splitNumber: 4,
      axisLabel: {
        hideOverlap: true,
        fontSize: 10,
        formatter: (value: number) =>
          new Date(value).toLocaleDateString(i18n.language, {
            month: "short",
            year: "2-digit",
          }),
      },
      // Tooltip header: checks have a date only, the time would always be 00:00
      axisPointer: {
        label: {
          formatter: ({ value }) =>
            new Date(value).toLocaleDateString(i18n.language),
        },
      },
    },
    yAxis: famachaScale
      ? { type: "value", min: 1, max: 5, interval: 1, inverse: true }
      : gradeScale
        ? {
            type: "value",
            min: 0,
            max: PARASITE_RESULT_GRADES.length - 1,
            interval: 1,
            axisLabel: {
              fontSize: 12,
              formatter: (value: number) => gradeLabel(value),
            },
          }
        : percentScale
          ? {
              type: "value",
              axisLabel: { fontSize: 10, formatter: "{value}%" },
            }
          : { type: "value", min: 0, axisLabel: { fontSize: 10 } },
    dataZoom: isZoomed
      ? [
          {
            type: "slider",
            height: 18,
            bottom: 8,
            startValue: timestamps[timestamps.length - VISIBLE_POINTS],
            endValue: maxTime,
          },
          // Dragging inside the chart pans; the mouse wheel stays with the page
          { type: "inside", zoomOnMouseWheel: false, moveOnMouseWheel: false },
        ]
      : [],
    series: [
      {
        // The grade alone says enough in the tooltip; the legend keeps the name
        name: gradeScale ? "" : seriesName,
        type: "line",
        data: sortedPoints.map((point) => ({
          value: [toTimestamp(point.date), point.value],
          label: {
            show: point.coverage !== undefined,
            position: "top" as const,
            fontSize: 10,
            color: "#6b7280",
            formatter: String(point.coverage ?? ""),
          },
        })),
        lineStyle: { color: LINE_COLOR, width: 2 },
        itemStyle: { color: LINE_COLOR },
        symbolSize: 7,
        markLine: {
          symbol: "none",
          silent: true,
          label: { show: false },
          lineStyle: { color: TREATMENT_COLOR, type: "dashed", width: 1.5 },
          data: visibleTreatmentTimes.map((time) => ({ xAxis: time })),
        },
      },
    ],
  };

  return (
    <div>
      <ReactECharts
        option={option}
        style={{ height, width: "100%" }}
        notMerge
      />
      <ChartLegend
        items={[
          { color: LINE_COLOR, label: seriesName },
          ...(visibleTreatmentTimes.length > 0
            ? [{ color: TREATMENT_COLOR, label: t("parasiteChecks.treatment") }]
            : []),
        ]}
      />
    </div>
  );
}

export type FamachaChartCheck = {
  id: string;
  date: string;
  animals: { famachaScore: number | null }[];
};

// One horizontal bar per FAMACHA check (newest on top), split into the scores
// with the number of animals in each segment
export function FamachaDistributionChart({
  checks,
  height = 240,
}: {
  checks: FamachaChartCheck[];
  height?: number;
}) {
  const { i18n } = useTranslation();
  const sortedChecks = [...checks]
    .filter((check) =>
      check.animals.some((checkAnimal) => checkAnimal.famachaScore !== null),
    )
    .sort((a, b) => toTimestamp(b.date) - toTimestamp(a.date));
  const isZoomed = sortedChecks.length > VISIBLE_POINTS;

  const option: EChartsOption = {
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: { left: 95, right: isZoomed ? 40 : 16, top: 8, bottom: 24 },
    xAxis: { type: "value", minInterval: 1, axisLabel: { fontSize: 10 } },
    yAxis: {
      type: "category",
      // Newest check first, shown on top
      inverse: true,
      // Date with the number of scored animals
      data: sortedChecks.map((check) => {
        const scoredCount = check.animals.filter(
          (checkAnimal) => checkAnimal.famachaScore !== null,
        ).length;
        return `${parseDateOnly(check.date).toLocaleDateString(i18n.language)} (${scoredCount})`;
      }),
      axisLabel: { fontSize: 10 },
    },
    dataZoom: isZoomed
      ? [
          {
            type: "slider",
            yAxisIndex: 0,
            width: 14,
            right: 8,
            startValue: 0,
            endValue: VISIBLE_POINTS - 1,
          },
          // Dragging inside the chart pans; the mouse wheel stays with the page
          {
            type: "inside",
            yAxisIndex: 0,
            zoomOnMouseWheel: false,
            moveOnMouseWheel: false,
          },
        ]
      : [],
    series: [1, 2, 3, 4, 5].map((score) => ({
      name: `FAMACHA ${score}`,
      type: "bar" as const,
      stack: "scores",
      barMaxWidth: 22,
      data: sortedChecks.map((check) => {
        const count = check.animals.filter(
          (checkAnimal) => checkAnimal.famachaScore === score,
        ).length;
        // Empty segments stay hidden
        return count > 0 ? count : null;
      }),
      itemStyle: {
        color: FAMACHA_COLORS[score],
        borderColor: "#d1d5db",
        borderWidth: 1,
      },
      label: {
        show: true,
        color: FAMACHA_TEXT_COLORS[score],
        fontSize: 11,
        fontWeight: "bold" as const,
      },
    })),
  };

  return (
    <div>
      <ReactECharts
        option={option}
        style={{ height, width: "100%" }}
        notMerge
      />
      <ChartLegend
        items={[1, 2, 3, 4, 5].map((score) => ({
          color: FAMACHA_COLORS[score],
          label: String(score),
        }))}
      />
    </div>
  );
}

function ChartLegend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="mt-1 flex flex-wrap gap-3">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span
            className="size-2.5 rounded-full border"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-xs text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// The API returns the reduction (1 - after / before); shown as the change instead,
// so an increase from 5 to 20 reads "+300%" and a drop from 1000 to 50 "-95%"
export function formatCountChange(reductionPercent: number | null): string {
  if (reductionPercent === null) return "–";
  const changePercent = Math.round(-reductionPercent);
  return `${changePercent > 0 ? "+" : ""}${changePercent}%`;
}

// "150 EpG" for a count, "++" for a grade
export function formatResultValue(
  result: ParasiteResult,
  t: (key: string) => string,
): string {
  if (result.grade !== null)
    return t(`parasiteChecks.gradesShort.${result.grade}`);
  return `${Math.round(result.countPerGram ?? 0)} ${t(parasiteCountUnitKey(result.parasiteType))}`;
}
