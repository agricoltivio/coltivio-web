import { AppSidebar } from "@/components/AppSidebar";
import { MembershipExpired } from "@/components/MembershipExpired";
import { MembershipPaywall } from "@/components/MembershipPaywall";
import { NoFarm } from "@/components/NoFarm";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { farmQueryOptions } from "@/api/farm.queries";
import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { X } from "lucide-react";

const EXPIRY_BANNER_DISMISSED_KEY = "membership_expiry_banner_dismissed";

const EXPIRING_SOON_DAYS = 30;

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
  loader: ({ context }) => {
    return context.queryClient.ensureQueryData(farmQueryOptions());
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const { t } = useTranslation();
  const farmQuery = useQuery(farmQueryOptions());
  const [bannerDismissed, setBannerDismissed] = useState(
    () => sessionStorage.getItem(EXPIRY_BANNER_DISMISSED_KEY) === "true",
  );

  const membership = farmQuery.data?.membership;

  const now = new Date();
  const periodEnd = membership?.lastPeriodEnd
    ? new Date(membership.lastPeriodEnd as string)
    : null;
  const trialEnd = membership?.trialEnd
    ? new Date(membership.trialEnd as string)
    : null;

  const hasActivePeriod = !!periodEnd && periodEnd > now;
  const hasActiveTrial = !!trialEnd && trialEnd > now;
  const hasActiveMembership = hasActivePeriod || hasActiveTrial;
  const isExpired = !hasActiveMembership && (!!periodEnd || !!trialEnd);

  if (!farmQuery.isLoading && farmQuery.data === null) {
    return <NoFarm />;
  }

  if (!farmQuery.isLoading && isExpired) {
    return <MembershipExpired />;
  }

  if (!farmQuery.isLoading && !hasActiveMembership) {
    return <MembershipPaywall />;
  }

  const isTrial = hasActiveTrial && !hasActivePeriod;
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
    daysUntilExpiry !== null &&
    daysUntilExpiry <= EXPIRING_SOON_DAYS;

  function dismissBanner() {
    sessionStorage.setItem(EXPIRY_BANNER_DISMISSED_KEY, "true");
    setBannerDismissed(true);
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
          <Outlet />
        </main>
      </SidebarProvider>
    </div>
  );
}
