import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { reviewQueueQueryOptions } from "@/api/wiki.queries";
import { PageContent } from "@/components/PageContent";
import { Badge } from "@/components/ui/badge";
import type { WikiReviewItem } from "@/api/types";

export const Route = createFileRoute("/_authed/wiki/admin/review-queue/")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(reviewQueueQueryOptions());
  },
  component: ReviewQueue,
});

const TYPE_VARIANT: Record<WikiReviewItem["type"], "default" | "secondary"> = {
  new_entry: "default",
  change_request: "secondary",
};

function ReviewQueue() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queueQuery = useQuery(reviewQueueQueryOptions());
  const items = queueQuery.data?.result ?? [];
  const lang = i18n.language.slice(0, 2);

  return (
    <PageContent
      title={t("wiki.reviewQueue")}
      showBackButton
      backTo={() => navigate({ to: "/wiki/admin" })}
    >
      {items.length === 0 ? (
        <p className="text-muted-foreground">{t("wiki.noReviewItems")}</p>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => {
            const translation = item.translations.find((tr) => tr.locale === lang) ?? item.translations[0];
            const entryTitle = item.entry
              ? (item.entry.translations.find((tr) => tr.locale === lang)?.title ?? item.entry.id)
              : t(`wiki.changeRequest.type.${item.type}`);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  navigate({
                    to: "/wiki/admin/review-queue/$changeRequestId",
                    params: { changeRequestId: item.id },
                  })
                }
                className="text-left border rounded-lg p-4 hover:bg-sidebar-accent transition-colors"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{translation?.title ?? entryTitle}</span>
                  <Badge variant={TYPE_VARIANT[item.type]}>
                    {t(`wiki.changeRequest.type.${item.type}`)}
                  </Badge>
                  <Badge variant="outline">
                    {t(`wiki.changeRequest.status.${item.status}`)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {new Date(item.createdAt as string).toLocaleDateString(i18n.language)}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </PageContent>
  );
}
