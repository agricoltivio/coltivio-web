import { AppSidebar } from "@/components/AppSidebar";
import { NoFarm } from "@/components/NoFarm";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { farmQueryOptions } from "@/api/farm.queries";
import { membershipStatusQueryOptions } from "@/api/membership.queries";
import { meQueryOptions } from "@/api/user.queries";
import { createFileRoute, Link, Outlet, redirect, useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/SupabaseAuthContext";
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const EXPIRY_BANNER_DISMISSED_KEY = "membership_expiry_banner_dismissed";
const GRACE_BANNER_DISMISSED_KEY = "membership_grace_banner_dismissed";

const EXPIRING_SOON_DAYS = 10;
const GRACE_PERIOD_DAYS = 10;

export const Route = createFileRoute("/_authed")({
  beforeLoad: ({ context, location }) => {
    if (!context.auth.session) {
      throw redirect({
        to: "/login",
        search: {
          redirect: location.href,
        },
      });
    }
  },
  loader: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQueryOptions());
    context.queryClient.ensureQueryData(membershipStatusQueryOptions());
    if (me.farmId) {
      return context.queryClient.ensureQueryData(farmQueryOptions());
    }
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const userId = user!.id;
  const meQuery = useQuery(meQueryOptions());
  const hasFarmId = meQuery.data?.farmId != null;
  const farmQuery = useQuery(farmQueryOptions(hasFarmId));
  const statusQuery = useQuery(membershipStatusQueryOptions());
  const [bannerDismissed, setBannerDismissed] = useState(
    () => sessionStorage.getItem(`${userId}:${EXPIRY_BANNER_DISMISSED_KEY}`) === "true",
  );
  const [graceBannerDismissed, setGraceBannerDismissed] = useState(
    () => sessionStorage.getItem(`${userId}:${GRACE_BANNER_DISMISSED_KEY}`) === "true",
  );
  const [showTrialDialog, setShowTrialDialog] = useState(false);
  const [showExpiredDialog, setShowExpiredDialog] = useState(false);
  const navigate = useNavigate();

  // Use the user's own membership status for dialogs/banners (not the farm's effective membership)
  const userMembership = statusQuery.data;

  const now = new Date();
  const periodEnd = userMembership?.lastPeriodEnd
    ? new Date(userMembership.lastPeriodEnd as string)
    : null;
  const trialEnd = userMembership?.trialEnd
    ? new Date(userMembership.trialEnd as string)
    : null;

  const hasActivePeriod = !!periodEnd && periodEnd > now;
  const hasActiveTrial = !!trialEnd && trialEnd > now;
  const hasActiveMembership = hasActivePeriod || hasActiveTrial;
  const isTrial = hasActiveTrial && !hasActivePeriod;
  // Most recent expiry date (whichever is later)
  const mostRecentExpiry = periodEnd && trialEnd
    ? periodEnd > trialEnd ? periodEnd : trialEnd
    : (periodEnd ?? trialEnd);

  const daysSinceExpiry = !hasActiveMembership && mostRecentExpiry
    ? Math.floor((now.getTime() - mostRecentExpiry.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Grace period: expired but within the 10-day window — features still accessible
  const isInGracePeriod =
    daysSinceExpiry !== null && daysSinceExpiry >= 0 && daysSinceExpiry < GRACE_PERIOD_DAYS;
  const daysRemainingInGrace = isInGracePeriod ? GRACE_PERIOD_DAYS - daysSinceExpiry! : 0;

  // Fully expired: grace period has also passed
  const isExpired = !statusQuery.isLoading && !hasActiveMembership && (!!periodEnd || !!trialEnd) && !isInGracePeriod;
  const expiredAtKey = isExpired ? mostRecentExpiry!.toISOString() : null;

  useEffect(() => {
    if (isTrial && localStorage.getItem(`${userId}:trial_welcome_shown`) !== "true") {
      localStorage.setItem(`${userId}:trial_welcome_shown`, "true");
      setShowTrialDialog(true);
    }
  }, [isTrial, userId]);

  useEffect(() => {
    if (expiredAtKey && localStorage.getItem(`${userId}:membership_expired_shown`) !== expiredAtKey) {
      localStorage.setItem(`${userId}:membership_expired_shown`, expiredAtKey);
      setShowExpiredDialog(true);
    }
  }, [expiredAtKey, userId]);

  const location = useLocation();
  const isExemptFromFarmCheck =
    location.pathname.startsWith("/membership") ||
    location.pathname.startsWith("/treffpunkt") ||
    location.pathname.startsWith("/account") ||
    location.pathname.startsWith("/settings");

  // Subscribed during trial: Stripe creates a $0 period ending at trialEnd,
  // then auto-renews at full price. Treat as active subscription, not expiring.
  const isSubscribedDuringTrial = hasActivePeriod && hasActiveTrial;

  // Only track expiry for pure trial (no subscription) or paid subscription without active trial
  const relevantExpiry = isTrial ? trialEnd : (!isSubscribedDuringTrial ? periodEnd : null);
  const daysUntilExpiry = relevantExpiry
    ? Math.ceil((relevantExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const showExpiryBanner =
    !bannerDismissed &&
    (!userMembership?.autoRenewing || !!userMembership?.cancelAtPeriodEnd) &&
    daysUntilExpiry !== null &&
    daysUntilExpiry > 0 &&
    daysUntilExpiry <= EXPIRING_SOON_DAYS;

  function dismissBanner() {
    sessionStorage.setItem(`${userId}:${EXPIRY_BANNER_DISMISSED_KEY}`, "true");
    setBannerDismissed(true);
  }

  function dismissGraceBanner() {
    sessionStorage.setItem(`${userId}:${GRACE_BANNER_DISMISSED_KEY}`, "true");
    setGraceBannerDismissed(true);
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans antialiased text-gray-900">
      <SidebarProvider>
        <AppSidebar />
        <main className="flex-1 min-w-0 overflow-x-hidden container mx-auto px-4 py-8">
          <SidebarTrigger />
          {showExpiryBanner && daysUntilExpiry !== null && (
            <div className="mb-6 flex items-center justify-between gap-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900">
              <p className="text-sm font-medium">
                {isTrial
                  ? t("membership.expiry.trialEnding", { days: daysUntilExpiry })
                  : t("membership.expiry.membershipExpiring", { days: daysUntilExpiry })}
              </p>
              <div className="flex shrink-0 items-center gap-3">
                <Link
                  to="/membership"
                  className="text-sm font-semibold underline underline-offset-2 hover:text-amber-700"
                >
                  {t("membership.expiry.renew")}
                </Link>
                <button
                  onClick={dismissBanner}
                  aria-label={t("common.close")}
                  className="rounded p-0.5 hover:bg-amber-100"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          )}
          {isInGracePeriod && !graceBannerDismissed && (
            <div className="mb-6 flex items-center justify-between gap-4 rounded-lg border border-orange-300 bg-orange-50 px-4 py-3 text-orange-900">
              <p className="text-sm font-medium">
                {t("membership.grace.banner", { days: daysRemainingInGrace })}
              </p>
              <div className="flex shrink-0 items-center gap-3">
                <Link
                  to="/membership"
                  className="text-sm font-semibold underline underline-offset-2 hover:text-orange-700"
                >
                  {t("membership.expiry.renew")}
                </Link>
                <button
                  onClick={dismissGraceBanner}
                  aria-label={t("common.close")}
                  className="rounded p-0.5 hover:bg-orange-100"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          )}
          {!meQuery.isLoading && !hasFarmId && !isExemptFromFarmCheck
            ? <NoFarm />
            : <Outlet />}
        </main>
      </SidebarProvider>

      <Dialog open={showExpiredDialog} onOpenChange={setShowExpiredDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("membership.expiredDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("membership.expiredDialog.description")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExpiredDialog(false)}>
              {t("common.close")}
            </Button>
            <Button onClick={() => { setShowExpiredDialog(false); void navigate({ to: "/membership" }); }}>
              {t("membership.expiredDialog.cta")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showTrialDialog} onOpenChange={setShowTrialDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("membership.trialWelcome.title")}</DialogTitle>
            <DialogDescription>
              {t("membership.trialWelcome.description")}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("membership.trialWelcome.features")}</p>
          <DialogFooter>
            <Button onClick={() => setShowTrialDialog(false)}>
              {t("membership.trialWelcome.cta")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
