import { useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ordersQueryOptions } from "@/api/orders.queries";
import type { Order, OrderStatus } from "@/api/types";
import { PageContent } from "@/components/PageContent";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp } from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";

export const Route = createFileRoute("/_authed/orders/")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(ordersQueryOptions());
  },
  component: Orders,
});

function getStatusVariant(
  status: OrderStatus,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "pending":
      return "outline";
    case "confirmed":
      return "default";
    case "fulfilled":
      return "secondary";
    case "cancelled":
      return "destructive";
  }
}

function Orders() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const ordersQuery = useQuery(ordersQueryOptions());

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString();
  }

  const columns = useMemo<ColumnDef<Order>[]>(
    () => [
      {
        accessorKey: "contact.firstName",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="p-0 has-[>svg]:px-0 hover:bg-transparent justify-start"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("orders.contact")}
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ArrowDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.contact.firstName} {row.original.contact.lastName}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="p-0 has-[>svg]:px-0 hover:bg-transparent justify-start"
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
          const status = row.getValue("status") as OrderStatus;
          return (
            <Badge variant={getStatusVariant(status)}>
              {t(`orders.statuses.${status}`)}
            </Badge>
          );
        },
      },
      {
        accessorKey: "orderDate",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="p-0 has-[>svg]:px-0 hover:bg-transparent justify-start"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("orders.orderDate")}
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ArrowDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => formatDate(row.getValue("orderDate")),
      },
      {
        accessorKey: "shippingDate",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="p-0 has-[>svg]:px-0 hover:bg-transparent justify-start"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("orders.shippingDate")}
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ArrowDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => {
          const shippingDate = row.getValue("shippingDate") as string | null;
          return (
            <span className="text-muted-foreground">
              {shippingDate ? formatDate(shippingDate) : "-"}
            </span>
          );
        },
      },
      {
        id: "paid",
        header: t("orders.paid"),
        cell: ({ row }) => (
          <Badge variant={row.original.paidInFull ? "default" : "destructive"}>
            {row.original.paidInFull ? t("common.yes") : t("common.no")}
          </Badge>
        ),
        enableSorting: false,
      },
      {
        id: "products",
        header: t("orders.products"),
        cell: ({ row }) => {
          // Aggregate quantities per product name
          const productCounts = new Map<string, number>();
          for (const item of row.original.items) {
            productCounts.set(
              item.product.name,
              (productCounts.get(item.product.name) ?? 0) + item.quantity,
            );
          }
          const entries = Array.from(productCounts.entries());
          if (entries.length === 0)
            return <span className="text-muted-foreground">-</span>;
          return (
            <span>
              {entries.map(([name, qty]) => `${name} (${qty})`).join(", ")}
            </span>
          );
        },
      },
    ],
    [t],
  );

  const data = ordersQuery.data?.result ?? [];

  return (
    <PageContent title={t("orders.title")} showBackButton={false}>
      <div className="flex justify-end mb-4">
        <Button onClick={() => navigate({ to: "/orders/create" })}>
          {t("common.create")}
        </Button>
      </div>
      <DataTable
        data={data}
        columns={columns}
        onRowClick={(order) =>
          navigate({
            to: "/orders/$orderId",
            params: { orderId: order.id },
          })
        }
        globalFilterFn={(row, _columnId, filterValue) => {
          const order = row.original;
          const searchValue = filterValue.toLowerCase();
          return (
            order.contact.firstName.toLowerCase().includes(searchValue) ||
            order.contact.lastName.toLowerCase().includes(searchValue)
          );
        }}
        defaultSorting={[{ id: "orderDate", desc: true }]}
      />
    </PageContent>
  );
}
