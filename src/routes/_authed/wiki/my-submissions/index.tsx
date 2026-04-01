import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { myChangeRequestsQueryOptions } from "@/api/wiki.queries";
import { PageContent } from "@/components/PageContent";
import { Badge } from "@/components/ui/badge";
import type { WikiChangeRequest, WikiChangeRequestStatus } from "@/api/types";

export const Route = createFileRoute("/_authed/wiki/my-submissions/")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(myChangeRequestsQueryOptions());
  },
  component: MySubmissions,
});

const STATUS_VARIANT: Record<WikiChangeRequestStatus, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "outline",
  under_review: "secondary",
  approved: "default",
  rejected: "destructive",
  changes_requested: "outline",
};

// Lower number = higher in the list
const STATUS_ORDER: Record<WikiChangeRequestStatus, number> = {
  changes_requested: 0,
  draft: 1,
  under_review: 2,
  approved: 3,
  rejected: 4,
};

function MySubmissions() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const query = useQuery(myChangeRequestsQueryOptions());
  const lang = i18n.language.slice(0, 2);

  const submissions = [...(query.data?.result ?? [])].sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status],
  );

  function getTitle(cr: WikiChangeRequest) {
    return cr.translations.find((tr) => tr.locale === lang)?.title
      ?? cr.translations[0]?.title
      ?? cr.id;
  }

  return (
    <PageContent title={t("wiki.mySubmissions")} showBackButton={false}>
      {submissions.length === 0 ? (
        <p className="text-muted-foreground">{t("wiki.noSubmissions")}</p>
      ) : (
        <div className="grid gap-3">
          {submissions.map((cr) => (
            <button
              key={cr.id}
              type="button"
              className="border rounded-lg p-4 flex items-center gap-3 text-left hover:bg-muted/50 transition-colors w-full"
              onClick={() =>
                navigate({
                  to: "/wiki/my-entries/change-request-drafts/$changeRequestId",
                  params: { changeRequestId: cr.id },
                })
              }
            >
              <div className="flex-1 min-w-0">
                <span className="font-medium">{getTitle(cr)}</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t(`wiki.changeRequest.type.${cr.type}`)}
                </p>
              </div>
              <Badge variant={STATUS_VARIANT[cr.status]} className="shrink-0">
                {t(`wiki.changeRequest.status.${cr.status}`)}
              </Badge>
            </button>
          ))}
        </div>
      )}
    </PageContent>
  );
}
