import { AppSidebar } from "@/components/AppSidebar";
import { SectionNav } from "@/components/SectionNav";
import { NoFarm } from "@/components/NoFarm";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { farmQueryOptions } from "@/api/farm.queries";
import { membershipStatusQueryOptions } from "@/api/membership.queries";
import { checkUserGracePeriod } from "@/lib/membership";
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

// The primary sidebar starts collapsed (icon rail); remember the user's choice
// across reloads via the cookie that SidebarProvider writes on toggle.
function getInitialSidebarOpen(): boolean {
  const match =
    typeof document !== "undefined"
      ? document.cookie.match(/(?:^|;\s*)sidebar_state=(true|false)/)
      : null;
  return match ? match[1] === "true" : false;
}

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
    // Awaited so the Treffpunkt gate and the expiry/grace banners decide on first render.
    await context.queryClient.ensureQueryData(membershipStatusQueryOptions());
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
  const [showExpiredDialog, setShowExpiredDialog] = useState(false);
  const navigate = useNavigate();

  const userMembership = statusQuery.data;

  const now = new Date();
  const periodEnd = userMembership?.lastPeriodEnd
    ? new Date(userMembership.lastPeriodEnd as string)
    : null;

  // A declared Austritt (cancelledByUser) keeps access until the end of the paid period.
  const hasActiveMembership = !!periodEnd && periodEnd > now;

  // Grace period: the paid period lapsed within the last 10 days — features still accessible.
  const isInGracePeriod = checkUserGracePeriod(userMembership);
  const daysSincePeriodEnd = periodEnd
    ? Math.floor((now.getTime() - periodEnd.getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const daysRemainingInGrace = isInGracePeriod
    ? Math.max(0, GRACE_PERIOD_DAYS - daysSincePeriodEnd)
    : 0;

  // Fully expired: had a paid membership, grace is over. Drives the one-time auto-open dialog.
  const isExpired =
    !statusQuery.isLoading && !hasActiveMembership && !isInGracePeriod && !!periodEnd;
  const expiredAtKey = isExpired ? periodEnd!.toISOString() : null;

  useEffect(() => {
    if (expiredAtKey && localStorage.getItem(`${userId}:membership_expired_shown`) !== expiredAtKey) {
      localStorage.setItem(`${userId}:membership_expired_shown`, expiredAtKey);
      setShowExpiredDialog(true);
    }
  }, [expiredAtKey, userId]);

  const location = useLocation();
  // Routes that work without a farm, so the layout should not force the NoFarm wizard.
  const isExemptFromFarmCheck =
    location.pathname.startsWith("/membership") ||
    location.pathname.startsWith("/treffpunkt") ||
    location.pathname.startsWith("/account") ||
    location.pathname.startsWith("/settings");

  // The whole app is free — a membership is only required for the Treffpunkt community
  // (gated in treffpunkt/route.tsx). This layout just shows the expiry / grace nudges below.

  // Nudge before a non-renewing membership lapses.
  const daysUntilExpiry =
    periodEnd && hasActiveMembership
      ? Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
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
    <div className="min-h-screen bg-background font-sans antialiased text-foreground">
      <SidebarProvider defaultOpen={getInitialSidebarOpen()}>
        <AppSidebar />
        <main className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
          <div className="flex h-12 shrink-0 items-center gap-3 border-b px-4 sm:px-6 lg:px-8">
            <SidebarTrigger className="-ml-1.5 shrink-0" />
            <SectionNav />
          </div>
          <div className="px-4 py-8 sm:px-6 lg:px-8">
          {showExpiryBanner && daysUntilExpiry !== null && (
            <div className="mb-6 flex items-center justify-between gap-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
              <p className="text-sm font-medium">
                {t("membership.expiry.membershipExpiring", { days: daysUntilExpiry })}
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
                  className="rounded p-0.5 hover:bg-amber-100 dark:hover:bg-amber-900/50"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          )}
          {isInGracePeriod && !graceBannerDismissed && (
            <div className="mb-6 flex items-center justify-between gap-4 rounded-lg border border-orange-300 bg-orange-50 px-4 py-3 text-orange-900 dark:border-orange-900 dark:bg-orange-950/50 dark:text-orange-200">
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
                  className="rounded p-0.5 hover:bg-orange-100 dark:hover:bg-orange-900/50"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          )}
          {!meQuery.isLoading && !hasFarmId && !isExemptFromFarmCheck
            ? <NoFarm />
            : <Outlet />}
          </div>
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
    </div>
  );
}
