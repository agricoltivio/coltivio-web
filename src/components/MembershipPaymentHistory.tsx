import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { membershipPaymentsQueryOptions } from "@/api/membership.queries";
import type { MembershipPayment } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Shared "Beitragshistorie" table — used both on the in-app membership page and on the
// full-screen returning-member view.
export function MembershipPaymentHistory() {
  const { t, i18n } = useTranslation();
  const paymentsQuery = useQuery(membershipPaymentsQueryOptions());

  // Only show real charges (defensive: skip any $0 Stripe invoices)
  const payments = (paymentsQuery.data?.result ?? []).filter((payment) => payment.amount > 0);

  const dateFormatter = new Intl.DateTimeFormat(i18n.language, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <h2 className="text-lg font-semibold mb-4">{t("membership.paymentHistory")}</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("membership.payments.date")}</TableHead>
            <TableHead>{t("membership.payments.amount")}</TableHead>
            <TableHead>{t("membership.payments.currency")}</TableHead>
            <TableHead>{t("membership.payments.card")}</TableHead>
            <TableHead>{t("membership.payments.status")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paymentsQuery.isLoading ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                {t("common.loading")}
              </TableCell>
            </TableRow>
          ) : payments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                {t("common.noResults")}
              </TableCell>
            </TableRow>
          ) : (
            payments.map((payment: MembershipPayment) => (
              <TableRow key={payment.id}>
                <TableCell>
                  {payment.createdAt
                    ? dateFormatter.format(new Date(payment.createdAt as string))
                    : "—"}
                </TableCell>
                <TableCell>{(payment.amount / 100).toFixed(2)}</TableCell>
                <TableCell>{payment.currency.toUpperCase()}</TableCell>
                <TableCell className="font-mono text-sm">
                  {payment.cardBrand && payment.cardLast4
                    ? `${payment.cardBrand} **** ${payment.cardLast4}`
                    : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={payment.status === "succeeded" ? "default" : "secondary"}>
                    {t(`membership.payments.statuses.${payment.status}`)}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </>
  );
}
