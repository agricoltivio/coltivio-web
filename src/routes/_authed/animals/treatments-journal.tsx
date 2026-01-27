import { treatmentsQueryOptions } from "@/api/treatments.queries";
import type { Treatment } from "@/api/types";
import { DataTable } from "@/components/DataTable";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { type ColumnDef } from "@tanstack/react-table";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_authed/animals/treatments-journal")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(treatmentsQueryOptions());
  },
  component: TreatmentsJournal,
});

function TreatmentsJournal() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const treatmentsQuery = useQuery(treatmentsQueryOptions());

  function formatDate(dateString: string | null) {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString();
  }

  const columns = useMemo<ColumnDef<Treatment>[]>(
    () => [
      {
        accessorKey: "date",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="p-0 hover:bg-transparent justify-start"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("treatments.date")}
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ArrowDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => formatDate(row.getValue("date")),
      },
      {
        accessorKey: "animal.name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="p-0 hover:bg-transparent justify-start"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("treatments.animal")}
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ArrowDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.animal.name}</span>
        ),
      },
      {
        accessorKey: "name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="p-0 hover:bg-transparent justify-start"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("treatments.name")}
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ArrowDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => row.getValue("name"),
      },
      {
        accessorKey: "reason",
        header: t("treatments.reason"),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.getValue("reason")}
          </span>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "drug.name",
        header: t("treatments.drug"),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.drug?.name || "-"}
          </span>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "milkUsableDate",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="p-0 hover:bg-transparent justify-start"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("treatments.milkUsableDate")}
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ArrowDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {formatDate(row.getValue("milkUsableDate"))}
          </span>
        ),
      },
      {
        accessorKey: "meatUsableDate",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="p-0 hover:bg-transparent justify-start"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("treatments.meatUsableDate")}
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ArrowDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {formatDate(row.getValue("meatUsableDate"))}
          </span>
        ),
      },
    ],
    [t],
  );

  const data = treatmentsQuery.data?.result ?? [];

  return (
    <PageContent title={t("treatments.title")} showBackButton={false}>
      <div className="flex justify-end mb-4">
        <Button onClick={() => navigate({ to: "/treatments/create" })}>
          {t("treatments.addTreatment")}
        </Button>
      </div>
      <DataTable
        data={data}
        columns={columns}
        onRowClick={(treatment) =>
          navigate({
            to: "/treatments/$treatmentId",
            params: { treatmentId: treatment.id },
          })
        }
        globalFilterFn={(row, _columnId, filterValue) => {
          const treatment = row.original;
          const searchValue = filterValue.toLowerCase();
          return (
            treatment.animal.name.toLowerCase().includes(searchValue) ||
            treatment.name.toLowerCase().includes(searchValue) ||
            (treatment.drug?.name?.toLowerCase().includes(searchValue) ?? false)
          );
        }}
        defaultSorting={[{ id: "date", desc: true }]}
      />
    </PageContent>
  );
}
