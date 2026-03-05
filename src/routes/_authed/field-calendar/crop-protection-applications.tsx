import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import {
  cropProtectionApplicationsQueryOptions,
  plotCropProtectionApplicationsQueryOptions,
} from "@/api/cropProtectionApplications.queries";
import type { CropProtectionApplication } from "@/api/types";
import { DataTable } from "@/components/DataTable";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import { type ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";

const searchSchema = z.object({
  plotId: z.string().optional(),
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
    }
  },
  component: CropProtectionApplications,
});

function CropProtectionApplications() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { plotId } = Route.useSearch();

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
      backTo={plotId ? () => navigate({ to: "/field-calendar/plots/$plotId", params: { plotId } }) : undefined}
    >
      <div className="flex justify-end mb-4">
        <Button
          onClick={() =>
            navigate({
              to: "/field-calendar/crop-protection-applications/create",
              search: plotId ? { plotId } : {},
            })
          }
        >
          <Plus className="h-4 w-4 mr-2" />
          {t("fieldCalendar.cropProtectionApplications.create")}
        </Button>
      </div>
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
