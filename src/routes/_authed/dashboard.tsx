import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import ReactECharts from "echarts-for-react";
import { useTranslation } from "react-i18next";
import { farmDashboardQueryOptions, farmFieldEventsQueryOptions, farmQueryOptions } from "@/api/farm.queries";
import { tasksQueryOptions } from "@/api/tasks.queries";
import { animalsQueryOptions } from "@/api/animals.queries";
import { forumThreadsQueryOptions } from "@/api/forum.queries";
import { membershipStatusQueryOptions } from "@/api/membership.queries";
import { checkUserHasAccess } from "@/lib/membership";
import { inlineLink, threadTypeBadgeClass } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { FieldworkMap } from "@/components/FieldworkMap";
import { CHART_COLORS } from "@/components/charts/chartUtils";
import { Badge } from "@/components/ui/badge";
import { Lock, MessageSquare } from "lucide-react";
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

// Fertilizer chart legend: organic = green, mineral = teal (brand colours)
const FERTILIZER_COLORS = { organic: "#85a60f", mineral: "#2a5159" } as const;

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
    <div className="bg-card rounded-xl border p-4">
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
  const membershipStatusQuery = useQuery(membershipStatusQueryOptions());
  const isMember = checkUserHasAccess(membershipStatusQuery.data);
  const forumThreadsQuery = useQuery({
    ...forumThreadsQueryOptions(),
    enabled: isMember,
  });

  const now = new Date();
  // The three tasks with the soonest due dates (overdue included). If nothing has a
  // due date, fall back to the first three open tasks.
  const openTasks = tasksQuery.data?.result ?? [];
  const datedTasks = openTasks
    .filter((task) => typeof task.dueDate === "string")
    .sort((a, b) => new Date(a.dueDate as string).getTime() - new Date(b.dueDate as string).getTime());
  const upcomingTasks = (datedTasks.length > 0 ? datedTasks : openTasks).slice(0, 3);

  // Sort all threads by updatedAt desc and take 3 most recently active
  const recentForumThreads = [...(forumThreadsQuery.data?.result ?? [])]
    .sort((a, b) => {
      const aTime = typeof a.updatedAt === "string" ? new Date(a.updatedAt).getTime() : 0;
      const bTime = typeof b.updatedAt === "string" ? new Date(b.updatedAt).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 3);

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
          itemStyle: {
            color: f.type === "organic" ? FERTILIZER_COLORS.organic : FERTILIZER_COLORS.mineral,
          },
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

      {/* Upcoming tasks + Treffpunkt, side by side */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-card rounded-xl border">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="text-sm font-semibold">{t("nav.tasks")}</p>
            <Link to="/tasks" className="text-xs text-muted-foreground hover:text-foreground">
              {t("common.viewAll", { defaultValue: "Alle anzeigen" })}
            </Link>
          </div>
          {upcomingTasks.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              {t("dashboard.noUpcomingTasks")}
            </p>
          ) : (
            <div className="divide-y">
              {upcomingTasks.map((task) => {
                const dueDate = task.dueDate ? new Date(task.dueDate as string) : null;
                const isOverdue = dueDate ? dueDate < now : false;
                return (
                  <Link
                    key={task.id}
                    to="/tasks/$taskId"
                    params={{ taskId: task.id }}
                    className="flex h-14 flex-col justify-center gap-0.5 px-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {task.name}
                      </span>
                      {task.assignee && (
                        <Badge
                          variant="secondary"
                          className="max-w-[9rem] shrink-0 text-ellipsis font-normal"
                        >
                          {task.assignee.fullName || task.assignee.email}
                        </Badge>
                      )}
                      {dueDate && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "shrink-0 font-normal",
                            isOverdue && "border-destructive/40 text-destructive",
                          )}
                        >
                          {dueDate.toLocaleDateString()}
                        </Badge>
                      )}
                    </div>
                    <span className="block h-4 truncate text-xs leading-4 text-muted-foreground">
                      {task.description}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-card rounded-xl border">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="text-sm font-semibold">
              {t("dashboard.recentTreffpunkt", { defaultValue: "Treffpunkt" })}
            </p>
            {isMember && (
              <Link to="/treffpunkt" className="text-xs text-muted-foreground hover:text-foreground">
                {t("common.viewAll", { defaultValue: "Alle anzeigen" })}
              </Link>
            )}
          </div>
          {!isMember ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <Lock className="size-6 text-muted-foreground" />
              <p className="max-w-[36ch] text-sm text-muted-foreground">
                {t("membership.membersOnly.description")}
              </p>
              <Link to="/membership" className={cn(inlineLink, "text-sm")}>
                {t("membership.membersOnly.cta")}
              </Link>
            </div>
          ) : recentForumThreads.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              {t("dashboard.noThreads")}
            </p>
          ) : (
            <div className="divide-y">
              {recentForumThreads.map((thread) => (
                <Link
                  key={thread.id}
                  to="/treffpunkt/$threadId"
                  params={{ threadId: thread.id }}
                  className="block px-4 py-2.5 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 flex-1 truncate text-sm font-medium">{thread.title}</p>
                    <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                      <MessageSquare className="size-3.5" />
                      {thread.replyCount ?? 0}
                    </span>
                  </div>
                  <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                    <Badge
                      variant="outline"
                      className={cn("shrink-0 px-1.5 py-0 text-[10px]", threadTypeBadgeClass[thread.type])}
                    >
                      {t(`treffpunkt.types.${thread.type}`)}
                    </Badge>
                    <span className="truncate">
                      {thread.creator.fullName ?? t("common.unknown")}
                      {typeof thread.updatedAt === "string" && (
                        <>{" · "}{new Date(thread.updatedAt).toLocaleDateString()}</>
                      )}
                    </span>
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Donuts: animals by type + plots by current crop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border p-4">
          <p className="text-sm font-semibold mb-2">
            {t("dashboard.animalsByType", { defaultValue: "Tiere nach Typ" })}
          </p>
          <ReactECharts option={animalsByTypeOption} style={{ height: 220 }} />
        </div>
        {cropRotations.active.length > 0 && (
          <div className="bg-card rounded-xl border p-4">
            <p className="text-sm font-semibold mb-2">
              {t("dashboard.plotsByCrop", { defaultValue: "Schläge nach Kultur" })}
            </p>
            <ReactECharts option={plotsByCropOption} style={{ height: 220 }} />
          </div>
        )}
      </div>

      {/* Harvest */}
      {harvests.byCrop.length > 0 && (
        <div className="bg-card rounded-xl border p-4">
          <p className="text-sm font-semibold mb-2">
            {t("dashboard.harvestByCrop", { defaultValue: "Ernte nach Kultur" })}
          </p>
          <ReactECharts option={harvestByCropOption} style={{ height: harvestByCropHeight }} />
        </div>
      )}

      {/* Fertilizer */}
      {fertilizerApplications.byFertilizer.length > 0 && (
        <div className="bg-card rounded-xl border p-4">
          <p className="text-sm font-semibold mb-2">
            {t("dashboard.fertilizerApplications", { defaultValue: "Düngung" })}
          </p>
          <div className="flex gap-4 text-xs text-muted-foreground mb-2">
            <span className="flex items-center gap-1">
              <span
                className="inline-block w-3 h-3 rounded-sm"
                style={{ backgroundColor: FERTILIZER_COLORS.mineral }}
              />
              {t("dashboard.mineral", { defaultValue: "Mineral" })}
            </span>
            <span className="flex items-center gap-1">
              <span
                className="inline-block w-3 h-3 rounded-sm"
                style={{ backgroundColor: FERTILIZER_COLORS.organic }}
              />
              {t("dashboard.organic", { defaultValue: "Organisch" })}
            </span>
          </div>
          <ReactECharts option={fertilizerOption} style={{ height: fertilizerHeight }} />
        </div>
      )}

      {/* Crop protection */}
      {cropProtectionApplications.byProduct.length > 0 && (
        <div className="bg-card rounded-xl border p-4">
          <p className="text-sm font-semibold mb-2">
            {t("dashboard.cropProtection", { defaultValue: "Pflanzenschutz" })}
          </p>
          <ReactECharts option={cropProtectionOption} style={{ height: cropProtectionHeight }} />
        </div>
      )}

      {/* Crop rotations */}
      {cropRotations.active.length > 0 && (
        <div className="bg-card rounded-xl border p-4">
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
