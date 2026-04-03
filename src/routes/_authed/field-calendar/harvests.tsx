import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useFeatureAccess } from "@/lib/useFeatureAccess";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import {
  harvestsQueryOptions,
  harvestSummariesQueryOptions,
  harvestYearsQueryOptions,
  plotHarvestsQueryOptions,
} from "@/api/harvests.queries";
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
import { Plus } from "lucide-react";

type GlobalHarvest = components["schemas"]["GetV1HarvestsPositiveResponse"]["data"]["result"][number];
type PlotHarvest = components["schemas"]["GetV1PlotsByIdPlotIdHarvestsPositiveResponse"]["data"]["result"][number];
type HarvestRow = GlobalHarvest | PlotHarvest;

const searchSchema = z.object({
  plotId: z.string().optional(),
  returnTo: z.string().optional(),
});

export const Route = createFileRoute("/_authed/field-calendar/harvests")({
  validateSearch: searchSchema,
  loader: ({ context: { queryClient }, location }) => {
    const plotId = new URLSearchParams(location.search).get("plotId");
    if (plotId) {
      queryClient.ensureQueryData(plotHarvestsQueryOptions(plotId));
    } else {
      queryClient.ensureQueryData(harvestsQueryOptions());
      queryClient.ensureQueryData(harvestSummariesQueryOptions());
      queryClient.ensureQueryData(harvestYearsQueryOptions());
    }
  },
  component: Harvests,
});

function HarvestChart() {
  const { t, i18n } = useTranslation();
  const currentYear = new Date().getFullYear();
  const monthLabels = getMonthLabels(i18n.language);

  const summariesQuery = useQuery(harvestSummariesQueryOptions());
  const yearsQuery = useQuery(harvestYearsQueryOptions());

  const availableYears = useMemo(
    () => (yearsQuery.data ?? []).map(Number).sort((a, b) => b - a),
    [yearsQuery.data],
  );

  const [selectedYears, setSelectedYears] = useState<number[]>([currentYear, currentYear - 1]);
  const activeYears = selectedYears.filter((y) => availableYears.includes(y));

  const monthly = summariesQuery.data?.monthlyHarvests ?? [];

  // Build select items: split by conservation method only when a forage has more than one
  const allItems = useMemo(() => {
    // Normalize: treat "none" string as null
    const normalize = (method: string | null | undefined): string | null =>
      !method || method === "none" ? null : method;

    // Collect unique (forageName, conservationMethod) pairs
    const seen = new Map<string, { forageName: string; conservationMethod: string | null }>();
    monthly.forEach((m) =>
      m.producedQuantities.forEach((q) => {
        const conservationMethod = normalize(q.conservationMethod);
        const key = `${q.forageName}||${conservationMethod ?? ""}`;
        if (!seen.has(key)) seen.set(key, { forageName: q.forageName, conservationMethod });
      }),
    );
    const pairs = Array.from(seen.values()).sort((a, b) => a.forageName.localeCompare(b.forageName));

    // Count how many distinct conservation methods exist per forage name
    const methodCountByName = new Map<string, number>();
    pairs.forEach(({ forageName }) =>
      methodCountByName.set(forageName, (methodCountByName.get(forageName) ?? 0) + 1),
    );

    return pairs.map(({ forageName, conservationMethod }) => ({
      key: `${forageName}||${conservationMethod ?? ""}`,
      forageName,
      conservationMethod,
      // Only append localized conservation method when there are multiple for this forage
      label: methodCountByName.get(forageName)! > 1 && conservationMethod
        ? `${forageName} - ${t(`fieldCalendar.harvests.conservationMethods.${conservationMethod}`, { defaultValue: conservationMethod })}`
        : forageName,
    }));
  }, [monthly, t]);

  const defaultKey = useMemo(() => {
    const sorted = [...monthly].sort((a, b) => b.year - a.year || b.month - a.month);
    const first = sorted[0]?.producedQuantities[0];
    if (!first) return allItems[0]?.key ?? "";
    const normalized = !first.conservationMethod || first.conservationMethod === "none" ? null : first.conservationMethod;
    return `${first.forageName}||${normalized ?? ""}`;
  }, [monthly, allItems]);

  const [selectedKey, setSelectedKey] = useState<string>("");
  const activeKey = selectedKey || defaultKey;
  const activeItem = allItems.find((i) => i.key === activeKey) ?? allItems[0];

  // Build chart data for the selected forage + conservation method across active years
  const { yearData, unit } = useMemo(() => {
    const filtered = monthly.filter((m) => activeYears.includes(m.year));
    const yearColors = assignYearColors(activeYears);

    const perYearData = activeYears.map((year) => {
      const monthlyData = Array.from({ length: 12 }, (_, i) => {
        const entry = filtered.find((m) => m.year === year && m.month === i + 1);
        const normalize = (m: string | null | undefined) => (!m || m === "none" ? null : m);
        return entry?.producedQuantities
          .filter((q) =>
            q.forageName === activeItem?.forageName &&
            normalize(q.conservationMethod) === activeItem?.conservationMethod,
          )
          .reduce((sum, q) => sum + q.totalAmountInKilos, 0) ?? 0;
      });
      return { year, color: yearColors[year], monthlyData };
    });

    // Scale by max cumulative so bars and line share a sensible axis
    const maxCumulative = Math.max(
      ...perYearData.map((s) => s.monthlyData.reduce((a, b) => a + b, 0)),
      0,
    );
    const { divisor, label } = pickDisplayUnit(maxCumulative, "kg");

    const scaledYearData: YearData[] = perYearData.map((s) => {
      const scaled = s.monthlyData.map((v) => v / divisor);
      return { year: s.year, color: s.color, monthlyData: scaled, cumulativeData: computeCumulative(scaled) };
    });

    return { yearData: scaledYearData, unit: label };
  }, [monthly, activeYears, activeItem]);

  function toggleYear(year: number) {
    setSelectedYears((prev) =>
      prev.includes(year)
        ? prev.length > 1 ? prev.filter((y) => y !== year) : prev
        : [...prev, year],
    );
  }

  if (!summariesQuery.data && summariesQuery.isLoading) return null;

  if (allItems.length === 0) {
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
            <SelectTrigger className="w-48 border-primary text-primary">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allItems.map((item) => (
                <SelectItem key={item.key} value={item.key}>{item.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <MonthlyComparisonChart yearData={yearData} monthLabels={monthLabels} unit={unit} />
      </CardContent>
    </Card>
  );
}

function Harvests() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { canWrite: canWriteHarvests } = useFeatureAccess("harvests");
  const { plotId, returnTo } = Route.useSearch();

  const globalQuery = useQuery({
    ...harvestsQueryOptions(),
    enabled: !plotId,
  });
  const plotQuery = useQuery({
    ...plotHarvestsQueryOptions(plotId ?? ""),
    enabled: !!plotId,
  });

  const data: HarvestRow[] =
    (plotId ? plotQuery.data?.result : globalQuery.data?.result) ?? [];

  const columns = useMemo<ColumnDef<HarvestRow>[]>(
    () => [
      {
        accessorKey: "date",
        header: t("fieldCalendar.harvests.date"),
        cell: ({ row }) => new Date(row.getValue("date")).toLocaleDateString(),
      },
      ...(!plotId
        ? ([
            {
              id: "plotName",
              header: t("fieldCalendar.plots.plot"),
              cell: ({ row }) =>
                "plot" in row.original ? row.original.plot.name : "—",
            },
          ] as ColumnDef<HarvestRow>[])
        : []),
      {
        id: "cropName",
        header: t("fieldCalendar.harvests.crop"),
        cell: ({ row }) => row.original.crop.name,
      },
      {
        id: "amount",
        header: t("fieldCalendar.harvests.amount"),
        cell: ({ row }) =>
          `${(row.original.numberOfUnits * row.original.kilosPerUnit).toFixed(1)} kg`,
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
      title={t("fieldCalendar.harvests.title")}
      showBackButton={!!plotId}
      backTo={plotId ? () => returnTo ? navigate({ to: returnTo as "/" }) : navigate({ to: "/field-calendar/plots/$plotId", params: { plotId } }) : undefined}
    >
      <div className="flex justify-end mb-6">
        {canWriteHarvests && (
          <Button onClick={() => navigate({ to: "/field-calendar/harvests/create", search: plotId ? { plotId } : {} })}>
            <Plus className="h-4 w-4 mr-2" />
            {t("fieldCalendar.harvests.create")}
          </Button>
        )}
      </div>
      {!plotId && <HarvestChart />}
      <DataTable
        data={data}
        columns={columns}
        onRowClick={(harvest) =>
          navigate({
            to: "/field-calendar/harvests/$harvestId",
            params: { harvestId: harvest.id },
          })
        }
        defaultSorting={[{ id: "date", desc: true }]}
      />
    </PageContent>
  );
}
