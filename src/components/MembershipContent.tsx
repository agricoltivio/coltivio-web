import { useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { membershipStatusQueryOptions } from "@/api/membership.queries";
import {
  checkUserActiveMembership,
  checkUserGracePeriod,
  checkWasEverMember,
} from "@/lib/membership";
import { apiClient } from "@/api/client";
import { PageContent } from "@/components/PageContent";
import { MembershipPaywall } from "@/components/MembershipPaywall";
import { MembershipPaymentHistory } from "@/components/MembershipPaymentHistory";
import { StatutenDialog } from "@/components/StatutenDialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MembershipContentProps {
  membershipSuccess: string | undefined;
}

// One-time (non auto-renewing) members can pay another year early once they are this
// close to expiry. The backend stacks the new year onto the existing end date.
const RENEWAL_WINDOW_DAYS = 60;

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {ok ? (
        <Check className="size-4 shrink-0 text-green-600" />
      ) : (
        <X className="size-4 shrink-0 text-destructive" />
      )}
      <span className="font-medium">{label}</span>
    </div>
  );
}

export function MembershipContent({ membershipSuccess }: MembershipContentProps) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isLoadingPaymentMethod, setIsLoadingPaymentMethod] = useState(false);
  const [isLoadingRenew, setIsLoadingRenew] = useState(false);
  // statutenDialog: shown before rejoining (expired / grace period)
  const [showStatutenForRenew, setShowStatutenForRenew] = useState(false);
  // statutenDialog: shown before an active one-time member pays another year early
  const [showStatutenForExtend, setShowStatutenForExtend] = useState(false);
  // Austritt (cancel) confirmation dialog
  const [showAustrittDialog, setShowAustrittDialog] = useState(false);
  // "success" = first-time join (welcome + onboarding); "renewed" = an existing member
  // renewed / extended early (thanks-for-staying).
  const isRenewal = membershipSuccess === "renewed";
  const showSuccessDialog = membershipSuccess === "success" || isRenewal;

  function closeSuccessDialog() {
    void navigate({ to: "/membership", replace: true });
  }

  const statusQuery = useQuery(membershipStatusQueryOptions());

  // Austritt erklären (sets cancelAtPeriodEnd = true + cancelledByUser = true)
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

  // Turn auto-renew back on (also undoes an Austritt: clears cancelAtPeriodEnd / cancelledByUser)
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

  // Turn auto-renew off without resigning — the subscription runs out its paid period
  const disableAutoRenewMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.DELETE("/v1/membership/subscription/autoRenew");
      if (response.error) throw new Error("Failed to disable auto-renew");
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["membership", "status"] });
      queryClient.invalidateQueries({ queryKey: ["farm"] });
    },
  });

  // Checkout to rejoin (expired / grace) or to extend early (one-time member). Always a
  // returning/continuing member → the "renewed" (thanks-for-staying) dialog. For an early
  // extension the backend adds the year onto the existing period end.
  async function handleRenew(autoRenew: boolean) {
    setIsLoadingRenew(true);
    setShowStatutenForRenew(false);
    setShowStatutenForExtend(false);
    try {
      const endpoint = autoRenew
        ? "/v1/membership/checkout/subscription"
        : "/v1/membership/checkout/manual";
      const response = await apiClient.POST(endpoint, {
        body: {
          successUrl: `${window.location.href.split("?")[0]}?membership=renewed`,
          cancelUrl: window.location.href,
        },
      });
      if (response.error || !response.data) throw new Error("Checkout failed");
      window.location.href = response.data.data.url;
    } catch {
      setIsLoadingRenew(false);
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

  const status = statusQuery.data;

  // Genuine first-timers (never had a membership) get the paywall; everyone who was ever
  // a member keeps the normal membership page — the status reflects whether it is active,
  // in grace, expired, or resigned.
  if (!statusQuery.isLoading && !checkWasEverMember(status)) {
    return <MembershipPaywall />;
  }

  const dateFormatter = new Intl.DateTimeFormat(i18n.language, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const nowMs = Date.now();
  const periodEndRaw = status?.lastPeriodEnd ? new Date(status.lastPeriodEnd as string) : null;
  const periodEndDate = periodEndRaw ? dateFormatter.format(periodEndRaw) : null;
  const periodRunning = !!periodEndRaw && periodEndRaw.getTime() > nowMs;

  const isActiveMember = checkUserActiveMembership(status); // paid period still running (ignores grace)
  const inGracePeriod = checkUserGracePeriod(status);
  const hasFeatureAccess = isActiveMember || inGracePeriod;
  // Austritt declared and the paid period is still running (revocable, access continues).
  // Once the period has ended a resigned user must rejoin like any expired member.
  const isResignedActive = !!status?.cancelledByUser && isActiveMember;

  // Only one-time (non-subscription) members can top up early — the backend stacks the
  // new year onto their remaining time. Subscription members manage renewal through the
  // auto-renew toggle instead; the backend rejects a manual payment while a live
  // subscription exists.
  const daysUntilPeriodEnd =
    periodEndRaw && periodRunning
      ? Math.ceil((periodEndRaw.getTime() - nowMs) / (1000 * 60 * 60 * 24))
      : null;
  const canExtend =
    isActiveMember &&
    !status?.autoRenewing &&
    !status?.cancelledByUser &&
    daysUntilPeriodEnd !== null &&
    daysUntilPeriodEnd <= RENEWAL_WINDOW_DAYS;
  const canToggleAutoRenew = isActiveMember && !!status?.autoRenewing;

  const isMutating =
    cancelMutation.isPending ||
    reactivateMutation.isPending ||
    disableAutoRenewMutation.isPending;

  return (
    <PageContent title={t("membership.title")}>
      {/* Status card */}
      <div className="border rounded-lg p-6 mb-8 bg-white max-w-xl">
        <div className="space-y-2 mb-4">
          {/* A declared Austritt (cancelledByUser) means the user is no longer a member,
              even while feature access continues until the end of the paid period. */}
          <StatusRow
            label={t("membership.status.active")}
            ok={isActiveMember && !status?.cancelledByUser}
          />
          <StatusRow label={t("membership.status.featureAccess")} ok={hasFeatureAccess} />
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {isResignedActive
            ? t("membership.status.cancelledByUser", { date: periodEndDate })
            : isActiveMember
              ? status?.autoRenewing && !status?.cancelAtPeriodEnd
                ? t("membership.status.autoRenewsOn", { date: periodEndDate })
                : `${t("membership.status.validUntil")}: ${periodEndDate}`
              : inGracePeriod
                ? t("membership.status.expiredInGrace", { date: periodEndDate })
                : t("membership.status.expired", { date: periodEndDate })}
        </p>
        <div className="flex flex-wrap gap-3">
          {isResignedActive ? (
            <Button
              variant="outline"
              onClick={() => reactivateMutation.mutate()}
              disabled={isMutating}
            >
              {reactivateMutation.isPending ? t("common.loading") : t("membership.reactivate")}
            </Button>
          ) : isActiveMember ? (
            <div className="flex w-full flex-col gap-3">
              {canToggleAutoRenew && (
                <div className="flex items-center gap-2">
                  <Switch
                    id="auto-renew"
                    checked={!status?.cancelAtPeriodEnd}
                    onCheckedChange={(checked) =>
                      checked
                        ? reactivateMutation.mutate()
                        : disableAutoRenewMutation.mutate()
                    }
                    disabled={isMutating}
                  />
                  <Label htmlFor="auto-renew" className="cursor-pointer text-sm">
                    {t("membership.autoRenew")}
                  </Label>
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                {canExtend && (
                  <Button
                    onClick={() => setShowStatutenForExtend(true)}
                    disabled={isLoadingRenew}
                  >
                    {isLoadingRenew ? t("common.loading") : t("membership.extend")}
                  </Button>
                )}
                {status?.autoRenewing && (
                  <Button
                    variant="outline"
                    onClick={handleUpdatePaymentMethod}
                    disabled={isLoadingPaymentMethod}
                  >
                    {isLoadingPaymentMethod ? t("common.loading") : t("membership.updatePaymentMethod")}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={() => setShowAustrittDialog(true)}
                  disabled={isMutating}
                >
                  {t("membership.cancelRenewal")}
                </Button>
              </div>
            </div>
          ) : (
            // grace / expired — rejoin
            <Button onClick={() => setShowStatutenForRenew(true)} disabled={isLoadingRenew}>
              {isLoadingRenew ? t("common.loading") : t("membership.expired.renew")}
            </Button>
          )}
        </div>

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

      {/* Statuten acceptance for rejoining after expiry / during grace */}
      <StatutenDialog
        open={showStatutenForRenew}
        onOpenChange={setShowStatutenForRenew}
        onConfirm={handleRenew}
        isLoading={isLoadingRenew}
      />

      {/* Statuten acceptance for an early one-year extension (one-time payment only) */}
      <StatutenDialog
        open={showStatutenForExtend}
        onOpenChange={setShowStatutenForExtend}
        onConfirm={() => handleRenew(false)}
        isLoading={isLoadingRenew}
        showAutoRenewal={false}
      />

      {/* Shown after a Stripe checkout redirect — welcome for a first join, thanks-for-staying for a renewal */}
      <Dialog open={showSuccessDialog} onOpenChange={(open) => { if (!open) closeSuccessDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isRenewal
                ? t("membership.membershipRenewed.title")
                : t("membership.membershipSuccess.title")}
            </DialogTitle>
            <DialogDescription>
              {isRenewal
                ? t("membership.membershipRenewed.description")
                : t("membership.membershipSuccess.description")}
            </DialogDescription>
          </DialogHeader>
          {isRenewal ? (
            <p className="text-sm text-muted-foreground">{t("membership.membershipRenewed.body")}</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">{t("membership.membershipSuccess.treffpunkt")}</p>
              <p className="text-sm text-muted-foreground">{t("membership.membershipSuccess.features")}</p>
            </>
          )}
          <DialogFooter>
            {isRenewal ? (
              <Button onClick={closeSuccessDialog}>
                {t("membership.membershipSuccess.close")}
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={closeSuccessDialog}>
                  {t("membership.membershipSuccess.close")}
                </Button>
                <Button onClick={() => { void navigate({ to: "/treffpunkt", replace: true }); }}>
                  {t("membership.membershipSuccess.communityCta")}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MembershipPaymentHistory />
    </PageContent>
  );
}
