import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ordersQueryOptions } from "@/api/orders.queries";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { OrderStatus } from "@/api/types";

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

  return (
    <PageContent title={t("orders.title")} showBackButton={false}>
      <div className="flex-col">
        <div className="flex justify-end">
          <Button onClick={() => navigate({ to: "/orders/create" })}>
            Erfassen
          </Button>
        </div>
        <Table className="mt-3">
          <TableHeader>
            <TableRow>
              <TableHead>{t("orders.contact")}</TableHead>
              <TableHead>{t("orders.status")}</TableHead>
              <TableHead>{t("orders.orderDate")}</TableHead>
              <TableHead>{t("orders.shippingDate")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordersQuery.data?.result.map((order) => (
              <TableRow
                key={order.id}
                className="cursor-pointer"
                onClick={() =>
                  navigate({
                    to: "/orders/$orderId",
                    params: { orderId: order.id },
                  })
                }
              >
                <TableCell>
                  {order.contact.firstName} {order.contact.lastName}
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(order.status)}>
                    {t(`orders.statuses.${order.status}`)}
                  </Badge>
                </TableCell>
                <TableCell>{formatDate(order.orderDate)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {order.shippingDate ? formatDate(order.shippingDate) : "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </PageContent>
  );
}
