import { useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { cropsQueryOptions } from "@/api/crops.queries";
import type { Crop } from "@/api/types";
import { PageContent } from "@/components/PageContent";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp } from "lucide-react";
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
  const { canWrite: canWriteCrops } = useFeatureAccess("crops");
  const cropsQuery = useQuery(cropsQueryOptions());

  const columns = useMemo<ColumnDef<Crop>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="p-0 has-[>svg]:px-0 hover:bg-transparent justify-start"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("crops.name")}
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
    <PageContent title={t("crops.title")} showBackButton={false}>
      <div className="flex justify-end mb-4">
        {canWriteCrops && (
          <Button onClick={() => navigate({ to: "/field-calendar/crops/create" })}>
            {t("common.create")}
          </Button>
        )}
      </div>
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
