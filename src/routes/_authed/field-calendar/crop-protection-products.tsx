import { useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { cropProtectionProductsQueryOptions } from "@/api/cropProtectionProducts.queries";
import type { CropProtectionProduct } from "@/api/types";
import { PageContent } from "@/components/PageContent";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { type ColumnDef } from "@tanstack/react-table";
import { useFeatureAccess } from "@/lib/useFeatureAccess";

export const Route = createFileRoute(
  "/_authed/field-calendar/crop-protection-products",
)({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(cropProtectionProductsQueryOptions());
  },
  component: CropProtectionProductsPage,
});

function CropProtectionProductsPage() {
  const { t } = useTranslation();
  const { canWrite: canWriteCropProtection } = useFeatureAccess("field_calendar");
  const navigate = useNavigate();
  const query = useQuery(cropProtectionProductsQueryOptions());

  const columns = useMemo<ColumnDef<CropProtectionProduct>[]>(
    () => [
      {
        accessorKey: "name",
        header: t("cropProtectionProducts.name"),
        cell: ({ row }) => (
          <span className="font-medium">{row.getValue("name")}</span>
        ),
      },
      {
        accessorKey: "unit",
        header: t("cropProtectionProducts.unit"),
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.getValue("unit")}</span>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "description",
        header: t("cropProtectionProducts.description"),
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
      title={t("cropProtectionProducts.title")}
      showBackButton={false}
      actions={
        canWriteCropProtection && (
          <Button
            onClick={() =>
              navigate({
                to: "/field-calendar/crop-protection-products/create",
              })
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
        onRowClick={(product) =>
          navigate({
            to: "/field-calendar/crop-protection-products/$cropProtectionProductId",
            params: { cropProtectionProductId: product.id },
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
