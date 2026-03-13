import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { membershipStatusQueryOptions, membershipPaymentsQueryOptions } from "@/api/membership.queries";
import { apiClient } from "@/api/client";
import type { MembershipPayment } from "@/api/types";
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

export const Route = createFileRoute("/_authed/membership/")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(membershipStatusQueryOptions());
    queryClient.ensureQueryData(membershipPaymentsQueryOptions());
  },
  component: MembershipPage,
});

function MembershipPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [isLoadingPaymentMethod, setIsLoadingPaymentMethod] = useState(false);

  const statusQuery = useQuery(membershipStatusQueryOptions());
  const paymentsQuery = useQuery(membershipPaymentsQueryOptions());

  // Cancel subscription (sets cancelAtPeriodEnd = true)
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.DELETE("/v1/membership/subscription");
      if (response.error) throw new Error("Failed to cancel subscription");
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["membership", "status"] });
    },
  });

  // Reactivate subscription (sets cancelAtPeriodEnd = false)
  const reactivateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.POST("/v1/membership/subscription", { body: {} });
      if (response.error) throw new Error("Failed to reactivate subscription");
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["membership", "status"] });
    },
  });

  // Open Stripe payment method update flow
  async function handleUpdatePaymentMethod() {
    setIsLoadingPaymentMethod(true);
    try {
      const response = await apiClient.POST("/v1/membership/paymentMethod", {
        body: {
          successUrl: window.location.href,
          cancelUrl: window.location.href,
        },
      });
      if (response.error || !response.data) throw new Error("Failed to get payment method URL");
      window.location.href = response.data.data.url;
    } catch {
      setIsLoadingPaymentMethod(false);
    }
  }

  const status = statusQuery.data;
  const payments = paymentsQuery.data?.result ?? [];

  const dateFormatter = new Intl.DateTimeFormat(i18n.language, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const periodEndDate = status?.currentPeriodEnd
    ? dateFormatter.format(new Date(status.currentPeriodEnd as string))
    : null;

  const isMutating = cancelMutation.isPending || reactivateMutation.isPending;

  return (
    <PageContent title={t("membership.title")}>
      {/* Status card */}
      <div className="border rounded-lg p-6 mb-8 bg-white max-w-xl">
        <div className="flex items-center gap-3 mb-2">
          <span className="font-semibold">{t("membership.status.label")}:</span>
          {status?.active ? (
            <Badge variant="default">{t("membership.status.active")}</Badge>
          ) : (
            <Badge variant="secondary">{t("membership.status.inactive")}</Badge>
          )}
          {status?.cancelAtPeriodEnd ? (
            <Badge variant="outline">{t("membership.status.cancelsAtPeriodEnd")}</Badge>
          ) : status?.autoRenewing ? (
            <Badge variant="outline">{t("membership.status.autoRenewing")}</Badge>
          ) : null}
        </div>
        {periodEndDate && (
          <p className="text-sm text-muted-foreground mb-4">
            {t("membership.status.validUntil")}: {periodEndDate}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={handleUpdatePaymentMethod}
            disabled={isLoadingPaymentMethod}
          >
            {isLoadingPaymentMethod ? t("common.loading") : t("membership.updatePaymentMethod")}
          </Button>
          {status?.active && status.cancelAtPeriodEnd && (
            <Button
              variant="outline"
              onClick={() => reactivateMutation.mutate()}
              disabled={isMutating}
            >
              {reactivateMutation.isPending ? t("common.loading") : t("membership.reactivate")}
            </Button>
          )}
          {status?.active && !status.cancelAtPeriodEnd && (
            <Button
              variant="ghost"
              onClick={() => cancelMutation.mutate()}
              disabled={isMutating}
            >
              {cancelMutation.isPending ? t("common.loading") : t("membership.cancelRenewal")}
            </Button>
          )}
        </div>
      </div>

      {/* Payment history */}
      <h2 className="text-lg font-semibold mb-4">{t("membership.paymentHistory")}</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("membership.payments.date")}</TableHead>
            <TableHead>{t("membership.payments.amount")}</TableHead>
            <TableHead>{t("membership.payments.currency")}</TableHead>
            <TableHead>{t("membership.payments.status")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
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
                <TableCell>{payment.amount.toFixed(2)}</TableCell>
                <TableCell>{payment.currency.toUpperCase()}</TableCell>
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
    </PageContent>
  );
}
