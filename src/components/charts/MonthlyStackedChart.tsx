import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";

export type YearData = {
  year: number;
  color: string;
  /** 12 values in display units, one per month */
  monthlyData: number[];
  /** 12 values in display units, running cumulative sum */
  cumulativeData: number[];
};

type Props = {
  yearData: YearData[];
  monthLabels: string[];
  unit: string;
  height?: number;
};

export function MonthlyComparisonChart({ yearData, monthLabels, unit, height = 220 }: Props) {
  const option: EChartsOption = {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      valueFormatter: (value) =>
        typeof value === "number" ? `${value.toFixed(1)} ${unit}` : String(value),
    },
    legend: {
      type: "scroll",
      bottom: 0,
      textStyle: { fontSize: 11 },
    },
    grid: { left: 55, right: 10, top: 10, bottom: 40 },
    xAxis: {
      type: "category",
      data: monthLabels,
      axisLabel: { fontSize: 10 },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        formatter: (v: number) => `${v} ${unit}`,
        fontSize: 10,
      },
    },
    series: [
      ...yearData.map((s) => ({
        name: String(s.year),
        type: "bar" as const,
        data: s.monthlyData,
        itemStyle: { color: s.color },
        emphasis: { focus: "series" as const },
      })),
      ...yearData.map((s) => ({
        name: `${s.year} ∑`,
        type: "line" as const,
        data: s.cumulativeData,
        lineStyle: { color: s.color, type: "dashed" as const, width: 1.5 },
        itemStyle: { color: s.color },
        showSymbol: false,
        emphasis: { focus: "series" as const },
      })),
    ],
  };

  return (
    <ReactECharts
      option={option}
      style={{ height, width: "100%" }}
      notMerge
    />
  );
}
