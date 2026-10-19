import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import { herdsQueryOptions } from "@/api/herds.queries";
import {
  meadowQueryOptions,
  meadowUsageQueryOptions,
} from "@/api/meadows.queries";
import type { OutdoorSchedule } from "@/api/types";
import { PageContent } from "@/components/PageContent";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  computeMeadowMonthlyUsage,
  getMeadowUsageYears,
} from "@/lib/meadowUsage";

export const Route = createFileRoute("/_authed/animals/meadows_/$meadowId")({
  loader: ({ params, context: { queryClient } }) => {
    queryClient.ensureQueryData(meadowQueryOptions(params.meadowId));
    queryClient.ensureQueryData(meadowUsageQueryOptions(params.meadowId));
    queryClient.ensureQueryData(herdsQueryOptions());
  },
  component: MeadowUsagePage,
});

// Fixed order, as in the API
const ANIMAL_TYPES = [
  "goat",
  "sheep",
  "cow",
  "horse",
  "donkey",
  "pig",
  "deer",
] as const;
type AnimalType = (typeof ANIMAL_TYPES)[number];
const WEEKDAY_ORDER = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];

// Usage of a meadow: days on the meadow per month for a selected year (with the
// average animals per type in the tooltip), and the schedules assigned to it
function MeadowUsagePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { meadowId } = Route.useParams();
  const meadowQuery = useQuery(meadowQueryOptions(meadowId));
  const usageQuery = useQuery(meadowUsageQueryOptions(meadowId));
  const herdsQuery = useQuery(herdsQueryOptions());
  const meadow = meadowQuery.data;
  const usage = usageQuery.data ?? [];

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const availableYears = useMemo(
    () => getMeadowUsageYears(usageQuery.data ?? [], currentYear),
    [usageQuery.data, currentYear],
  );
  const monthlyUsage = useMemo(
    () =>
      computeMeadowMonthlyUsage(usageQuery.data ?? [], selectedYear, new Date()),
    [usageQuery.data, selectedYear],
  );

  // Every schedule of every herd that uses this meadow, newest first
  const meadowSchedules = useMemo(
    () =>
      (herdsQuery.data?.result ?? [])
        .flatMap((herd) =>
          herd.outdoorSchedules
            .filter((schedule) => schedule.meadowId === meadowId)
            .map((schedule) => ({ herd, schedule })),
        )
        .sort((a, b) => b.schedule.startDate.localeCompare(a.schedule.startDate)),
    [herdsQuery.data, meadowId],
  );

  const monthLabels = Array.from({ length: 12 }, (_, month) =>
    new Intl.DateTimeFormat(i18n.language, { month: "short" }).format(
      new Date(2024, month),
    ),
  );
  const monthNames = Array.from({ length: 12 }, (_, month) =>
    new Intl.DateTimeFormat(i18n.language, { month: "long" }).format(
      new Date(2024, month),
    ),
  );
  const typeLabels: Record<AnimalType, string> = {
    goat: t("animals.types.goat"),
    sheep: t("animals.types.sheep"),
    cow: t("animals.types.cow"),
    horse: t("animals.types.horse"),
    donkey: t("animals.types.donkey"),
    pig: t("animals.types.pig"),
    deer: t("animals.types.deer"),
  };

  // Tooltip of a month: days on the meadow and average animals per type
  function monthTooltip(month: number): string {
    const occupiedDays = monthlyUsage.occupiedDays[month];
    const lines = ANIMAL_TYPES.flatMap((animalType) => {
      const animalDays = monthlyUsage.animalDaysByType[animalType]?.[month] ?? 0;
      if (animalDays === 0 || occupiedDays === 0) return [];
      const average = Math.round((animalDays / occupiedDays) * 10) / 10;
      return [
        `${typeLabels[animalType]}: ${t("meadows.averageAnimals", { averageAnimals: average })}`,
      ];
    });
    return [
      `<b>${monthNames[month]} ${selectedYear}</b> – ${t("meadows.daysValue", { count: occupiedDays })}`,
      ...lines,
    ].join("<br/>");
  }

  const chartOption: EChartsOption = {
    tooltip: {
      trigger: "axis",
      // Vertical line at the hovered month
      axisPointer: { type: "line" },
      formatter: (params) => {
        const first = Array.isArray(params) ? params[0] : params;
        return monthTooltip(first?.dataIndex ?? 0);
      },
    },
    grid: { left: 40, right: 10, top: 10, bottom: 30 },
    xAxis: {
      type: "category",
      data: monthLabels,
      axisLabel: { fontSize: 10 },
    },
    yAxis: { type: "value", max: 31, axisLabel: { fontSize: 10 } },
    series: [
      {
        name: t("meadows.daysTitle"),
        type: "bar",
        data: monthlyUsage.occupiedDays,
        itemStyle: { color: "#2a5159", borderRadius: [4, 4, 0, 0] },
      },
    ],
  };

  function formatDatePart(isoDate: string | null | undefined) {
    if (!isoDate) return "–";
    const [year, month, day] = isoDate.slice(0, 10).split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString(i18n.language);
  }

  // e.g. "Weide: 01.05.2025 – 30.09.2025 · Wöchentlich: Mo, Di"
  function formatScheduleSummary(schedule: OutdoorSchedule): string {
    const weekdays = schedule.recurrence?.byWeekday ?? [];
    const isWeekdayStay =
      schedule.recurrence?.frequency === "weekly" && weekdays.length > 0;
    // Weekday stays are single days; the repetition's until date is the end
    const end = isWeekdayStay ? schedule.recurrence?.until : schedule.endDate;
    let summary = `${t(`herds.scheduleTypes.${schedule.type}`)}: ${formatDatePart(schedule.startDate)} – ${formatDatePart(end)}`;
    if (schedule.recurrence) {
      const frequency = t(`herds.frequencies.${schedule.recurrence.frequency}`);
      // 2024-01-01 is a Monday
      const formatter = new Intl.DateTimeFormat(i18n.language, { weekday: "short" });
      const weekdayNames =
        isWeekdayStay && weekdays.length < 7
          ? weekdays
              .map((weekday) => WEEKDAY_ORDER.indexOf(weekday))
              .sort((a, b) => a - b)
              .map((index) => formatter.format(new Date(2024, 0, 1 + index)))
              .join(", ")
          : null;
      summary += weekdayNames ? ` · ${frequency}: ${weekdayNames}` : ` · ${frequency}`;
    }
    return summary;
  }

  if (meadowQuery.isLoading) {
    return (
      <PageContent title={t("common.loading")}>
        <div className="py-8 text-center text-muted-foreground">{t("common.loading")}</div>
      </PageContent>
    );
  }
  if (!meadow) {
    return (
      <PageContent title={t("common.error")}>
        <div className="py-8 text-center text-destructive">{t("common.error")}</div>
      </PageContent>
    );
  }

  return (
    <PageContent
      title={meadow.name}
      showBackButton
      backTo={() => navigate({ to: "/field-calendar/plots" })}
    >
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          {(meadow.size / 100).toFixed(2)} a
        </p>

        {/* Same card layout as the field-calendar charts */}
        <Card>
          <CardHeader>
            <CardTitle>{t("meadows.daysTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            {availableYears.length > 1 && (
              <div className="flex gap-1 flex-wrap mb-4">
                {availableYears.map((year) => (
                  <button
                    key={year}
                    type="button"
                    onClick={() => setSelectedYear(year)}
                    className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                      selectedYear === year
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border"
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            )}
            <ReactECharts option={chartOption} style={{ height: 240, width: "100%" }} notMerge />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("herds.outdoorSchedules")}</CardTitle>
          </CardHeader>
          <CardContent>
            {meadowSchedules.length === 0 ? (
              <div className="py-4 text-center text-muted-foreground">
                {t("herds.noSchedules")}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("herds.name")}</TableHead>
                    <TableHead>{t("herds.outdoorSchedules")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {meadowSchedules.map(({ herd, schedule }) => (
                    <TableRow
                      key={schedule.id}
                      className="cursor-pointer"
                      onClick={() =>
                        navigate({
                          to: "/animals/herds/$herdId",
                          params: { herdId: herd.id },
                          search: { returnTo: `/animals/meadows/${meadowId}` },
                        })
                      }
                    >
                      <TableCell className="font-medium">{herd.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatScheduleSummary(schedule)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContent>
  );
}
