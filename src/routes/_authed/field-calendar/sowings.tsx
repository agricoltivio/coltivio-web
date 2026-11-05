import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import {
  plotSowingsQueryOptions,
  plotSowingSummariesQueryOptions,
  sowingsQueryOptions,
  sowingSummariesQueryOptions,
  sowingUnitsQueryOptions,
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
import { ChartCarouselCard } from "@/components/parasites/ChartCarouselCard";
import { Button } from "@/components/ui/button";
import { type ColumnDef } from "@tanstack/react-table";
import { useFeatureAccess } from "@/lib/useFeatureAccess";
import { formatArea, formatBaseAmount } from "@/lib/sowingUnits";
import { formatDateOnly } from "@/lib/utils";

type GlobalSowing = components["schemas"]["GetV1SowingsPositiveResponse"]["data"]["result"][number];
type PlotSowing = components["schemas"]["GetV1PlotsByIdPlotIdSowingsPositiveResponse"]["data"]["result"][number];
type AnySowing = GlobalSowing | PlotSowing;
type MonthlySowing =
  components["schemas"]["GetV1SowingsSummariesPositiveResponse"]["data"]["monthlySowings"][number];

// One chart per seed (or crop when sown without a seed) and what is counted:
// weight, seeds and plants can never share an axis
type SowingSeries = {
  key: string;
  title: string;
  // seeds or plants, null for weight
  countUnit: "seeds" | "plants" | null;
  // year -> 12 monthly values, kg for weight, pieces for count
  monthly: Record<number, number[]>;
};

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
      queryClient.ensureQueryData(plotSowingSummariesQueryOptions(plotId));
    } else {
      queryClient.ensureQueryData(sowingsQueryOptions());
      queryClient.ensureQueryData(sowingSummariesQueryOptions());
    }
  },
  component: Sowings,
});

function Sowings() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { canWrite } = useFeatureAccess("field_calendar");
  const { plotId, returnTo } = Route.useSearch();
  const [selectedCrops, setSelectedCrops] = useState<string[]>([]);

  const unitsQuery = useQuery(sowingUnitsQueryOptions());
  const globalQuery = useQuery({ ...sowingsQueryOptions(), enabled: !plotId });
  const plotQuery = useQuery({
    ...plotSowingsQueryOptions(plotId ?? ""),
    enabled: !!plotId,
  });
  const globalSummariesQuery = useQuery({
    ...sowingSummariesQueryOptions(),
    enabled: !plotId,
  });
  const plotSummariesQuery = useQuery({
    ...plotSowingSummariesQueryOptions(plotId ?? ""),
    enabled: !!plotId,
  });

  const sowings: AnySowing[] =
    (plotId ? plotQuery.data?.result : globalQuery.data?.result) ?? [];
  const summaries: MonthlySowing[] =
    (plotId ? plotSummariesQuery.data : globalSummariesQuery.data)?.monthlySowings ?? [];
  const units = unitsQuery.data ?? [];

  // Crop chips filter the charts and the table
  const allCrops = useMemo(
    () => [...new Set(sowings.map((sowing) => sowing.crop.name))].sort(),
    [sowings],
  );
  const visibleCrops = selectedCrops.length === 0 ? allCrops : selectedCrops;

  function toggleCrop(cropName: string) {
    setSelectedCrops((prev) =>
      prev.includes(cropName)
        ? prev.filter((name) => name !== cropName)
        : [...prev, cropName],
    );
  }

  // Year -> color mapping stays the same on every chart
  const availableYears = useMemo(
    () => [...new Set(summaries.map((summary) => summary.year))].sort((a, b) => b - a),
    [summaries],
  );

  const series = useMemo(() => {
    const seriesByKey = new Map<string, SowingSeries>();
    for (const summary of summaries) {
      for (const sownSeed of summary.sownSeeds) {
        if (!visibleCrops.includes(sownSeed.cropName)) continue;
        const key = `${sownSeed.cropId}-${sownSeed.seedId ?? "none"}-${sownSeed.countUnit ?? "weight"}`;
        let entry = seriesByKey.get(key);
        if (!entry) {
          entry = {
            key,
            // the same seed can be counted as seeds and as plants, both get a chart
            title:
              (sownSeed.seedName ? `${sownSeed.cropName} – ${sownSeed.seedName}` : sownSeed.cropName) +
              (sownSeed.countUnit ? ` (${t(`fieldCalendar.sowings.units.${sownSeed.countUnit}`)})` : ""),
            countUnit: sownSeed.countUnit,
            monthly: {},
          };
          seriesByKey.set(key, entry);
        }
        if (!entry.monthly[summary.year]) {
          entry.monthly[summary.year] = Array.from({ length: 12 }, () => 0);
        }
        // base amounts are grams for weight, the chart works in kg
        entry.monthly[summary.year][summary.month] +=
          sownSeed.countUnit ? sownSeed.totalBaseAmount : sownSeed.totalBaseAmount / 1000;
      }
    }
    return [...seriesByKey.values()].sort((a, b) => a.title.localeCompare(b.title));
  }, [summaries, visibleCrops, t]);

  const tableData = sowings.filter((sowing) => visibleCrops.includes(sowing.crop.name));

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
        // calendar day, so the date doesn't shift in timezones behind UTC
        cell: ({ row }) => formatDateOnly(row.original.date, i18n.language),
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
          const unitInfo = units.find((info) => info.unit === row.original.unit);
          return unitInfo ? formatBaseAmount(row.original.totalBaseAmount, unitInfo, t) : "—";
        },
      },
      {
        accessorKey: "size",
        header: t("fieldCalendar.tillages.size"),
        cell: ({ row }) => formatArea(row.original.size),
      },
    ];
  }, [t, i18n.language, plotId, units]);

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
      <div className="space-y-6">
        {allCrops.length > 1 && (
          <div className="flex gap-1 flex-wrap">
            {allCrops.map((cropName) => (
              <button
                key={cropName}
                type="button"
                aria-pressed={selectedCrops.includes(cropName)}
                onClick={() => toggleCrop(cropName)}
                className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                  selectedCrops.includes(cropName)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border"
                }`}
              >
                {cropName}
              </button>
            ))}
          </div>
        )}

        {series.length > 0 && (
          <ChartCarouselCard
            pages={series.map((entry) => ({
              key: entry.key,
              title: entry.title,
              content: <SowingChartPage series={entry} availableYears={availableYears} />,
            }))}
          />
        )}

        <DataTable
          data={tableData}
          columns={columns}
          onRowClick={(sowing) =>
            navigate({
              to: "/field-calendar/sowings/$sowingId",
              params: { sowingId: sowing.id },
              // keeps the per-plot view when coming back
              search: plotId ? { plotId, ...(returnTo ? { returnTo } : {}) } : {},
            })
          }
          defaultSorting={[{ id: "date", desc: true }]}
          globalFilterFn={(row, _columnId, filterValue) => {
            const searchValue = String(filterValue).toLowerCase();
            const sowing = row.original;
            return [
              "plot" in sowing ? sowing.plot.name : "",
              sowing.crop.name,
              sowing.seed?.name ?? "",
              formatDateOnly(sowing.date, i18n.language),
            ].some((value) => value.toLowerCase().includes(searchValue));
          }}
        />
      </div>
    </PageContent>
  );
}

// One carousel page: its own year selection, then the year comparison chart
function SowingChartPage({
  series,
  availableYears,
}: {
  series: SowingSeries;
  availableYears: number[];
}) {
  const { t, i18n } = useTranslation();
  const monthLabels = getMonthLabels(i18n.language);
  const seriesYears = useMemo(
    () => Object.keys(series.monthly).map(Number).sort((a, b) => b - a),
    [series.monthly],
  );
  const [selectedYears, setSelectedYears] = useState<number[]>(() => seriesYears.slice(0, 2));
  const activeYears = selectedYears.filter((year) => seriesYears.includes(year));

  function toggleYear(year: number) {
    setSelectedYears((prev) =>
      prev.includes(year)
        ? prev.length > 1
          ? prev.filter((selectedYear) => selectedYear !== year)
          : prev
        : [...prev, year],
    );
  }

  const { yearData, unit } = useMemo(() => {
    const allYearColors = assignYearColors(availableYears);
    const maxTotal = Math.max(
      ...activeYears.map((year) => (series.monthly[year] ?? []).reduce((sum, value) => sum + value, 0)),
      0,
    );
    const { divisor, label } =
      series.countUnit
        ? { divisor: 1, label: t(`fieldCalendar.sowings.units.${series.countUnit}`) }
        : pickDisplayUnit(maxTotal, "kg");
    const data: YearData[] = activeYears.map((year) => {
      const scaled = (series.monthly[year] ?? Array.from({ length: 12 }, () => 0)).map(
        (value) => value / divisor,
      );
      return {
        year,
        color: allYearColors[year],
        monthlyData: scaled,
        cumulativeData: computeCumulative(scaled),
      };
    });
    return { yearData: data, unit: label };
  }, [series, activeYears, availableYears, t]);

  return (
    <div className="space-y-3">
      {seriesYears.length > 1 && (
        <div className="flex gap-1 flex-wrap">
          {seriesYears.map((year) => (
            <button
              key={year}
              type="button"
              aria-pressed={activeYears.includes(year)}
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
      )}
      <MonthlyComparisonChart yearData={yearData} monthLabels={monthLabels} unit={unit} />
    </div>
  );
}
