import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import {
  cropProtectionApplicationsQueryOptions,
  cropProtectionApplicationSummariesQueryOptions,
  cropProtectionApplicationYearsQueryOptions,
  plotCropProtectionApplicationsQueryOptions,
} from "@/api/cropProtectionApplications.queries";
import type { CropProtectionApplication } from "@/api/types";
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
import { useFeatureAccess } from "@/lib/useFeatureAccess";

const searchSchema = z.object({
  plotId: z.string().optional(),
  returnTo: z.string().optional(),
});

export const Route = createFileRoute(
  "/_authed/field-calendar/crop-protection-applications",
)({
  validateSearch: searchSchema,
  loader: ({ context: { queryClient }, location }) => {
    const plotId = new URLSearchParams(location.search).get("plotId");
    if (plotId) {
      queryClient.ensureQueryData(
        plotCropProtectionApplicationsQueryOptions(plotId),
      );
    } else {
      queryClient.ensureQueryData(cropProtectionApplicationsQueryOptions());
      queryClient.ensureQueryData(cropProtectionApplicationSummariesQueryOptions());
      queryClient.ensureQueryData(cropProtectionApplicationYearsQueryOptions());
    }
  },
  component: CropProtectionApplications,
});

function CropProtectionChart() {
  const { t, i18n } = useTranslation();
  const currentYear = new Date().getFullYear();
  const monthLabels = getMonthLabels(i18n.language);

  const summariesQuery = useQuery(cropProtectionApplicationSummariesQueryOptions());
  const yearsQuery = useQuery(cropProtectionApplicationYearsQueryOptions());

  const availableYears = useMemo(
    () => (yearsQuery.data ?? []).map(Number).sort((a, b) => b - a),
    [yearsQuery.data],
  );

  const [selectedYears, setSelectedYears] = useState<number[]>([currentYear, currentYear - 1]);
  const activeYears = selectedYears.filter((y) => availableYears.includes(y));

  const monthly = summariesQuery.data?.monthlyApplications ?? [];

  const allNames = useMemo(() => {
    return Array.from(
      new Set(monthly.flatMap((m) => m.appliedCropProtections.map((p) => p.productName))),
    ).sort();
  }, [monthly]);

  const defaultName = useMemo(() => {
    const sorted = [...monthly].sort((a, b) => b.year - a.year || b.month - a.month);
    return sorted[0]?.appliedCropProtections[0]?.productName ?? allNames[0] ?? "";
  }, [monthly, allNames]);

  const [selectedName, setSelectedName] = useState<string>("");
  const activeName = selectedName || defaultName;

  const { yearData, unit } = useMemo(() => {
    const filtered = monthly.filter((m) => activeYears.includes(m.year));
    const yearColors = assignYearColors(activeYears);

    // Determine dominant unit type for this product
    const unitCounts: Record<BaseUnitType, number> = { kg: 0, l: 0 };
    filtered.forEach((m) =>
      m.appliedCropProtections
        .filter((p) => p.productName === activeName)
        .forEach((p) => { unitCounts[toBaseAmount(p.totalAmount, p.unit).type]++; }),
    );
    const dominantType: BaseUnitType = unitCounts.l > unitCounts.kg ? "l" : "kg";

    const perYearData = activeYears.map((year) => {
      const monthlyData = Array.from({ length: 12 }, (_, i) => {
        const entry = filtered.find((m) => m.year === year && m.month === i + 1);
        const p = entry?.appliedCropProtections.find((p) => p.productName === activeName);
        if (!p) return 0;
        const { value, type } = toBaseAmount(p.totalAmount, p.unit);
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

function CropProtectionApplications() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { canWrite: canWriteCropProtection } = useFeatureAccess("crop_protection");
  const { plotId, returnTo } = Route.useSearch();

  const globalQuery = useQuery({
    ...cropProtectionApplicationsQueryOptions(),
    enabled: !plotId,
  });
  const plotQuery = useQuery({
    ...plotCropProtectionApplicationsQueryOptions(plotId ?? ""),
    enabled: !!plotId,
  });

  const data =
    (plotId ? plotQuery.data?.result : globalQuery.data?.result) ?? [];

  const columns = useMemo<ColumnDef<CropProtectionApplication>[]>(
    () => [
      {
        accessorKey: "dateTime",
        header: t("fieldCalendar.cropProtectionApplications.date"),
        cell: ({ row }) =>
          new Date(row.getValue("dateTime")).toLocaleDateString(),
      },
      {
        accessorKey: "plot.name",
        header: t("fieldCalendar.plots.plot"),
        cell: ({ row }) => row.original.plot.name,
      },
      {
        accessorKey: "product.name",
        header: t("fieldCalendar.cropProtectionApplications.product"),
        cell: ({ row }) => row.original.product.name,
      },
      {
        accessorKey: "method",
        header: t("fieldCalendar.cropProtectionApplications.method"),
        cell: ({ row }) =>
          row.original.method
            ? t(`fieldCalendar.cropProtectionApplications.methods.${row.original.method}`)
            : "-",
      },
      {
        accessorKey: "numberOfUnits",
        header: t("fieldCalendar.harvests.amount"),
        cell: ({ row }) =>
          `${(row.original.numberOfUnits * row.original.amountPerUnit).toFixed(1)} ${row.original.product.unit}`,
      },
    ],
    [t],
  );

  return (
    <PageContent
      title={t("fieldCalendar.cropProtectionApplications.title")}
      showBackButton={!!plotId}
      backTo={plotId ? () => returnTo ? navigate({ to: returnTo as "/" }) : navigate({ to: "/field-calendar/plots/$plotId", params: { plotId } }) : undefined}
    >
      <div className="flex justify-end mb-6">
        {canWriteCropProtection && (
          <Button onClick={() => navigate({ to: "/field-calendar/crop-protection-applications/create", search: plotId ? { plotId } : {} })}>
            <Plus className="h-4 w-4 mr-2" />
            {t("fieldCalendar.cropProtectionApplications.create")}
          </Button>
        )}
      </div>
      {!plotId && <CropProtectionChart />}
      <DataTable
        data={data}
        columns={columns}
        onRowClick={(app) =>
          navigate({
            to: "/field-calendar/crop-protection-applications/$id/edit",
            params: { id: app.id },
          })
        }
        defaultSorting={[{ id: "dateTime", desc: true }]}
      />
    </PageContent>
  );
}
