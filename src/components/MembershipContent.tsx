import { useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { membershipStatusQueryOptions, membershipPaymentsQueryOptions } from "@/api/membership.queries";
import { farmQueryOptions } from "@/api/farm.queries";
import { meQueryOptions } from "@/api/user.queries";
import { checkActiveMembership, checkUserActiveMembership } from "@/lib/membership";
import { apiClient } from "@/api/client";
import type { MembershipPayment } from "@/api/types";
import { PageContent } from "@/components/PageContent";
import { MembershipExpired } from "@/components/MembershipExpired";
import { MembershipPaywall } from "@/components/MembershipPaywall";
import { StatutenDialog } from "@/components/StatutenDialog";
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

interface MembershipContentProps {
  membershipSuccess: string | undefined;
}

export function MembershipContent({ membershipSuccess }: MembershipContentProps) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isLoadingPaymentMethod, setIsLoadingPaymentMethod] = useState(false);
  const [isLoadingSubscribe, setIsLoadingSubscribe] = useState(false);
  // subscribeDialog: shown to trial users who want to convert to paid
  const [showSubscribeDialog, setShowSubscribeDialog] = useState(false);
  // statutenDialog: shown before proceeding from subscribeDialog
  const [showStatutenForSubscribe, setShowStatutenForSubscribe] = useState(false);
  // Austritt (cancel) confirmation dialog
  const [showAustrittDialog, setShowAustrittDialog] = useState(false);
  const showSuccessDialog = membershipSuccess === "success";

  function closeSuccessDialog() {
    void navigate({ to: "/membership", replace: true });
  }

  const meQuery = useQuery(meQueryOptions());
  const farmQuery = useQuery(farmQueryOptions(meQuery.data?.farmId != null));
  const statusQuery = useQuery(membershipStatusQueryOptions());

  const farmMembership = farmQuery.data?.membership;
  const farmHasActiveMembership = checkActiveMembership(farmMembership);

  // Gate on the user's own membership, not the farm's effective membership
  const userHasActiveMembership = checkUserActiveMembership(statusQuery.data);
  const userIsExpired =
    !userHasActiveMembership &&
    (!!statusQuery.data?.lastPeriodEnd || !!statusQuery.data?.trialEnd);
  const paymentsQuery = useQuery(membershipPaymentsQueryOptions());

  // Austritt erklären (sets cancelAtPeriodEnd = true)
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.DELETE("/v1/membership/subscription");
      if (response.error) throw new Error("Failed to cancel subscription");
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["membership", "status"] });
      queryClient.invalidateQueries({ queryKey: ["farm"] });
      setShowAustrittDialog(false);
    },
  });

  // Austritt zurückziehen (sets cancelAtPeriodEnd = false)
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

  // Stripe checkout for trial users converting to paid — triggered after statutes acceptance
  async function handleSubscribeFromTrial(autoRenew: boolean) {
    setIsLoadingSubscribe(true);
    setShowStatutenForSubscribe(false);
    try {
      const endpoint = autoRenew
        ? "/v1/membership/checkout/subscription"
        : "/v1/membership/checkout/manual";
      const response = await apiClient.POST(endpoint, {
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

  // Show paywall/expired screens based on the user's own membership
  if (!statusQuery.isLoading && userIsExpired) {
    return <MembershipExpired farmHasMembership={farmHasActiveMembership} />;
  }
  if (!statusQuery.isLoading && !userHasActiveMembership) {
    return <MembershipPaywall farmHasMembership={farmHasActiveMembership} />;
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
              {isTrial ? t("membership.status.trial") : t("membership.status.active")}
            </Badge>
          ) : (
            <Badge variant="secondary">{t("membership.status.inactive")}</Badge>
          )}
          {/* Only show the cancelsAtPeriodEnd badge when active, not in trial, and auto-renewing (one-time payments always expire) */}
          {!isTrial && !isSubscribedDuringTrial && status?.cancelAtPeriodEnd && status?.autoRenewing && (
            <Badge variant="outline">{t("membership.status.cancelsAtPeriodEnd")}</Badge>
          )}
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
            {status?.cancelledByUser
              ? t("membership.status.cancelledByUser", { date: periodEndDate })
              : status?.autoRenewing && !status?.cancelAtPeriodEnd
                ? t("membership.status.autoRenewsOn", { date: periodEndDate })
                : `${t("membership.status.validUntil")}: ${periodEndDate}`}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          {isTrial && !isSubscribedDuringTrial ? (
            <Button onClick={() => setShowSubscribeDialog(true)} disabled={isLoadingSubscribe}>
              {isLoadingSubscribe ? t("common.loading") : t("membership.becomeMember")}
            </Button>
          ) : (
            <>
              {/* Hide payment method update if cancelled — no ongoing subscription to update */}
              {!status?.cancelledByUser && (
                <Button
                  variant="outline"
                  onClick={handleUpdatePaymentMethod}
                  disabled={isLoadingPaymentMethod}
                >
                  {isLoadingPaymentMethod ? t("common.loading") : t("membership.updatePaymentMethod")}
                </Button>
              )}
              {isActive && (status?.cancelAtPeriodEnd || status?.cancelledByUser) && (
                <Button
                  variant="outline"
                  onClick={() => reactivateMutation.mutate()}
                  disabled={isMutating}
                >
                  {reactivateMutation.isPending ? t("common.loading") : t("membership.reactivate")}
                </Button>
              )}
              {isActive && !status?.cancelledByUser && (
                <Button
                  variant="ghost"
                  onClick={() => setShowAustrittDialog(true)}
                  disabled={isMutating}
                >
                  {t("membership.cancelRenewal")}
                </Button>
              )}
            </>
          )}
        </div>

        {/* subscribeDialog: trial → paid conversion, opens StatutenDialog before checkout */}
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
              <Button onClick={() => { setShowSubscribeDialog(false); setShowStatutenForSubscribe(true); }}>
                {t("membership.becomeMember")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Austritt confirmation dialog with Art. 6 explanation */}
        <Dialog open={showAustrittDialog} onOpenChange={setShowAustrittDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("membership.cancelDialog.title")}</DialogTitle>
              <DialogDescription>
                {t("membership.cancelDialog.description")}
              </DialogDescription>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              {t("membership.cancelDialog.art6Note", { date: periodEndDate ?? "" })}
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAustrittDialog(false)}>
                {t("common.cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? t("common.loading") : t("membership.cancelDialog.confirm")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statuten acceptance for trial→paid conversion */}
      <StatutenDialog
        open={showStatutenForSubscribe}
        onOpenChange={setShowStatutenForSubscribe}
        onConfirm={handleSubscribeFromTrial}
        isLoading={isLoadingSubscribe}
      />

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

      {/* Beitragshistorie */}
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
