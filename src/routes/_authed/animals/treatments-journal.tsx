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
        accessorKey: "startDate",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="p-0 has-[>svg]:px-0 hover:bg-transparent justify-start"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("treatments.startDate")}
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ArrowDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => formatDate(row.getValue("startDate")),
      },
      {
        id: "animals",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="p-0 has-[>svg]:px-0 hover:bg-transparent justify-start"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("treatments.animals")}
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ArrowDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => {
          const animals = row.original.animals;
          const visible = animals.slice(0, 2);
          const overflow = animals.length - visible.length;
          return (
            <span className="font-medium">
              {visible.map((a) => a.name).join(", ")}
              {overflow > 0 && (
                <span className="ml-1 text-xs text-muted-foreground">+{overflow}</span>
              )}
            </span>
          );
        },
      },
      {
        accessorKey: "name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="p-0 has-[>svg]:px-0 hover:bg-transparent justify-start"
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
        cell: ({ row }) => (
          <span className="block max-w-48 truncate">{row.getValue("name")}</span>
        ),
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
            className="p-0 has-[>svg]:px-0 hover:bg-transparent justify-start"
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
            className="p-0 has-[>svg]:px-0 hover:bg-transparent justify-start"
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
            treatment.animals.some((a) => a.name.toLowerCase().includes(searchValue)) ||
            treatment.name.toLowerCase().includes(searchValue) ||
            (treatment.drug?.name?.toLowerCase().includes(searchValue) ?? false)
          );
        }}
        defaultSorting={[{ id: "startDate", desc: true }]}
      />
    </PageContent>
  );
}
