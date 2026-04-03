import { useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { drugsQueryOptions } from "@/api/drugs.queries";
import type { Drug } from "@/api/types";
import { PageContent } from "@/components/PageContent";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp } from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";
import { useFeatureAccess } from "@/lib/useFeatureAccess";

export const Route = createFileRoute("/_authed/drugs/")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(drugsQueryOptions());
  },
  component: Drugs,
});

function Drugs() {
  const { t } = useTranslation();
  const { canWrite: canWriteTreatments } = useFeatureAccess("animals");
  const navigate = useNavigate();
  const drugsQuery = useQuery(drugsQueryOptions());

  const columns = useMemo<ColumnDef<Drug>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="p-0 has-[>svg]:px-0 hover:bg-transparent justify-start"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("drugs.name")}
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
        accessorKey: "drugTreatment",
        header: t("drugs.animalTypes"),
        cell: ({ row }) => {
          const drug = row.original;
          return (
            <span className="text-muted-foreground">
              {drug.drugTreatment
                .map((dt) => t(`animals.types.${dt.animalType}`))
                .join(", ") || "-"}
            </span>
          );
        },
        enableSorting: false,
      },
      {
        accessorKey: "notes",
        header: t("drugs.notes"),
        cell: ({ row }) => (
          <span className="text-muted-foreground max-w-xs truncate">
            {row.getValue("notes") || "-"}
          </span>
        ),
        enableSorting: false,
      },
    ],
    [t],
  );

  const data = drugsQuery.data?.result ?? [];

  return (
    <PageContent title={t("drugs.title")} showBackButton={false}>
      {canWriteTreatments && (
        <div className="flex justify-end mb-4">
          <Button onClick={() => navigate({ to: "/drugs/create" })}>
            {t("common.create")}
          </Button>
        </div>
      )}
      <DataTable
        data={data}
        columns={columns}
        onRowClick={(drug) =>
          navigate({
            to: "/drugs/$drugId",
            params: { drugId: drug.id },
          })
        }
        globalFilterFn={(row, _columnId, filterValue) => {
          const drug = row.original;
          const searchValue = filterValue.toLowerCase();
          return drug.name.toLowerCase().includes(searchValue);
        }}
      />
    </PageContent>
  );
}
