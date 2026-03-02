import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { orderQueryOptions } from "@/api/orders.queries";
import { apiClient } from "@/api/client";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import type { OrderStatus } from "@/api/types";

export const Route = createFileRoute("/_authed/orders/$orderId/")({
  loader: ({ params, context: { queryClient } }) => {
    return queryClient.ensureQueryData(orderQueryOptions(params.orderId));
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

function OrderDetailPage() {
  const { t } = useTranslation();
  const { orderId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const orderQuery = useQuery(orderQueryOptions(orderId));

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.POST("/v1/orders/byId/{orderId}/confirm", {
        params: { path: { orderId } },
      });
      if (response.error) {
        throw new Error("Failed to confirm order");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  const fulfillMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.POST("/v1/orders/byId/{orderId}/fulfill", {
        params: { path: { orderId } },
      });
      if (response.error) {
        throw new Error("Failed to fulfill order");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.POST("/v1/orders/byId/{orderId}/cancel", {
        params: { path: { orderId } },
      });
      if (response.error) {
        throw new Error("Failed to cancel order");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
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
  const isActionPending =
    confirmMutation.isPending ||
    fulfillMutation.isPending ||
    cancelMutation.isPending;

  return (
    <PageContent title={t("orders.orderDetails")} showBackButton backTo={() => navigate({ to: "/orders" })}>
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
          {/* Status action buttons based on current status */}
          {order.status === "pending" && (
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
          {order.status === "confirmed" && (
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
          <Button variant="outline" asChild>
            <Link to="/orders/$orderId/edit" params={{ orderId }}>
              {t("common.edit")}
            </Link>
          </Button>
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
          <CardHeader>
            <CardTitle>{t("orders.items")}</CardTitle>
          </CardHeader>
          <CardContent>
            {order.items.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("orders.product")}</TableHead>
                    <TableHead className="text-right">{t("orders.quantity")}</TableHead>
                    <TableHead className="text-right">{t("orders.unitPrice")}</TableHead>
                    <TableHead className="text-right">{t("orders.total")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.product.name}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.quantity} {t(`products.units.${item.product.unit}`)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(item.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={3} className="font-medium">
                      {t("orders.total")}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(itemsTotal)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            ) : (
              <div className="py-6 text-center text-muted-foreground">
                {t("orders.noItems")}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payments Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t("contacts.payments")}</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link
                to="/payments/create"
                search={{
                  contactId: order.contactId,
                  orderId: order.id,
                  redirect: `/orders/${orderId}`,
                }}
              >
                {t("payments.addPayment")}
              </Link>
            </Button>
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
                    <TableRow key={payment.id}>
                      <TableCell>{formatDate(payment.date)}</TableCell>
                      <TableCell>
                        {formatCurrency(payment.amount)}
                      </TableCell>
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
