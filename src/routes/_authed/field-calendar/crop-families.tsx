import { useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { cropFamiliesQueryOptions } from "@/api/crops.queries";
import type { CropFamily } from "@/api/types";
import { PageContent } from "@/components/PageContent";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { type ColumnDef } from "@tanstack/react-table";
import { useFeatureAccess } from "@/lib/useFeatureAccess";

export const Route = createFileRoute("/_authed/field-calendar/crop-families")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(cropFamiliesQueryOptions());
  },
  component: CropFamiliesPage,
});

function CropFamiliesPage() {
  const { t } = useTranslation();
  const { canWrite: canWriteCrops } = useFeatureAccess("field_calendar");
  const navigate = useNavigate();
  const query = useQuery(cropFamiliesQueryOptions());

  const columns = useMemo<ColumnDef<CropFamily>[]>(
    () => [
      {
        accessorKey: "name",
        header: t("cropFamilies.name"),
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
    <PageContent
      title={t("cropFamilies.title")}
      showBackButton={false}
      actions={
        canWriteCrops && (
          <Button
            onClick={() =>
              navigate({ to: "/field-calendar/crop-families/create" })
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
