import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import {
  fertilizerApplicationsQueryOptions,
  plotFertilizerApplicationsQueryOptions,
} from "@/api/fertilizerApplications.queries";
import type { components } from "@/api/schema";
import { DataTable } from "@/components/DataTable";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import { type ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";

// The global endpoint includes a `plot` field; the plot-scoped one does not.
// We use the global type for both and treat `plot` as optional for display.
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
    }
  },
  component: FertilizerApplications,
});

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
