import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import {
  fertilizerApplicationsQueryOptions,
  fertilizerApplicationSummariesQueryOptions,
  fertilizerApplicationYearsQueryOptions,
  plotFertilizerApplicationsQueryOptions,
} from "@/api/fertilizerApplications.queries";
import type { components } from "@/api/schema";
import { MonthlyComparisonChart, type YearData } from "@/components/charts/MonthlyStackedChart";
import {
  assignYearColors,
  computeCumulative,
  getMonthLabels,
  pickDisplayUnit,
  toBaseAmount,
  type BaseUnitType,
} from "@/components/charts/chartUtils";
import { DataTable } from "@/components/DataTable";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";

type GlobalFertApp = components["schemas"]["GetV1FertilizerApplicationsPositiveResponse"]["data"]["result"][number];
type PlotFertApp = components["schemas"]["GetV1PlotsByIdPlotIdFertilizerApplicationsPositiveResponse"]["data"]["result"][number];
type FertApp = GlobalFertApp | PlotFertApp;

const searchSchema = z.object({
  plotId: z.string().optional(),
  returnTo: z.string().optional(),
});

export const Route = createFileRoute(
  "/_authed/field-calendar/fertilizer-applications",
)({
  validateSearch: searchSchema,
  loader: ({ context: { queryClient }, location }) => {
    const plotId = new URLSearchParams(location.search).get("plotId");
    if (plotId) {
      queryClient.ensureQueryData(plotFertilizerApplicationsQueryOptions(plotId));
    } else {
      queryClient.ensureQueryData(fertilizerApplicationsQueryOptions());
      queryClient.ensureQueryData(fertilizerApplicationSummariesQueryOptions());
      queryClient.ensureQueryData(fertilizerApplicationYearsQueryOptions());
    }
  },
  component: FertilizerApplications,
});

function FertilizerChart() {
  const { t, i18n } = useTranslation();
  const currentYear = new Date().getFullYear();
  const monthLabels = getMonthLabels(i18n.language);

  const summariesQuery = useQuery(fertilizerApplicationSummariesQueryOptions());
  const yearsQuery = useQuery(fertilizerApplicationYearsQueryOptions());

  const availableYears = useMemo(
    () => (yearsQuery.data ?? []).map(Number).sort((a, b) => b - a),
    [yearsQuery.data],
  );

  const [selectedYears, setSelectedYears] = useState<number[]>([currentYear, currentYear - 1]);
  const activeYears = selectedYears.filter((y) => availableYears.includes(y));

  const monthly = summariesQuery.data?.monthlyApplications ?? [];

  const allNames = useMemo(() => {
    return Array.from(
      new Set(monthly.flatMap((m) => m.appliedFertilizers.map((f) => f.fertilizerName))),
    ).sort();
  }, [monthly]);

  const defaultName = useMemo(() => {
    const sorted = [...monthly].sort((a, b) => b.year - a.year || b.month - a.month);
    return sorted[0]?.appliedFertilizers[0]?.fertilizerName ?? allNames[0] ?? "";
  }, [monthly, allNames]);

  const [selectedName, setSelectedName] = useState<string>("");
  const activeName = selectedName || defaultName;

  const { yearData, unit } = useMemo(() => {
    const filtered = monthly.filter((m) => activeYears.includes(m.year));
    const yearColors = assignYearColors(activeYears);

    // Determine dominant unit type for this fertilizer
    const unitCounts: Record<BaseUnitType, number> = { kg: 0, l: 0 };
    filtered.forEach((m) =>
      m.appliedFertilizers
        .filter((f) => f.fertilizerName === activeName)
        .forEach((f) => { unitCounts[toBaseAmount(f.totalAmount, f.unit).type]++; }),
    );
    const dominantType: BaseUnitType = unitCounts.l > unitCounts.kg ? "l" : "kg";

    const perYearData = activeYears.map((year) => {
      const monthlyData = Array.from({ length: 12 }, (_, i) => {
        const entry = filtered.find((m) => m.year === year && m.month === i + 1);
        const f = entry?.appliedFertilizers.find((f) => f.fertilizerName === activeName);
        if (!f) return 0;
        const { value, type } = toBaseAmount(f.totalAmount, f.unit);
        return type === dominantType ? value : 0;
      });
      return { year, color: yearColors[year], monthlyData };
    });

    const maxCumulative = Math.max(
      ...perYearData.map((s) => s.monthlyData.reduce((a, b) => a + b, 0)),
      0,
    );
    const { divisor, label } = pickDisplayUnit(maxCumulative, dominantType);

    const scaledYearData: YearData[] = perYearData.map((s) => {
      const scaled = s.monthlyData.map((v) => v / divisor);
      return { year: s.year, color: s.color, monthlyData: scaled, cumulativeData: computeCumulative(scaled) };
    });

    return { yearData: scaledYearData, unit: label };
  }, [monthly, activeYears, activeName]);

  function toggleYear(year: number) {
    setSelectedYears((prev) =>
      prev.includes(year)
        ? prev.length > 1 ? prev.filter((y) => y !== year) : prev
        : [...prev, year],
    );
  }

  if (!summariesQuery.data && summariesQuery.isLoading) return null;

  if (allNames.length === 0) {
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
          <Select value={activeName} onValueChange={setSelectedName}>
            <SelectTrigger className="w-48 border-primary text-primary">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allNames.map((name) => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <MonthlyComparisonChart yearData={yearData} monthLabels={monthLabels} unit={unit} />
      </CardContent>
    </Card>
  );
}

function FertilizerApplications() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { plotId, returnTo } = Route.useSearch();

  const globalQuery = useQuery({
    ...fertilizerApplicationsQueryOptions(),
    enabled: !plotId,
  });
  const plotQuery = useQuery({
    ...plotFertilizerApplicationsQueryOptions(plotId ?? ""),
    enabled: !!plotId,
  });

  const data: FertApp[] =
    (plotId ? plotQuery.data?.result : globalQuery.data?.result) ?? [];

  const columns = useMemo<ColumnDef<FertApp>[]>(
    () => [
      {
        accessorKey: "date",
        header: t("fieldCalendar.fertilizerApplications.date"),
        cell: ({ row }) =>
          new Date(row.getValue("date")).toLocaleDateString(),
      },
      ...(!plotId
        ? ([
            {
              id: "plotName",
              header: t("fieldCalendar.plots.plot"),
              cell: ({ row }) =>
                "plot" in row.original ? row.original.plot.name : "—",
            },
          ] as ColumnDef<FertApp>[])
        : []),
      {
        id: "fertilizerName",
        header: t("fieldCalendar.fertilizerApplications.fertilizer"),
        cell: ({ row }) => row.original.fertilizer.name,
      },
      {
        id: "amount",
        header: t("fieldCalendar.harvests.amount"),
        cell: ({ row }) =>
          `${(row.original.numberOfUnits * row.original.amountPerUnit).toFixed(1)} ${row.original.fertilizer.unit}`,
      },
      {
        accessorKey: "size",
        header: t("fieldCalendar.tillages.size"),
        cell: ({ row }) => `${(row.original.size / 100).toFixed(2)} a`,
      },
    ],
    [t, plotId],
  );

  return (
    <PageContent
      title={t("fieldCalendar.fertilizerApplications.title")}
      showBackButton={!!plotId}
      backTo={plotId ? () => returnTo ? navigate({ to: returnTo as "/" }) : navigate({ to: "/field-calendar/plots/$plotId", params: { plotId } }) : undefined}
    >
      {!plotId && <FertilizerChart />}
      <div className="flex justify-end mb-4">
        <Button
          onClick={() =>
            navigate({
              to: "/field-calendar/fertilizer-applications/create",
              search: plotId ? { plotId } : {},
            })
          }
        >
          <Plus className="h-4 w-4 mr-2" />
          {t("fieldCalendar.fertilizerApplications.create")}
        </Button>
      </div>
      <DataTable
        data={data}
        columns={columns}
        defaultSorting={[{ id: "date", desc: true }]}
      />
    </PageContent>
  );
}
