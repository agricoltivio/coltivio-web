import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useFeatureAccess } from "@/lib/useFeatureAccess";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { PlusIcon, PencilIcon, TrashIcon, CheckIcon, XIcon } from "lucide-react";
import { orderQueryOptions, invoiceSettingsQueryOptions } from "@/api/orders.queries";
import { InvoiceSettingSelect } from "@/components/InvoiceSettingSelect";
import { activeProductsQueryOptions } from "@/api/products.queries";
import { apiClient } from "@/api/client";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/combobox";
import type { OrderStatus } from "@/api/types";

export const Route = createFileRoute("/_authed/orders/$orderId/")({
  validateSearch: z.object({ returnTo: z.string().optional() }),
  loader: ({ params, context: { queryClient } }) => {
    return Promise.all([
      queryClient.ensureQueryData(orderQueryOptions(params.orderId)),
      queryClient.ensureQueryData(activeProductsQueryOptions()),
      queryClient.ensureQueryData(invoiceSettingsQueryOptions()),
    ]);
  },
  component: OrderDetailPage,
});

function getStatusVariant(status: OrderStatus): "default" | "secondary" | "destructive" | "outline" {
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

type ComboboxOption = { value: string; label: string };

function OrderDetailPage() {
  const { t } = useTranslation();
  const { canWrite: canWriteOrders } = useFeatureAccess("commerce");
  const { orderId } = Route.useParams();
  const { returnTo } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const orderQuery = useQuery(orderQueryOptions(orderId));
  const products = useQuery(activeProductsQueryOptions()).data!;

  // Inline editing state: which item row is open, and its draft values
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState(1);
  const [editPrice, setEditPrice] = useState(0);

  // Invoice download dialog state
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [invoiceSettingsId, setInvoiceSettingsId] = useState("");

  // Add-item row state
  const [addingItem, setAddingItem] = useState(false);
  const [newProductId, setNewProductId] = useState("");
  const [newQty, setNewQty] = useState(1);
  const [newPrice, setNewPrice] = useState(0);

  const productOptions: ComboboxOption[] = products.result.map((p) => ({
    value: p.id,
    label: `${p.name} (${t(`products.units.${p.unit}`)})`,
  }));

  const productPriceMap = new Map<string, number>(
    products.result.map((p) => [p.id, p.pricePerUnit])
  );

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.POST("/v1/orders/byId/{orderId}/confirm", {
        params: { path: { orderId } },
      });
      if (response.error) throw new Error("Failed to confirm order");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
  });

  const fulfillMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.POST("/v1/orders/byId/{orderId}/fulfill", {
        params: { path: { orderId } },
      });
      if (response.error) throw new Error("Failed to fulfill order");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.POST("/v1/orders/byId/{orderId}/cancel", {
        params: { path: { orderId } },
      });
      if (response.error) throw new Error("Failed to cancel order");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
  });

  const patchItemMutation = useMutation({
    mutationFn: async ({
      orderItemId,
      quantity,
      unitPrice,
    }: {
      orderItemId: string;
      quantity: number;
      unitPrice: number;
    }) => {
      const response = await apiClient.PATCH(
        "/v1/orders/byId/{orderId}/items/byId/{orderItemId}",
        {
          params: { path: { orderId, orderItemId } },
          body: { quantity, unitPrice },
        }
      );
      if (response.error) throw new Error("Failed to update item");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setEditingItemId(null);
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (orderItemId: string) => {
      const response = await apiClient.DELETE(
        "/v1/orders/byId/{orderId}/items/byId/{orderItemId}",
        { params: { path: { orderId, orderItemId } } }
      );
      if (response.error) throw new Error("Failed to delete item");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
  });

  const addItemMutation = useMutation({
    mutationFn: async ({
      productId,
      quantity,
    }: {
      productId: string;
      quantity: number;
    }) => {
      const response = await apiClient.POST(
        "/v1/orders/byId/{orderId}/items",
        {
          params: { path: { orderId } },
          body: { productId, quantity },
        }
      );
      if (response.error) throw new Error("Failed to add item");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setAddingItem(false);
      setNewProductId("");
      setNewQty(1);
      setNewPrice(0);
    },
  });

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString();
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("de-CH", {
      style: "currency",
      currency: "CHF",
    }).format(amount);
  }

  function startEditing(itemId: string, quantity: number, unitPrice: number) {
    setEditingItemId(itemId);
    setEditQty(quantity);
    setEditPrice(unitPrice);
  }

  if (orderQuery.isLoading) {
    return (
      <PageContent title={t("common.loading")}>
        <div className="py-8 text-center text-muted-foreground">
          {t("common.loading")}
        </div>
      </PageContent>
    );
  }

  if (orderQuery.error || !orderQuery.data) {
    return (
      <PageContent title={t("common.error")}>
        <div className="py-8 text-center text-destructive">
          {t("common.error")}
        </div>
      </PageContent>
    );
  }

  const order = orderQuery.data;
  const contactName = `${order.contact.firstName} ${order.contact.lastName}`;
  const itemsTotal = order.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const paidTotal = order.payments.reduce((sum, p) => sum + p.amount, 0);
  const isPaid = paidTotal >= itemsTotal && itemsTotal > 0;
  const invoiceMutation = useMutation({
    mutationFn: async (settingsId: string) => {
      const response = await apiClient.POST(
        "/v1/orders/byId/{orderId}/invoice",
        { params: { path: { orderId } }, body: { settingsId } },
      );
      if (response.error) throw new Error("Failed to generate invoice");
      return response.data.data;
    },
    onSuccess: ({ base64, fileName }) => {
      const link = document.createElement("a");
      link.href = `data:application/octet-stream;base64,${base64}`;
      link.download = fileName;
      link.click();
      setInvoiceDialogOpen(false);
      setInvoiceSettingsId("");
    },
  });

  const isActionPending =
    confirmMutation.isPending ||
    fulfillMutation.isPending ||
    cancelMutation.isPending;

  return (
    <PageContent title={t("orders.orderDetails")} showBackButton backTo={() => navigate({ to: returnTo ?? "/orders" })}>
      {/* Header actions */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={getStatusVariant(order.status)}>
            {t(`orders.statuses.${order.status}`)}
          </Badge>
          <Badge variant={isPaid ? "default" : "destructive"}>
            {isPaid ? t("orders.paid") : t("payments.outstanding")}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {canWriteOrders && order.status === "pending" && (
            <>
              <Button
                variant="default"
                onClick={() => confirmMutation.mutate()}
                disabled={isActionPending}
              >
                {t("orders.confirm")}
              </Button>
              <Button
                variant="destructive"
                onClick={() => cancelMutation.mutate()}
                disabled={isActionPending}
              >
                {t("orders.cancel")}
              </Button>
            </>
          )}
          {canWriteOrders && order.status === "confirmed" && (
            <>
              <Button
                variant="default"
                onClick={() => fulfillMutation.mutate()}
                disabled={isActionPending}
              >
                {t("orders.fulfill")}
              </Button>
              <Button
                variant="destructive"
                onClick={() => cancelMutation.mutate()}
                disabled={isActionPending}
              >
                {t("orders.cancel")}
              </Button>
            </>
          )}
          <Button
            variant="outline"
            onClick={() => setInvoiceDialogOpen(true)}
          >
            {t("orders.downloadInvoice")}
          </Button>
          {canWriteOrders && <Button variant="outline" asChild>
            <Link to="/orders/$orderId/edit" params={{ orderId }}>
              {t("common.edit")}
            </Link>
          </Button>}
        </div>
      </div>

      <div className="space-y-6">
        {/* Order Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t("orders.orderDetails")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <DetailItem
                label={t("orders.contact")}
                value={
                  <Link
                    className="hover:underline text-blue-600 hover:text-blue-800"
                    to="/contacts/$contactId"
                    params={{ contactId: order.contact.id }}
                  >
                    {contactName}
                  </Link>
                }
              />
              <DetailItem
                label={t("orders.status")}
                value={t(`orders.statuses.${order.status}`)}
              />
              <DetailItem
                label={t("orders.orderDate")}
                value={formatDate(order.orderDate)}
              />
              <DetailItem
                label={t("orders.shippingDate")}
                value={order.shippingDate ? formatDate(order.shippingDate) : "-"}
              />
              <DetailItem
                label={t("orders.notes")}
                value={order.notes || "-"}
              />
            </div>
          </CardContent>
        </Card>

        {/* Order Items Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t("orders.items")}</CardTitle>
            {canWriteOrders && !addingItem && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAddingItem(true);
                  setNewProductId("");
                  setNewQty(1);
                  setNewPrice(0);
                }}
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                {t("orders.addItem")}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("orders.product")}</TableHead>
                  <TableHead className="text-right">{t("orders.quantity")}</TableHead>
                  <TableHead className="text-right">{t("orders.unitPrice")}</TableHead>
                  <TableHead className="text-right">{t("orders.total")}</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item) =>
                  editingItemId === item.id ? (
                    // Edit row
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.product.name}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min="1"
                          value={editQty}
                          onChange={(e) => setEditQty(Number(e.target.value))}
                          className="w-20 ml-auto"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editPrice}
                          onChange={(e) => setEditPrice(Number(e.target.value))}
                          className="w-24 ml-auto"
                        />
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(editQty * editPrice)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={patchItemMutation.isPending}
                            onClick={() =>
                              patchItemMutation.mutate({
                                orderItemId: item.id,
                                quantity: editQty,
                                unitPrice: editPrice,
                              })
                            }
                          >
                            <CheckIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingItemId(null)}
                          >
                            <XIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    // Display row
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.product.name}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.quantity}{" "}
                        {t(`products.units.${item.product.unit}`)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(item.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </TableCell>
                      <TableCell>
                        {canWriteOrders && <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              startEditing(item.id, item.quantity, item.unitPrice)
                            }
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={deleteItemMutation.isPending}
                            onClick={() => deleteItemMutation.mutate(item.id)}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>}
                      </TableCell>
                    </TableRow>
                  )
                )}

                {/* Add item row */}
                {addingItem && (
                  <TableRow>
                    <TableCell>
                      <Combobox
                        items={productOptions}
                        itemToStringValue={(item: ComboboxOption) => item.label}
                        value={
                          productOptions.find((o) => o.value === newProductId) ??
                          null
                        }
                        onValueChange={(item: ComboboxOption | null) => {
                          setNewProductId(item?.value ?? "");
                          if (item) {
                            const price = productPriceMap.get(item.value);
                            if (price !== undefined) setNewPrice(price);
                          }
                        }}
                      >
                        <ComboboxInput placeholder="-" />
                        <ComboboxContent>
                          <ComboboxEmpty>{t("common.noResults")}</ComboboxEmpty>
                          <ComboboxList>
                            {(option) => (
                              <ComboboxItem key={option.value} value={option}>
                                {option.label}
                              </ComboboxItem>
                            )}
                          </ComboboxList>
                        </ComboboxContent>
                      </Combobox>
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min="1"
                        value={newQty}
                        onChange={(e) => setNewQty(Number(e.target.value))}
                        className="w-20 ml-auto"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newPrice}
                        onChange={(e) => setNewPrice(Number(e.target.value))}
                        className="w-24 ml-auto"
                      />
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {newProductId ? formatCurrency(newQty * newPrice) : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={!newProductId || addItemMutation.isPending}
                          onClick={() =>
                            addItemMutation.mutate({
                              productId: newProductId,
                              quantity: newQty,
                            })
                          }
                        >
                          <CheckIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setAddingItem(false)}
                        >
                          <XIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {/* Empty state (no items and not adding) */}
                {order.items.length === 0 && !addingItem && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-6 text-center text-muted-foreground"
                    >
                      {t("orders.noItems")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
              {order.items.length > 0 && (
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={3} className="font-medium">
                      {t("orders.total")}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(itemsTotal)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </CardContent>
        </Card>

        {/* Payments Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t("contacts.payments")}</CardTitle>
            {canWriteOrders && <Button variant="outline" size="sm" asChild>
              <Link
                to="/orders/$orderId/payments/create"
                params={{ orderId }}
              >
                {t("payments.addPayment")}
              </Link>
            </Button>}
          </CardHeader>
          <CardContent>
            {order.payments && order.payments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("payments.date")}</TableHead>
                    <TableHead>{t("payments.amount")}</TableHead>
                    <TableHead>{t("payments.method")}</TableHead>
                    <TableHead>{t("payments.notes")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.payments.map((payment) => (
                    <TableRow
                      key={payment.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() =>
                        navigate({
                          to: "/orders/$orderId/payments/$paymentId",
                          params: { orderId, paymentId: payment.id },
                        })
                      }
                    >
                      <TableCell>{formatDate(payment.date)}</TableCell>
                      <TableCell>{formatCurrency(payment.amount)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {t(`payments.methods.${payment.method}`)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {payment.notes || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={3} className="font-medium">
                      {t("orders.paid")}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(paidTotal)} / {formatCurrency(itemsTotal)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            ) : (
              <div className="py-6 text-center text-muted-foreground">
                {t("payments.noPayments")}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("orders.downloadInvoice")}</DialogTitle>
          </DialogHeader>
          <div>
            <p className="text-sm font-medium mb-1">{t("orders.invoiceSetting")}</p>
            <InvoiceSettingSelect value={invoiceSettingsId} onChange={setInvoiceSettingsId} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => invoiceMutation.mutate(invoiceSettingsId)}
              disabled={!invoiceSettingsId || invoiceMutation.isPending}
            >
              {invoiceMutation.isPending ? t("common.loading") : t("orders.downloadInvoice")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContent>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm">{value}</dd>
    </div>
  );
}
