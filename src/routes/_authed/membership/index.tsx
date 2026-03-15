import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { z } from "zod";
import { membershipStatusQueryOptions, membershipPaymentsQueryOptions } from "@/api/membership.queries";
import { meQueryOptions } from "@/api/user.queries";
import { farmQueryOptions } from "@/api/farm.queries";
import { checkActiveMembership } from "@/lib/membership";
import { apiClient } from "@/api/client";
import type { MembershipPayment } from "@/api/types";
import { PageContent } from "@/components/PageContent";
import { MembershipExpired } from "@/components/MembershipExpired";
import { MembershipPaywall } from "@/components/MembershipPaywall";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authed/membership/")({
  validateSearch: z.object({ membership: z.string().optional() }),
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(membershipStatusQueryOptions());
    queryClient.ensureQueryData(membershipPaymentsQueryOptions());
  },
  component: MembershipPage,
});

function MembershipPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { membership: membershipSuccess } = Route.useSearch();
  const [isLoadingPaymentMethod, setIsLoadingPaymentMethod] = useState(false);
  const [isLoadingSubscribe, setIsLoadingSubscribe] = useState(false);
  const [showSubscribeDialog, setShowSubscribeDialog] = useState(false);
  const showSuccessDialog = membershipSuccess === "success";

  function closeSuccessDialog() {
    void navigate({ to: "/membership", replace: true });
  }

  const meQuery = useQuery(meQueryOptions());
  const farmQuery = useQuery(farmQueryOptions());
  const isOwner = meQuery.data?.farmRole === "owner";

  const farmMembership = farmQuery.data?.membership;
  const hasActiveMembership = checkActiveMembership(farmMembership);
  const isExpired =
    !hasActiveMembership &&
    (!!farmMembership?.lastPeriodEnd || !!farmMembership?.trialEnd);

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
      queryClient.invalidateQueries({ queryKey: ["farm"] });
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
      queryClient.invalidateQueries({ queryKey: ["farm"] });
    },
  });

  // Stripe checkout for trial users converting to paid subscription
  async function handleSubscribeFromTrial() {
    setIsLoadingSubscribe(true);
    setShowSubscribeDialog(false);
    try {
      const response = await apiClient.POST("/v1/membership/checkout/subscription", {
        body: {
          successUrl: `${window.location.href.split("?")[0]}?membership=success`,
          cancelUrl: window.location.href,
        },
      });
      if (response.error || !response.data) throw new Error("Checkout failed");
      window.location.href = response.data.data.url;
    } catch {
      setIsLoadingSubscribe(false);
    }
  }

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

  // Show paywall/expired screens inline (membership page is accessible to all)
  if (!farmQuery.isLoading && isExpired) {
    return <MembershipExpired />;
  }
  if (!farmQuery.isLoading && !hasActiveMembership) {
    return <MembershipPaywall />;
  }

  const status = statusQuery.data;
  // Filter out $0 Stripe invoices generated when subscribing during a trial
  const payments = (paymentsQuery.data?.result ?? []).filter((p) => p.amount > 0);

  const dateFormatter = new Intl.DateTimeFormat(i18n.language, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const periodEndDate = status?.lastPeriodEnd
    ? dateFormatter.format(new Date(status.lastPeriodEnd as string))
    : null;

  const trialEndDate = status?.trialEnd
    ? dateFormatter.format(new Date(status.trialEnd as string))
    : null;

  const isTrial = !!trialEndDate && !periodEndDate;
  // Subscribed during trial: $0 Stripe period ends at trialEnd, then auto-renews
  const isSubscribedDuringTrial = !!trialEndDate && !!periodEndDate;
  const isActive = !!periodEndDate || !!trialEndDate;

  const isMutating = cancelMutation.isPending || reactivateMutation.isPending;

  return (
    <PageContent title={t("membership.title")}>
      {/* Status card */}
      <div className="border rounded-lg p-6 mb-8 bg-white max-w-xl">
        <div className="flex items-center gap-3 mb-2">
          <span className="font-semibold">{t("membership.status.label")}:</span>
          {isActive ? (
            <Badge variant="default">
              {isTrial || isSubscribedDuringTrial
                ? t("membership.status.trial")
                : t("membership.status.active")}
            </Badge>
          ) : (
            <Badge variant="secondary">{t("membership.status.inactive")}</Badge>
          )}
          {isSubscribedDuringTrial && (
            <Badge variant="outline">{t("membership.status.autoRenewing")}</Badge>
          )}
          {!isTrial && !isSubscribedDuringTrial && (status?.cancelAtPeriodEnd ? (
            <Badge variant="outline">{t("membership.status.cancelsAtPeriodEnd")}</Badge>
          ) : status?.autoRenewing ? (
            <Badge variant="outline">{t("membership.status.autoRenewing")}</Badge>
          ) : null)}
        </div>
        {(isTrial || isSubscribedDuringTrial) && trialEndDate && (
          <p className="text-sm text-muted-foreground mb-4">
            {isSubscribedDuringTrial
              ? t("membership.status.subscriptionStartsAfterTrial", { date: trialEndDate })
              : `${t("membership.status.trialEnds")}: ${trialEndDate}`}
          </p>
        )}
        {!isTrial && !isSubscribedDuringTrial && periodEndDate && (
          <p className="text-sm text-muted-foreground mb-4">
            {t("membership.status.validUntil")}: {periodEndDate}
          </p>
        )}
        {isOwner ? (
          <div className="flex flex-wrap gap-3">
            {isTrial && !isSubscribedDuringTrial ? (
              <Button onClick={() => setShowSubscribeDialog(true)} disabled={isLoadingSubscribe}>
                {isLoadingSubscribe ? t("common.loading") : t("membership.becomeMember")}
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={handleUpdatePaymentMethod}
                  disabled={isLoadingPaymentMethod}
                >
                  {isLoadingPaymentMethod ? t("common.loading") : t("membership.updatePaymentMethod")}
                </Button>
                {isActive && status?.cancelAtPeriodEnd && (
                  <Button
                    variant="outline"
                    onClick={() => reactivateMutation.mutate()}
                    disabled={isMutating}
                  >
                    {reactivateMutation.isPending ? t("common.loading") : t("membership.reactivate")}
                  </Button>
                )}
                {isActive && !status?.cancelAtPeriodEnd && (
                  <Button
                    variant="ghost"
                    onClick={() => cancelMutation.mutate()}
                    disabled={isMutating}
                  >
                    {cancelMutation.isPending ? t("common.loading") : t("membership.cancelRenewal")}
                  </Button>
                )}
              </>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("membership.ownerOnlyManagement")}
          </p>
        )}

        <Dialog open={showSubscribeDialog} onOpenChange={setShowSubscribeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("membership.subscribeDialog.title")}</DialogTitle>
              <DialogDescription>
                {t("membership.subscribeDialog.description", { date: trialEndDate })}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSubscribeDialog(false)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleSubscribeFromTrial}>
                {t("membership.becomeMember")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Membership success dialog shown after Stripe checkout redirect */}
      <Dialog open={showSuccessDialog} onOpenChange={(open) => { if (!open) closeSuccessDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("membership.membershipSuccess.title")}</DialogTitle>
            <DialogDescription>
              {t("membership.membershipSuccess.description")}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("membership.membershipSuccess.treffpunkt")}</p>
          <p className="text-sm text-muted-foreground">{t("membership.membershipSuccess.features")}</p>
          <DialogFooter>
            <Button variant="outline" onClick={closeSuccessDialog}>
              {t("membership.membershipSuccess.close")}
            </Button>
            <Button onClick={() => { void navigate({ to: "/treffpunkt", replace: true }); }}>
              {t("membership.membershipSuccess.communityCta")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment history */}
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
          {payments.length === 0 ? (
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
    </PageContent>
  );
}
