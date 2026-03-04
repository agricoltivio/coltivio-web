import { useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { cropFamiliesQueryOptions } from "@/api/crops.queries";
import type { CropFamily } from "@/api/types";
import { PageContent } from "@/components/PageContent";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp } from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";

export const Route = createFileRoute("/_authed/field-calendar/crop-families")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(cropFamiliesQueryOptions());
  },
  component: CropFamiliesPage,
});

function CropFamiliesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const query = useQuery(cropFamiliesQueryOptions());

  const columns = useMemo<ColumnDef<CropFamily>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="p-0 has-[>svg]:px-0 hover:bg-transparent justify-start"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("cropFamilies.name")}
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
        accessorKey: "waitingTimeInYears",
        header: t("cropFamilies.waitingTimeInYears"),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.getValue("waitingTimeInYears")}
          </span>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "additionalNotes",
        header: t("cropFamilies.additionalNotes"),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.getValue("additionalNotes") || "-"}
          </span>
        ),
        enableSorting: false,
      },
    ],
    [t],
  );

  const data = query.data?.result ?? [];

  return (
    <PageContent title={t("cropFamilies.title")} showBackButton={false}>
      <div className="flex justify-end mb-4">
        <Button
          onClick={() =>
            navigate({ to: "/field-calendar/crop-families/create" })
          }
        >
          {t("common.create")}
        </Button>
      </div>
      <DataTable
        data={data}
        columns={columns}
        onRowClick={(family) =>
          navigate({
            to: "/field-calendar/crop-families/$familyId",
            params: { familyId: family.id },
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
