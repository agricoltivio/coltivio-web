import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { membershipStatusQueryOptions, membershipPaymentsQueryOptions } from "@/api/membership.queries";
import { PageContent } from "@/components/PageContent";
// Trial phase: full membership UI is in MembershipContent — swap component below to restore
// import { MembershipContent } from "@/components/MembershipContent";

export const Route = createFileRoute("/_authed/membership/")({
  validateSearch: z.object({ membership: z.string().optional() }),
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(membershipStatusQueryOptions());
    queryClient.ensureQueryData(membershipPaymentsQueryOptions());
  },
  component: MembershipPage,
});

function MembershipPage() {
  const { t } = useTranslation();
  // const { membership: membershipSuccess } = Route.useSearch();

  // To restore the full membership UI, replace the return below with:
  // return <MembershipContent membershipSuccess={membershipSuccess} />;

  return (
    <PageContent title={t("membership.title")}>
      <div className="border rounded-lg p-6 max-w-xl bg-amber-50 border-amber-200">
        <p className="font-semibold text-amber-900 mb-1">{t("membership.trialBanner.title")}</p>
        <p className="text-sm text-amber-800">{t("membership.trialBanner.description")}</p>
      </div>
    </PageContent>
  );
}
