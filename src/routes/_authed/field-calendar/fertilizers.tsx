import { useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { fertilizersQueryOptions } from "@/api/fertilizers.queries";
import type { Fertilizer } from "@/api/types";
import { PageContent } from "@/components/PageContent";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { type ColumnDef } from "@tanstack/react-table";
import { useFeatureAccess } from "@/lib/useFeatureAccess";

export const Route = createFileRoute("/_authed/field-calendar/fertilizers")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(fertilizersQueryOptions());
  },
  component: FertilizersPage,
});

function FertilizersPage() {
  const { t } = useTranslation();
  const { canWrite: canWriteFertilization } = useFeatureAccess("field_calendar");
  const navigate = useNavigate();
  const query = useQuery(fertilizersQueryOptions());

  const columns = useMemo<ColumnDef<Fertilizer>[]>(
    () => [
      {
        accessorKey: "name",
        header: t("fertilizers.name"),
        cell: ({ row }) => (
          <span className="font-medium">{row.getValue("name")}</span>
        ),
      },
      {
        accessorKey: "type",
        header: t("fertilizers.type"),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {t(`fertilizers.types.${row.getValue<string>("type")}`)}
          </span>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "unit",
        header: t("fertilizers.unit"),
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.getValue("unit")}</span>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "description",
        header: t("fertilizers.description"),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.getValue("description") || "-"}
          </span>
        ),
        enableSorting: false,
      },
    ],
    [t],
  );

  const data = query.data?.result ?? [];

  return (
    <PageContent
      title={t("fertilizers.title")}
      showBackButton={false}
      actions={
        canWriteFertilization && (
          <Button
            onClick={() =>
              navigate({ to: "/field-calendar/fertilizers/create" })
            }
          >
            {t("common.create")}
          </Button>
        )
      }
    >
      <DataTable
        data={data}
        columns={columns}
        onRowClick={(fertilizer) =>
          navigate({
            to: "/field-calendar/fertilizers/$fertilizerId",
            params: { fertilizerId: fertilizer.id },
          })
        }
        globalFilterFn={(row, _columnId, filterValue) =>
          row.original.name
            .toLowerCase()
            .includes(filterValue.toLowerCase())
        }
      />
    </PageContent>
  );
}
