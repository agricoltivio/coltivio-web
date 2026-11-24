import { useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { seedsQueryOptions } from "@/api/seeds.queries";
import type { Seed } from "@/api/types";
import { PageContent } from "@/components/PageContent";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { type ColumnDef } from "@tanstack/react-table";
import { useFeatureAccess } from "@/lib/useFeatureAccess";

export const Route = createFileRoute("/_authed/field-calendar/seeds")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(seedsQueryOptions());
  },
  component: SeedsPage,
});

function SeedsPage() {
  const { t } = useTranslation();
  const { canWrite } = useFeatureAccess("field_calendar");
  const navigate = useNavigate();
  const query = useQuery(seedsQueryOptions());

  const columns = useMemo<ColumnDef<Seed>[]>(
    () => [
      {
        accessorKey: "name",
        header: t("seeds.name"),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name}</span>
        ),
      },
      {
        id: "crop",
        accessorFn: (row) => row.crop.name,
        header: t("seeds.crop"),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.crop.name}
          </span>
        ),
      },
      {
        accessorKey: "quantityKind",
        header: t("seeds.quantityKind"),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {t(`seeds.quantityKinds.${row.original.quantityKind}`)}
          </span>
        ),
        enableSorting: false,
      },
      {
        id: "defaultRate",
        header: t("seeds.defaultRate"),
        cell: ({ row }) =>
          row.original.defaultUnit ? (
            <span className="text-muted-foreground">
              {row.original.defaultAmount != null &&
                `${row.original.defaultAmount} `}
              {t(`fieldCalendar.sowings.units.${row.original.defaultUnit}`)}
            </span>
          ) : (
            <span className="text-muted-foreground">-</span>
          ),
        enableSorting: false,
      },
    ],
    [t],
  );

  const data = query.data?.result ?? [];

  return (
    <PageContent
      title={t("seeds.title")}
      showBackButton={false}
      actions={
        canWrite && (
          <Button
            onClick={() => navigate({ to: "/field-calendar/seeds/create" })}
          >
            {t("common.create")}
          </Button>
        )
      }
    >
      <DataTable
        data={data}
        columns={columns}
        onRowClick={(seed) =>
          navigate({
            to: "/field-calendar/seeds/$seedId",
            params: { seedId: seed.id },
          })
        }
        globalFilterFn={(row, _columnId, filterValue) =>
          row.original.name.toLowerCase().includes(filterValue.toLowerCase())
        }
      />
    </PageContent>
  );
}
