import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { plotTillagesQueryOptions, tillagesQueryOptions } from "@/api/tillages.queries";
import type { Tillage } from "@/api/types";
import { DataTable } from "@/components/DataTable";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import { type ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { useFeatureAccess } from "@/lib/useFeatureAccess";

const searchSchema = z.object({
  plotId: z.string().optional(),
  returnTo: z.string().optional(),
});

export const Route = createFileRoute("/_authed/field-calendar/tillages")({
  validateSearch: searchSchema,
  loader: ({ context: { queryClient }, location }) => {
    const plotId = new URLSearchParams(location.search).get("plotId");
    if (plotId) {
      queryClient.ensureQueryData(plotTillagesQueryOptions(plotId));
    } else {
      queryClient.ensureQueryData(tillagesQueryOptions());
    }
  },
  component: Tillages,
});

function Tillages() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { canWrite: canWriteTillages } = useFeatureAccess("field_calendar");
  const { plotId, returnTo } = Route.useSearch();

  const globalQuery = useQuery({
    ...tillagesQueryOptions(),
    enabled: !plotId,
  });
  const plotQuery = useQuery({
    ...plotTillagesQueryOptions(plotId ?? ""),
    enabled: !!plotId,
  });

  const data = (plotId ? plotQuery.data?.result : globalQuery.data?.result) ?? [];

  const columns = useMemo<ColumnDef<Tillage>[]>(
    () => [
      {
        accessorKey: "date",
        header: t("fieldCalendar.tillages.date"),
        cell: ({ row }) =>
          new Date(row.getValue("date")).toLocaleDateString(),
      },
      {
        accessorKey: "plot.name",
        header: t("fieldCalendar.plots.plot"),
        cell: ({ row }) => row.original.plot.name,
      },
      {
        accessorKey: "action",
        header: t("fieldCalendar.tillages.action"),
        cell: ({ row }) => {
          const action = row.original.action;
          return action === "custom"
            ? (row.original.customAction ?? action)
            : t(`fieldCalendar.tillages.actions.${action}`);
        },
      },
      {
        accessorKey: "size",
        header: t("fieldCalendar.tillages.size"),
        cell: ({ row }) => `${(row.original.size / 100).toFixed(2)} a`,
      },
      {
        accessorKey: "additionalNotes",
        header: t("fieldCalendar.tillages.notes"),
        cell: ({ row }) => row.original.additionalNotes ?? "-",
      },
    ],
    [t],
  );

  return (
    <PageContent
      title={t("fieldCalendar.tillages.title")}
      showBackButton={!!plotId}
      backTo={plotId ? () => returnTo ? navigate({ to: returnTo as "/" }) : navigate({ to: "/field-calendar/plots/$plotId", params: { plotId } }) : undefined}
    >
      <div className="flex justify-end mb-4">
        {canWriteTillages && (
          <Button onClick={() => navigate({ to: "/field-calendar/tillages/create", search: plotId ? { plotId } : {} })}>
            <Plus className="h-4 w-4 mr-2" />
            {t("fieldCalendar.tillages.create")}
          </Button>
        )}
      </div>
      <DataTable
        data={data}
        columns={columns}
        onRowClick={(tillage) =>
          navigate({
            to: "/field-calendar/tillages/$tillageId",
            params: { tillageId: tillage.id },
          })
        }
        defaultSorting={[{ id: "date", desc: true }]}
      />
    </PageContent>
  );
}
