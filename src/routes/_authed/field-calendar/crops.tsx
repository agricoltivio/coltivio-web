import { useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { cropsQueryOptions } from "@/api/crops.queries";
import type { Crop } from "@/api/types";
import { PageContent } from "@/components/PageContent";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { useFeatureAccess } from "@/lib/useFeatureAccess";
import { type ColumnDef } from "@tanstack/react-table";

export const Route = createFileRoute("/_authed/field-calendar/crops")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(cropsQueryOptions());
  },
  component: CropsPage,
});

function CropsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { canWrite: canWriteCrops } = useFeatureAccess("field_calendar");
  const cropsQuery = useQuery(cropsQueryOptions());

  const columns = useMemo<ColumnDef<Crop>[]>(
    () => [
      {
        accessorKey: "name",
        header: t("crops.name"),
        cell: ({ row }) => (
          <span className="font-medium">{row.getValue("name")}</span>
        ),
      },
      {
        accessorKey: "category",
        header: t("crops.category"),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {t(`crops.categories.${row.getValue<string>("category")}`)}
          </span>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "variety",
        header: t("crops.variety"),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.getValue("variety") || "-"}
          </span>
        ),
        enableSorting: false,
      },
      {
        id: "family",
        header: t("crops.family"),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.family?.name || "-"}
          </span>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "waitingTimeInYears",
        header: t("crops.waitingTimeInYears"),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.getValue("waitingTimeInYears") ?? "-"}
          </span>
        ),
        enableSorting: false,
      },
    ],
    [t],
  );

  const data = cropsQuery.data?.result ?? [];

  return (
    <PageContent
      title={t("crops.title")}
      actions={
        canWriteCrops && (
          <Button onClick={() => navigate({ to: "/field-calendar/crops/create" })}>
            {t("common.create")}
          </Button>
        )
      }
    >
      <DataTable
        data={data}
        columns={columns}
        onRowClick={(crop) =>
          navigate({
            to: "/field-calendar/crops/$cropId",
            params: { cropId: crop.id },
          })
        }
        globalFilterFn={(row, _columnId, filterValue) => {
          const crop = row.original;
          const searchValue = filterValue.toLowerCase();
          return (
            crop.name.toLowerCase().includes(searchValue) ||
            (crop.variety?.toLowerCase().includes(searchValue) ?? false)
          );
        }}
      />
    </PageContent>
  );
}
