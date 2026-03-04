import { useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { fertilizersQueryOptions } from "@/api/fertilizers.queries";
import type { Fertilizer } from "@/api/types";
import { PageContent } from "@/components/PageContent";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp } from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";

export const Route = createFileRoute("/_authed/field-calendar/fertilizers")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(fertilizersQueryOptions());
  },
  component: FertilizersPage,
});

function FertilizersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const query = useQuery(fertilizersQueryOptions());

  const columns = useMemo<ColumnDef<Fertilizer>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="p-0 has-[>svg]:px-0 hover:bg-transparent justify-start"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("fertilizers.name")}
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
    <PageContent title={t("fertilizers.title")} showBackButton={false}>
      <div className="flex justify-end mb-4">
        <Button
          onClick={() =>
            navigate({ to: "/field-calendar/fertilizers/create" })
          }
        >
          {t("common.create")}
        </Button>
      </div>
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
