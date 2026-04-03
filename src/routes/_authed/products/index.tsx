import { useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { productsQueryOptions } from "@/api/products.queries";
import type { Product } from "@/api/types";
import { PageContent } from "@/components/PageContent";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useFeatureAccess } from "@/lib/useFeatureAccess";
import { type ColumnDef } from "@tanstack/react-table";

export const Route = createFileRoute("/_authed/products/")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(productsQueryOptions());
  },
  component: Products,
});

function Products() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { canWrite: canWriteProducts } = useFeatureAccess("products");
  const productsQuery = useQuery(productsQueryOptions());

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("de-CH", {
      style: "currency",
      currency: "CHF",
    }).format(amount);
  }

  const columns = useMemo<ColumnDef<Product>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="cursor-pointer"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("products.name")}
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
        accessorKey: "category",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="cursor-pointer"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("products.category")}
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ArrowDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => t(`products.categories.${row.getValue("category")}`),
      },
      {
        accessorKey: "pricePerUnit",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="cursor-pointer"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("products.pricePerUnit")}
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ArrowDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => {
          const product = row.original;
          return `${formatCurrency(product.pricePerUnit)} / ${t(`products.units.${product.unit}`)}`;
        },
      },
      {
        accessorKey: "active",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="cursor-pointer"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("orders.status")}
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ArrowDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => {
          const active = row.getValue("active") as boolean;
          return (
            <Badge variant={active ? "default" : "secondary"}>
              {active ? t("products.active") : t("products.inactive")}
            </Badge>
          );
        },
      },
    ],
    [t],
  );

  const data = productsQuery.data?.result ?? [];

  return (
    <PageContent title={t("products.title")} showBackButton={false}>
      <div className="flex justify-end mb-4">
        {canWriteProducts && (
          <Button onClick={() => navigate({ to: "/products/create" })}>
            {t("common.create")}
          </Button>
        )}
      </div>
      <DataTable
        data={data}
        columns={columns}
        onRowClick={(product) =>
          navigate({
            to: "/products/$productId",
            params: { productId: product.id },
          })
        }
        globalFilterFn={(row, _columnId, filterValue) => {
          const product = row.original;
          const searchValue = filterValue.toLowerCase();
          return product.name.toLowerCase().includes(searchValue);
        }}
      />
    </PageContent>
  );
}
