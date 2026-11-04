import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import {
  plotSowingsQueryOptions,
  sowingsQueryOptions,
  sowingSummariesQueryOptions,
  sowingUnitsQueryOptions,
  sowingYearsQueryOptions,
} from "@/api/sowings.queries";
import type { components } from "@/api/schema";
import { MonthlyComparisonChart, type YearData } from "@/components/charts/MonthlyStackedChart";
import {
  assignYearColors,
  computeCumulative,
  getMonthLabels,
  pickDisplayUnit,
} from "@/components/charts/chartUtils";
import { DataTable } from "@/components/DataTable";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type ColumnDef } from "@tanstack/react-table";
import { useFeatureAccess } from "@/lib/useFeatureAccess";
import { formatBaseAmount } from "@/lib/sowingUnits";

type GlobalSowing = components["schemas"]["GetV1SowingsPositiveResponse"]["data"]["result"][number];
type PlotSowing = components["schemas"]["GetV1PlotsByIdPlotIdSowingsPositiveResponse"]["data"]["result"][number];
type AnySowing = GlobalSowing | PlotSowing;

const searchSchema = z.object({
  plotId: z.string().optional(),
  returnTo: z.string().optional(),
});

export const Route = createFileRoute("/_authed/field-calendar/sowings")({
  validateSearch: searchSchema,
  loader: ({ context: { queryClient }, location }) => {
    queryClient.ensureQueryData(sowingUnitsQueryOptions());
    const plotId = new URLSearchParams(location.search).get("plotId");
    if (plotId) {
      queryClient.ensureQueryData(plotSowingsQueryOptions(plotId));
    } else {
      queryClient.ensureQueryData(sowingsQueryOptions());
      queryClient.ensureQueryData(sowingSummariesQueryOptions());
      queryClient.ensureQueryData(sowingYearsQueryOptions());
    }
  },
  component: Sowings,
});

function SowingChart() {
  const { t, i18n } = useTranslation();
  const currentYear = new Date().getFullYear();
  const monthLabels = getMonthLabels(i18n.language);

  const summariesQuery = useQuery(sowingSummariesQueryOptions());
  const yearsQuery = useQuery(sowingYearsQueryOptions());

  const availableYears = useMemo(
    () => (yearsQuery.data ?? []).map(Number).sort((a, b) => b - a),
    [yearsQuery.data],
  );

  const [selectedYears, setSelectedYears] = useState<number[]>([currentYear, currentYear - 1]);
  const activeYears = selectedYears.filter((y) => availableYears.includes(y));

  const monthly = summariesQuery.data?.monthlySowings ?? [];

  // One chart series per seed (or crop when sown without a seed) and quantity kind,
  // weight and count can never be shown on the same axis
  const seriesOptions = useMemo(() => {
    const options = new Map<string, { label: string; quantityKind: "weight" | "count" }>();
    for (const month of monthly) {
      for (const sownSeed of month.sownSeeds) {
        const key = `${sownSeed.cropId}-${sownSeed.seedId ?? "none"}-${sownSeed.quantityKind}`;
        if (!options.has(key)) {
          const name = sownSeed.seedName
            ? `${sownSeed.cropName} – ${sownSeed.seedName}`
            : sownSeed.cropName;
          options.set(key, { label: name, quantityKind: sownSeed.quantityKind });
        }
      }
    }
    return Array.from(options.entries())
      .map(([key, value]) => ({ key, ...value }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [monthly]);

  const defaultKey = useMemo(() => {
    const sorted = [...monthly].sort((a, b) => b.year - a.year || b.month - a.month);
    const latest = sorted[0]?.sownSeeds[0];
    return latest
      ? `${latest.cropId}-${latest.seedId ?? "none"}-${latest.quantityKind}`
      : (seriesOptions[0]?.key ?? "");
  }, [monthly, seriesOptions]);

  const [selectedKey, setSelectedKey] = useState<string>("");
  const activeKey = selectedKey || defaultKey;
  const activeSeries = seriesOptions.find((option) => option.key === activeKey);

  const { yearData, unit } = useMemo(() => {
    const filtered = monthly.filter((m) => activeYears.includes(m.year));
    const yearColors = assignYearColors(activeYears);

    const perYearData = activeYears.map((year) => {
      const monthlyData = Array.from({ length: 12 }, (_, monthIndex) => {
        const entry = filtered.find((m) => m.year === year && m.month === monthIndex);
        const sownSeed = entry?.sownSeeds.find(
          (s) => `${s.cropId}-${s.seedId ?? "none"}-${s.quantityKind}` === activeKey,
        );
        if (!sownSeed) return 0;
        // weight base amounts are grams, chart works in kg
        return sownSeed.quantityKind === "weight"
          ? sownSeed.totalBaseAmount / 1000
          : sownSeed.totalBaseAmount;
      });
      return { year, color: yearColors[year], monthlyData };
    });

    const maxCumulative = Math.max(
      ...perYearData.map((s) => s.monthlyData.reduce((a, b) => a + b, 0)),
      0,
    );
    const { divisor, label } =
      activeSeries?.quantityKind === "count"
        ? { divisor: 1, label: t("fieldCalendar.sowings.pieces") }
        : pickDisplayUnit(maxCumulative, "kg");

    const scaledYearData: YearData[] = perYearData.map((s) => {
      const scaled = s.monthlyData.map((v) => v / divisor);
      return { year: s.year, color: s.color, monthlyData: scaled, cumulativeData: computeCumulative(scaled) };
    });

    return { yearData: scaledYearData, unit: label };
  }, [monthly, activeYears, activeKey, activeSeries, t]);

  function toggleYear(year: number) {
    setSelectedYears((prev) =>
      prev.includes(year)
        ? prev.length > 1 ? prev.filter((y) => y !== year) : prev
        : [...prev, year],
    );
  }

  if (!summariesQuery.data && summariesQuery.isLoading) return null;

  if (seriesOptions.length === 0) {
    return (
      <Card className="mb-6">
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground text-center py-8">
            {t("fieldCalendar.chart.noData")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardContent className="pt-4">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex gap-1 flex-wrap">
            {availableYears.map((year) => (
              <button
                key={year}
                onClick={() => toggleYear(year)}
                className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                  activeYears.includes(year)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border"
                }`}
              >
                {year}
              </button>
            ))}
          </div>
          <Select value={activeKey} onValueChange={setSelectedKey}>
            <SelectTrigger className="w-56 border-primary text-primary">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {seriesOptions.map((option) => (
                <SelectItem key={option.key} value={option.key}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <MonthlyComparisonChart yearData={yearData} monthLabels={monthLabels} unit={unit} />
      </CardContent>
    </Card>
  );
}

function Sowings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { canWrite } = useFeatureAccess("field_calendar");
  const { plotId, returnTo } = Route.useSearch();

  const unitsQuery = useQuery(sowingUnitsQueryOptions());
  const globalQuery = useQuery({
    ...sowingsQueryOptions(),
    enabled: !plotId,
  });
  const plotQuery = useQuery({
    ...plotSowingsQueryOptions(plotId ?? ""),
    enabled: !!plotId,
  });

  const data: AnySowing[] =
    (plotId ? plotQuery.data?.result : globalQuery.data?.result) ?? [];
  const units = unitsQuery.data ?? [];

  const columns = useMemo<ColumnDef<AnySowing>[]>(() => {
    const plotColumn: ColumnDef<AnySowing>[] = plotId
      ? []
      : [
          {
            id: "plotName",
            accessorFn: (row) => ("plot" in row ? row.plot.name : ""),
            header: t("fieldCalendar.plots.plot"),
            cell: ({ row }) => ("plot" in row.original ? row.original.plot.name : "—"),
          },
        ];
    return [
      {
        accessorKey: "date",
        header: t("fieldCalendar.sowings.date"),
        cell: ({ row }) => new Date(row.original.date).toLocaleDateString(),
      },
      ...plotColumn,
      {
        id: "crop",
        accessorFn: (row) => row.crop.name,
        header: t("fieldCalendar.sowings.crop"),
        cell: ({ row }) => row.original.crop.name,
      },
      {
        id: "seed",
        accessorFn: (row) => row.seed?.name ?? "",
        header: t("fieldCalendar.sowings.seed"),
        cell: ({ row }) => row.original.seed?.name ?? "—",
      },
      {
        id: "amount",
        accessorFn: (row) => row.amount,
        header: t("fieldCalendar.sowings.amount"),
        cell: ({ row }) =>
          `${row.original.amount} ${t(`fieldCalendar.sowings.units.${row.original.unit}`)}`,
      },
      {
        id: "total",
        accessorFn: (row) => row.totalBaseAmount,
        header: t("fieldCalendar.sowings.total"),
        cell: ({ row }) => {
          const quantityKind = units.find((unitInfo) => unitInfo.unit === row.original.unit)?.quantityKind;
          return quantityKind ? formatBaseAmount(row.original.totalBaseAmount, quantityKind, t) : "—";
        },
      },
      {
        accessorKey: "size",
        header: t("fieldCalendar.tillages.size"),
        cell: ({ row }) => `${(row.original.size / 100).toFixed(2)} a`,
      },
    ];
  }, [t, plotId, units]);

  return (
    <PageContent
      title={t("fieldCalendar.sowings.title")}
      showBackButton={!!plotId}
      backTo={
        plotId
          ? () =>
              returnTo
                ? navigate({ href: returnTo })
                : navigate({ to: "/field-calendar/plots/$plotId", params: { plotId } })
          : undefined
      }
      actions={
        canWrite && (
          <Button
            onClick={() =>
              navigate({
                to: "/field-calendar/sowings/create",
                search: plotId ? { plotId, ...(returnTo ? { returnTo } : {}) } : {},
              })
            }
          >
            {t("fieldCalendar.sowings.create")}
          </Button>
        )
      }
    >
      {!plotId && <SowingChart />}
      <DataTable
        data={data}
        columns={columns}
        onRowClick={(sowing) =>
          navigate({
            to: "/field-calendar/sowings/$sowingId",
            params: { sowingId: sowing.id },
          })
        }
        defaultSorting={[{ id: "date", desc: true }]}
      />
    </PageContent>
  );
}
