import { useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { drugsQueryOptions } from "@/api/drugs.queries";
import type { Drug } from "@/api/types";
import { PageContent } from "@/components/PageContent";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
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
        header: t("drugs.name"),
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
    <PageContent
      title={t("drugs.title")}
      showBackButton={false}
      actions={
        canWriteTreatments && (
          <Button onClick={() => navigate({ to: "/drugs/create" })}>
            {t("common.create")}
          </Button>
        )
      }
    >
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
