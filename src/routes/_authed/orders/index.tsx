import { useMemo, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ordersQueryOptions, invoiceSettingsQueryOptions } from "@/api/orders.queries";
import { InvoiceSettingSelect } from "@/components/InvoiceSettingSelect";
import { apiClient } from "@/api/client";
import type { Order, OrderStatus } from "@/api/types";
import { PageContent } from "@/components/PageContent";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ArrowDown, ArrowUp } from "lucide-react";
import { type ColumnDef, type RowSelectionState } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/_authed/orders/")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(ordersQueryOptions());
    queryClient.ensureQueryData(invoiceSettingsQueryOptions());
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

function downloadBase64File(base64: string, fileName: string) {
  const link = document.createElement("a");
  link.href = `data:application/octet-stream;base64,${base64}`;
  link.download = fileName;
  link.click();
}

function Orders() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const ordersQuery = useQuery(ordersQueryOptions());
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [invoiceModeDialogOpen, setInvoiceModeDialogOpen] = useState(false);
  const [invoiceSettingsId, setInvoiceSettingsId] = useState("");

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString();
  }

  const bulkInvoiceMutation = useMutation({
    mutationFn: async ({
      orderIds,
      mode,
      settingsId,
    }: {
      orderIds: string[];
      mode: "single" | "zip";
      settingsId: string;
    }) => {
      const response = await apiClient.POST("/v1/orders/invoices", {
        body: { orderIds, mode, settingsId },
      });
      if (response.error) throw new Error("Failed to generate invoices");
      return response.data.data;
    },
    onSuccess: ({ base64, fileName }) => {
      downloadBase64File(base64, fileName);
      setInvoiceModeDialogOpen(false);
      setInvoiceSettingsId("");
    },
  });

  const selectedCount = Object.keys(rowSelection).length;
  const allOrders = ordersQuery.data?.result ?? [];

  const columns = useMemo<ColumnDef<Order>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            onClick={(e) => e.stopPropagation()}
          />
        ),
        enableSorting: false,
      },
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
          <Link
            to="/orders/$orderId"
            params={{ orderId: row.original.id }}
            className="font-medium text-blue-600 underline underline-offset-2 hover:text-blue-800"
            onClick={(e) => e.stopPropagation()}
          >
            {row.original.contact.firstName} {row.original.contact.lastName}
          </Link>
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

  const data = allOrders;

  // Derive selected order IDs from row indices
  const selectedOrderIds = Object.keys(rowSelection).map(
    (idx) => allOrders[Number(idx)].id,
  );

  return (
    <PageContent title={t("orders.title")} showBackButton={false}>
      <div className="flex justify-between mb-4">
        <div>
          {selectedCount > 0 && (
            <Button
              variant="outline"
              onClick={() => setInvoiceModeDialogOpen(true)}
            >
              {t("orders.downloadInvoices", { count: selectedCount })}
            </Button>
          )}
        </div>
        <Button onClick={() => navigate({ to: "/orders/create" })}>
          {t("common.create")}
        </Button>
      </div>
      <DataTable
        data={data}
        columns={columns}
        globalFilterFn={(row, _columnId, filterValue) => {
          const order = row.original;
          const searchValue = filterValue.toLowerCase();
          return (
            order.contact.firstName.toLowerCase().includes(searchValue) ||
            order.contact.lastName.toLowerCase().includes(searchValue)
          );
        }}
        defaultSorting={[{ id: "orderDate", desc: true }]}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
      />

      <Dialog open={invoiceModeDialogOpen} onOpenChange={setInvoiceModeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("orders.downloadInvoices", { count: selectedCount })}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium mb-1">{t("orders.invoiceSetting")}</p>
              <InvoiceSettingSelect value={invoiceSettingsId} onChange={setInvoiceSettingsId} />
            </div>
            <p className="text-sm text-muted-foreground">{t("orders.selectInvoiceMode")}</p>
          </div>
          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button
              onClick={() =>
                bulkInvoiceMutation.mutate({ orderIds: selectedOrderIds, mode: "single", settingsId: invoiceSettingsId })
              }
              disabled={bulkInvoiceMutation.isPending || !invoiceSettingsId}
            >
              {t("orders.invoiceModeSingle")}
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                bulkInvoiceMutation.mutate({ orderIds: selectedOrderIds, mode: "zip", settingsId: invoiceSettingsId })
              }
              disabled={bulkInvoiceMutation.isPending || !invoiceSettingsId}
            >
              {t("orders.invoiceModeZip")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContent>
  );
}
