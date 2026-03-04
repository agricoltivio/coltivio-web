import { useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { cropProtectionProductsQueryOptions } from "@/api/cropProtectionProducts.queries";
import type { CropProtectionProduct } from "@/api/types";
import { PageContent } from "@/components/PageContent";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp } from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";

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
  const navigate = useNavigate();
  const query = useQuery(cropProtectionProductsQueryOptions());

  const columns = useMemo<ColumnDef<CropProtectionProduct>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="p-0 has-[>svg]:px-0 hover:bg-transparent justify-start"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("cropProtectionProducts.name")}
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
    >
      <div className="flex justify-end mb-4">
        <Button
          onClick={() =>
            navigate({
              to: "/field-calendar/crop-protection-products/create",
            })
          }
        >
          {t("common.create")}
        </Button>
      </div>
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
