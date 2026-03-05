import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { harvestsQueryOptions, plotHarvestsQueryOptions } from "@/api/harvests.queries";
import type { components } from "@/api/schema";
import { DataTable } from "@/components/DataTable";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import { type ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";

type GlobalHarvest = components["schemas"]["GetV1HarvestsPositiveResponse"]["data"]["result"][number];
type PlotHarvest = components["schemas"]["GetV1PlotsByIdPlotIdHarvestsPositiveResponse"]["data"]["result"][number];
type HarvestRow = GlobalHarvest | PlotHarvest;

const searchSchema = z.object({
  plotId: z.string().optional(),
});

export const Route = createFileRoute("/_authed/field-calendar/harvests")({
  validateSearch: searchSchema,
  loader: ({ context: { queryClient }, location }) => {
    const plotId = new URLSearchParams(location.search).get("plotId");
    if (plotId) {
      queryClient.ensureQueryData(plotHarvestsQueryOptions(plotId));
    } else {
      queryClient.ensureQueryData(harvestsQueryOptions());
    }
  },
  component: Harvests,
});

function Harvests() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { plotId } = Route.useSearch();

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
      backTo={plotId ? () => navigate({ to: "/field-calendar/plots/$plotId", params: { plotId } }) : undefined}
    >
      <div className="flex justify-end mb-4">
        <Button
          onClick={() =>
            navigate({
              to: "/field-calendar/harvests/create",
              search: plotId ? { plotId } : {},
            })
          }
        >
          <Plus className="h-4 w-4 mr-2" />
          {t("fieldCalendar.harvests.create")}
        </Button>
      </div>
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
