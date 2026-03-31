import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import ReactECharts from "echarts-for-react";
import { useTranslation } from "react-i18next";
import { farmDashboardQueryOptions, farmFieldEventsQueryOptions, farmQueryOptions } from "@/api/farm.queries";
import { tasksQueryOptions } from "@/api/tasks.queries";
import { animalsQueryOptions } from "@/api/animals.queries";
import { FieldworkMap } from "@/components/FieldworkMap";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authed/dashboard")({
  component: RouteComponent,
});

const CHART_COLORS = [
  "#4ade80",
  "#60a5fa",
  "#f97316",
  "#a78bfa",
  "#fb923c",
  "#34d399",
  "#f472b6",
  "#facc15",
];

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-xl font-bold mt-1 break-words">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function RouteComponent() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const { data, isLoading, isError } = useQuery(farmDashboardQueryOptions(year));

  const fromDate = `${year}-01-01`;
  const toDate = `${year}-12-31`;
  const fieldEventsQuery = useQuery(farmFieldEventsQueryOptions(fromDate, toDate));
  const farmQuery = useQuery(farmQueryOptions());
  const tasksQuery = useQuery(tasksQueryOptions({ status: "todo" }));
  // All animals (including dead) to compute born/died/slaughtered for the selected year
  const allAnimalsQuery = useQuery(animalsQueryOptions(false));

  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingTasks = (tasksQuery.data?.result ?? [])
    .filter((task) => typeof task.dueDate === "string" && new Date(task.dueDate) <= weekFromNow)
    .sort((a, b) => new Date(a.dueDate as string).getTime() - new Date(b.dueDate as string).getTime());

  if (isLoading) {
    return <p className="text-muted-foreground">{t("common.loading")}</p>;
  }

  if (isError || !data) {
    return <p className="text-destructive">{t("common.error")}</p>;
  }

  const { animals, harvests, plots, fertilizerApplications, cropProtectionApplications, cropRotations } = data;

  // Compute born/died/slaughtered for the selected year from the full animal list
  const yearAnimalStats = (() => {
    const list = allAnimalsQuery.data?.result ?? [];
    let born = 0, died = 0, slaughtered = 0;
    for (const animal of list) {
      if (animal.dateOfBirth && new Date(animal.dateOfBirth).getFullYear() === year) born++;
      if (animal.dateOfDeath && new Date(animal.dateOfDeath).getFullYear() === year) {
        if (animal.deathReason === "slaughtered") slaughtered++;
        else died++;
      }
    }
    return { born, died, slaughtered };
  })();

  // Top crop by area (from active crop rotations)
  const topCropByArea = cropRotations.active.length > 0
    ? [...cropRotations.active].sort((a, b) => b.totalAreaM2 - a.totalAreaM2)[0]
    : null;

  // Top harvested crop by total kg
  const topHarvestedCrop = harvests.byCrop.length > 0
    ? [...harvests.byCrop].sort((a, b) => b.totalKilos - a.totalKilos)[0]
    : null;

  // Animals by type donut
  const animalsByTypeOption = {
    tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
    legend: { orient: "horizontal", bottom: 0, left: "center", textStyle: { fontSize: 12 } },
    series: [
      {
        type: "pie",
        radius: ["40%", "68%"],
        center: ["50%", "42%"],
        data: animals.byType.map((item) => ({
          name: t(`animals.types.${item.type}`, { defaultValue: item.type }),
          value: item.count,
        })),
        color: CHART_COLORS,
        label: { show: false },
      },
    ],
  };

  // Plots by current crop (from active crop rotations — plotCount per crop)
  const plotsByCropOption = {
    tooltip: { trigger: "item", formatter: "{b}: {c} Schläge ({d}%)" },
    legend: { orient: "horizontal", bottom: 0, left: "center", textStyle: { fontSize: 12 } },
    series: [
      {
        type: "pie",
        radius: ["40%", "68%"],
        center: ["50%", "42%"],
        data: cropRotations.active.map((item) => ({
          name: item.cropName,
          value: item.plotCount,
        })),
        color: CHART_COLORS,
        label: { show: false },
      },
    ],
  };

  // Harvest by crop horizontal bar (sorted descending by weight)
  const harvestByCropSorted = [...harvests.byCrop].sort(
    (a, b) => b.totalKilos - a.totalKilos,
  );
  const harvestByCropOption = {
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: { left: 150, right: 60, top: 10, bottom: 10 },
    xAxis: { type: "value", axisLabel: { formatter: (v: number) => `${v} kg` } },
    yAxis: {
      type: "category",
      data: harvestByCropSorted.map((c) =>
        c.conservationMethod
          ? `${c.cropName} (${t(`fieldCalendar.harvests.conservationMethods.${c.conservationMethod}`, { defaultValue: c.conservationMethod })})`
          : c.cropName,
      ),
      axisLabel: { fontSize: 12, width: 140, overflow: "truncate" },
    },
    series: [
      {
        type: "bar",
        data: harvestByCropSorted.map((c) => c.totalKilos),
        color: CHART_COLORS[0],
        label: { show: true, position: "right", formatter: "{c} kg", fontSize: 11 },
      },
    ],
  };

  // Fertilizer by name, color-coded by type (mineral=blue, organic=green)
  const fertilizerOption = {
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: { left: 150, right: 60, top: 10, bottom: 10 },
    xAxis: { type: "value" },
    yAxis: {
      type: "category",
      data: fertilizerApplications.byFertilizer.map((f) => f.fertilizerName),
      axisLabel: { fontSize: 12, width: 140, overflow: "truncate" },
    },
    series: [
      {
        type: "bar",
        data: fertilizerApplications.byFertilizer.map((f) => ({
          value: f.totalAmount,
          itemStyle: { color: f.type === "organic" ? "#4ade80" : "#60a5fa" },
        })),
        label: {
          show: true,
          position: "right",
          formatter: (params: { dataIndex: number }) => {
            const f = fertilizerApplications.byFertilizer[params.dataIndex];
            return `${f.totalAmount} ${f.unit}`;
          },
          fontSize: 11,
        },
      },
    ],
  };

  // Crop protection by product horizontal bar
  const cropProtectionOption = {
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: { left: 150, right: 60, top: 10, bottom: 10 },
    xAxis: { type: "value" },
    yAxis: {
      type: "category",
      data: cropProtectionApplications.byProduct.map((p) => p.productName),
      axisLabel: { fontSize: 12, width: 140, overflow: "truncate" },
    },
    series: [
      {
        type: "bar",
        data: cropProtectionApplications.byProduct.map((p) => ({ value: p.totalAmount })),
        color: CHART_COLORS[4],
        label: {
          show: true,
          position: "right",
          formatter: (params: { dataIndex: number }) => {
            const p = cropProtectionApplications.byProduct[params.dataIndex];
            return `${p.totalAmount} ${p.unit}`;
          },
          fontSize: 11,
        },
      },
    ],
  };

  // Active crop rotations vertical bar
  const cropRotationsOption = {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: { name: string; value: number }[]) =>
        `${params[0].name}: ${params[0].value.toFixed(2)} ha`,
    },
    grid: { left: 20, right: 20, top: 24, bottom: 40, containLabel: true },
    xAxis: {
      type: "category",
      data: cropRotations.active.map((c) => c.cropName),
      axisLabel: { fontSize: 11, rotate: 30 },
    },
    yAxis: { type: "value", axisLabel: { formatter: (v: number) => `${v} ha` } },
    series: [
      {
        type: "bar",
        data: cropRotations.active.map((c) => +(c.totalAreaM2 / 10000).toFixed(2)),
        color: CHART_COLORS[1],
        label: {
          show: true,
          position: "top",
          fontSize: 11,
          formatter: (params: { value: number }) => `${params.value} ha`,
        },
      },
    ],
  };

  const totalAreaHa = (plots.totalAreaM2 / 10000).toFixed(2);
  const harvestByCropHeight = Math.max(120, harvestByCropSorted.length * 36 + 30);
  const fertilizerHeight = Math.max(100, fertilizerApplications.byFertilizer.length * 36 + 30);
  const cropProtectionHeight = Math.max(100, cropProtectionApplications.byProduct.length * 36 + 30);

  return (
    <div className="space-y-6">
      {/* Header with year selector */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label={t("nav.animals")}
          value={animals.total}
          sub={`+${yearAnimalStats.born} ${t("dashboard.animalsBorn")} · -${yearAnimalStats.died} ${t("dashboard.animalsDied")} · -${yearAnimalStats.slaughtered} ${t("dashboard.animalsSlaughtered")}`}
        />
        <StatCard
          label={t("nav.plots")}
          value={plots.total}
          sub={`${totalAreaHa} ha`}
        />
        {topCropByArea && (
          <StatCard
            label={t("dashboard.topCropByArea", { defaultValue: "Grösste Kultur" })}
            value={topCropByArea.cropName}
            sub={`${(topCropByArea.totalAreaM2 / 10000).toFixed(2)} ha`}
          />
        )}
        {topHarvestedCrop && (
          <StatCard
            label={t("dashboard.topHarvestedCrop", { defaultValue: "Meiste Ernte" })}
            value={topHarvestedCrop.cropName}
            sub={`${topHarvestedCrop.totalKilos.toLocaleString()} kg`}
          />
        )}
      </div>

      {/* Upcoming tasks */}
      {upcomingTasks.length > 0 && (
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm font-semibold mb-3">
            {t("dashboard.upcomingTasks", { defaultValue: "Anstehende Aufgaben" })}
          </p>
          <div className="divide-y">
            {upcomingTasks.map((task) => {
              const dueDate = new Date(task.dueDate as string);
              const isOverdue = dueDate < now;
              return (
                <Link
                  key={task.id}
                  to="/tasks/$taskId"
                  params={{ taskId: task.id }}
                  className="flex items-center justify-between px-3 py-2 hover:bg-accent transition-colors text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-medium truncate">{task.name}</span>
                    {task.assignee && (
                      <span className="text-muted-foreground ml-2 text-xs">
                        {task.assignee.fullName || task.assignee.email}
                      </span>
                    )}
                  </div>
                  <span className={`text-xs shrink-0 ml-4 ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                    {dueDate.toLocaleDateString()}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Donuts: animals by type + plots by current crop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm font-semibold mb-2">
            {t("dashboard.animalsByType", { defaultValue: "Tiere nach Typ" })}
          </p>
          <ReactECharts option={animalsByTypeOption} style={{ height: 220 }} />
        </div>
        {cropRotations.active.length > 0 && (
          <div className="bg-white rounded-xl border p-4">
            <p className="text-sm font-semibold mb-2">
              {t("dashboard.plotsByCrop", { defaultValue: "Schläge nach Kultur" })}
            </p>
            <ReactECharts option={plotsByCropOption} style={{ height: 220 }} />
          </div>
        )}
      </div>

      {/* Harvest */}
      {harvests.byCrop.length > 0 && (
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm font-semibold mb-2">
            {t("dashboard.harvestByCrop", { defaultValue: "Ernte nach Kultur" })}
          </p>
          <ReactECharts option={harvestByCropOption} style={{ height: harvestByCropHeight }} />
        </div>
      )}

      {/* Fertilizer */}
      {fertilizerApplications.byFertilizer.length > 0 && (
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm font-semibold mb-2">
            {t("dashboard.fertilizerApplications", { defaultValue: "Düngung" })}
          </p>
          <div className="flex gap-4 text-xs text-muted-foreground mb-2">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm bg-[#60a5fa]" />
              {t("dashboard.mineral", { defaultValue: "Mineral" })}
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm bg-[#4ade80]" />
              {t("dashboard.organic", { defaultValue: "Organisch" })}
            </span>
          </div>
          <ReactECharts option={fertilizerOption} style={{ height: fertilizerHeight }} />
        </div>
      )}

      {/* Crop protection */}
      {cropProtectionApplications.byProduct.length > 0 && (
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm font-semibold mb-2">
            {t("dashboard.cropProtection", { defaultValue: "Pflanzenschutz" })}
          </p>
          <ReactECharts option={cropProtectionOption} style={{ height: cropProtectionHeight }} />
        </div>
      )}

      {/* Crop rotations */}
      {cropRotations.active.length > 0 && (
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm font-semibold mb-2">
            {t("dashboard.cropRotations", { defaultValue: "Aktive Fruchtfolgen" })}
          </p>
          <ReactECharts option={cropRotationsOption} style={{ height: 220 }} />
        </div>
      )}

      {/* Fieldwork playback map */}
      {fieldEventsQuery.data && fieldEventsQuery.data.length > 0 && (
        <div>
          <p className="text-sm font-semibold mb-2">
            {t("dashboard.fieldworkMap", { defaultValue: "Feldarbeit" })}
          </p>
          <div className="relative">
            <FieldworkMap
              key={`${year}`}
              events={fieldEventsQuery.data}
              farmLocation={
                farmQuery.data?.location.coordinates
                  ? [farmQuery.data.location.coordinates[0], farmQuery.data.location.coordinates[1]]
                  : null
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
