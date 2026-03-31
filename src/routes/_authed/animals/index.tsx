import { useMemo, useState } from "react";
import { animalsQueryOptions } from "@/api/animals.queries";
import { ANIMAL_TYPES, type AnimalType, type Animal } from "@/api/types";
import { MultiSelect } from "@/components/ui/multi-select";
import { PageContent } from "@/components/PageContent";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowUp, Upload } from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";
import ReactECharts from "echarts-for-react";
import { CHART_COLORS } from "@/components/charts/chartUtils";
import z from "zod";

const animalSearchSchema = z.object({
  page: fallback(z.number(), 1).default(1),
  filter: fallback(z.string(), "").default(""),
  onlyLiving: fallback(z.boolean(), true).default(true),
});

export const Route = createFileRoute("/_authed/animals/")({
  loaderDeps: ({ search: { onlyLiving } }) => ({ onlyLiving }),
  loader: ({ deps, context: { queryClient } }) => {
    queryClient.ensureQueryData(animalsQueryOptions(deps.onlyLiving));
  },
  validateSearch: zodValidator(animalSearchSchema),
  component: Animals,
});

function Animals() {
  const { t } = useTranslation();
  const { onlyLiving } = Route.useSearch();
  const navigate = useNavigate();
  const animalsQuery = useQuery(animalsQueryOptions(onlyLiving));
  const [typeFilter, setTypeFilter] = useState<AnimalType[]>([]);

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString();
  }

  const columns = useMemo<ColumnDef<Animal>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="p-0 has-[>svg]:px-0 hover:bg-transparent justify-start"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("animals.name")}
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ArrowDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.getValue("name")}</span>
        ),
      },
      {
        accessorKey: "type",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="cursor-pointer"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("animals.type")}
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ArrowDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => t(`animals.types.${row.getValue("type")}`),
        sortingFn: (rowA, rowB) => {
          const typeA = rowA.getValue("type") as string;
          const typeB = rowB.getValue("type") as string;
          return (
            ANIMAL_TYPES.indexOf(typeA as AnimalType) -
            ANIMAL_TYPES.indexOf(typeB as AnimalType)
          );
        },
      },
      {
        accessorKey: "earTag.number",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="p-0 has-[>svg]:px-0 hover:bg-transparent justify-start"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("animals.earTag")}
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ArrowDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => row.original.earTag?.number || "-",
      },
      {
        accessorKey: "dateOfBirth",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="p-0 has-[>svg]:px-0 hover:bg-transparent justify-start"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("animals.dateOfBirth")}
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ArrowDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => {
          const dateOfBirth = row.getValue("dateOfBirth") as string | null;
          return dateOfBirth ? formatDate(dateOfBirth) : "-";
        },
      },
    ],
    [t],
  );

  const allAnimals = animalsQuery.data?.result ?? [];
  const data = typeFilter.length > 0
    ? allAnimals.filter((a) => typeFilter.includes(a.type))
    : allAnimals;

  return (
    <PageContent title="Tiere">
      <div className="flex justify-end gap-2 mb-6">
        <Button variant="outline" onClick={() => navigate({ to: "/animals/import" })}>
          <Upload className="h-4 w-4 mr-2" />
          {t("animals.import")}
        </Button>
        <Button onClick={() => navigate({ to: "/animals/create" })}>
          {t("common.create")}
        </Button>
      </div>

      {allAnimals.length > 0 && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <AnimalTypePieChart animals={allAnimals} />
          <AgeDistributionChart animals={allAnimals} />
        </div>
      )}

      <DataTable
        data={data}
        columns={columns}
        onRowClick={(animal) =>
          navigate({
            to: "/animals/$animalId",
            params: { animalId: animal.id },
          })
        }
        globalFilterFn={(row, _columnId, filterValue) => {
          const animal = row.original;
          const searchValue = filterValue.toLowerCase();
          return (
            animal.name.toLowerCase().includes(searchValue) ||
            (animal.earTag?.number?.toLowerCase().includes(searchValue) ??
              false)
          );
        }}
        defaultSorting={[{ id: "type", desc: false }]}
        filterSlot={
          <>
            <Button
              variant={onlyLiving ? "outline" : "secondary"}
              onClick={() =>
                navigate({ to: "/animals", search: { onlyLiving: !onlyLiving } })
              }
            >
              {onlyLiving ? t("animals.showAll") : t("animals.showLivingOnly")}
            </Button>
            <MultiSelect
              options={ANIMAL_TYPES.map((type) => ({
                value: type,
                label: t(`animals.types.${type}`),
              }))}
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v as AnimalType[])}
              placeholder={t("animals.filterByType")}
              className="w-48"
            />
          </>
        }
      />
    </PageContent>
  );
}

function AnimalTypePieChart({ animals }: { animals: Animal[] }) {
  const { t } = useTranslation();

  const pieData = useMemo(() => {
    const counts: Partial<Record<AnimalType, number>> = {};
    for (const animal of animals) {
      counts[animal.type] = (counts[animal.type] ?? 0) + 1;
    }
    return Object.entries(counts).map(([type, count], i) => ({
      name: t(`animals.types.${type}`),
      value: count,
      itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] },
    }));
  }, [animals, t]);

  const option = {
    tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
    legend: { bottom: 0, type: "scroll", textStyle: { fontSize: 11 } },
    series: [
      {
        type: "pie",
        radius: ["40%", "70%"],
        center: ["50%", "45%"],
        data: pieData,
        label: {
          show: true,
          formatter: "{b}: {c}",
          fontSize: 11,
        },
        emphasis: { label: { fontSize: 13, fontWeight: "bold" } },
      },
    ],
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{t("animals.chartByType")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ReactECharts option={option} style={{ height: 220 }} notMerge />
      </CardContent>
    </Card>
  );
}

function ageYears(dateOfBirth: string): number {
  return (Date.now() - new Date(dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
}

function AgeDistributionChart({ animals }: { animals: Animal[] }) {
  const { t } = useTranslation();

  const typesPresent = useMemo(
    () => ANIMAL_TYPES.filter((type) => animals.some((a) => a.type === type)),
    [animals],
  );

  const typeColor = useMemo(
    () => Object.fromEntries(ANIMAL_TYPES.map((type, i) => [type, CHART_COLORS[i % CHART_COLORS.length]])),
    [],
  );

  const option = useMemo(() => {
    const animalsWithAge = animals.filter((a) => a.dateOfBirth);
    return {
      tooltip: {
        trigger: "item",
        formatter: (params: { data: [number, number, string] }) =>
          `${params.data[2]}: ${params.data[0].toFixed(1)} ${t("animals.years")}`,
      },
      legend: { bottom: 0, type: "scroll", textStyle: { fontSize: 11 } },
      grid: { left: 80, right: 16, top: 10, bottom: 40 },
      xAxis: { type: "value", axisLabel: { fontSize: 10 }, min: 0, name: t("animals.years"), nameLocation: "end", nameTextStyle: { fontSize: 10 } },
      yAxis: { type: "category", data: typesPresent.map((type) => t(`animals.types.${type}`)), axisLabel: { fontSize: 11 } },
      series: typesPresent.map((type) => ({
        name: t(`animals.types.${type}`),
        type: "scatter",
        symbolSize: 7,
        itemStyle: { color: typeColor[type], opacity: 0.75 },
        data: animalsWithAge
          .filter((a) => a.type === type)
          .map((a) => {
            const age = +ageYears(a.dateOfBirth).toFixed(2);
            const yIndex = typesPresent.indexOf(type);
            const jitter = ((a.id.charCodeAt(0) + a.id.charCodeAt(1)) % 20) / 100 - 0.1;
            return [age, yIndex + jitter, a.name];
          }),
      })),
    };
  }, [animals, typesPresent, typeColor, t]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{t("animals.chartAgeDistribution")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ReactECharts option={option} style={{ height: 220 }} notMerge />
      </CardContent>
    </Card>
  );
}
