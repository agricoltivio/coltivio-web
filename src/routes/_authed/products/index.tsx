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
  const { canWrite: canWriteProducts } = useFeatureAccess("commerce");
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
        header: t("products.name"),
        cell: ({ row }) => (
          <span className="font-medium">{row.getValue("name")}</span>
        ),
      },
      {
        accessorKey: "category",
        header: t("products.category"),
        cell: ({ row }) => t(`products.categories.${row.getValue("category")}`),
      },
      {
        accessorKey: "pricePerUnit",
        header: t("products.pricePerUnit"),
        cell: ({ row }) => {
          const product = row.original;
          return `${formatCurrency(product.pricePerUnit)} / ${t(`products.units.${product.unit}`)}`;
        },
      },
      {
        accessorKey: "active",
        header: t("orders.status"),
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
    <PageContent
      title={t("products.title")}
      showBackButton={false}
      actions={
        canWriteProducts && (
          <Button onClick={() => navigate({ to: "/products/create" })}>
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
