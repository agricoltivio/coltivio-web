import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { myWikiEntriesQueryOptions, myChangeRequestsQueryOptions } from "@/api/wiki.queries";
import { apiClient } from "@/api/client";
import { PageContent } from "@/components/PageContent";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { WikiEntry, WikiChangeRequest, WikiChangeRequestStatus } from "@/api/types";

export const Route = createFileRoute("/_authed/wiki/my-entries/")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(myWikiEntriesQueryOptions());
    queryClient.ensureQueryData(myChangeRequestsQueryOptions());
  },
  component: MyWikiEntries,
});

const ENTRY_STATUS_VARIANT: Record<WikiEntry["status"], "default" | "secondary" | "outline" | "destructive"> = {
  draft: "outline",
  submitted: "secondary",
  under_review: "secondary",
  published: "default",
  rejected: "destructive",
};

const CR_STATUS_VARIANT: Record<WikiChangeRequestStatus, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "outline",
  under_review: "secondary",
  approved: "default",
  rejected: "destructive",
};

function MyWikiEntries() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const entriesQuery = useQuery(myWikiEntriesQueryOptions());
  const changeRequestsQuery = useQuery(myChangeRequestsQueryOptions());
  const entries = entriesQuery.data?.result ?? [];
  const changeRequests = changeRequestsQuery.data?.result ?? [];
  const lang = i18n.language.slice(0, 2);

  const deleteMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const response = await apiClient.DELETE("/v1/wiki/byId/{entryId}", {
        params: { path: { entryId } },
      });
      if (response.error) throw new Error("Failed to delete entry");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wiki", "myEntries"] }),
  });

  const submitMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const response = await apiClient.POST("/v1/wiki/byId/{entryId}/submit", {
        params: { path: { entryId } },
        body: {},
      });
      if (response.error) throw new Error("Failed to submit entry");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wiki", "myEntries"] });
      queryClient.invalidateQueries({ queryKey: ["wiki", "myChangeRequests"] });
    },
  });

  function getEntryTitle(entry: WikiEntry) {
    return entry.translations.find((tr) => tr.locale === lang)?.title
      ?? entry.translations[0]?.title
      ?? entry.id;
  }

  // Returns true when the entry already has an active CR (under_review or draft)
  function hasActiveCr(entryId: string) {
    return changeRequests.some(
      (cr) => cr.entryId === entryId && (cr.status === "under_review" || cr.status === "draft"),
    );
  }

  function getCrTitle(cr: WikiChangeRequest) {
    return cr.translations.find((tr) => tr.locale === lang)?.title
      ?? cr.translations[0]?.title
      ?? cr.id;
  }

  return (
    <PageContent title={t("wiki.myEntries")} showBackButton={false}>
      <div className="flex justify-end mb-4">
        <Button onClick={() => navigate({ to: "/wiki/my-entries/new" })}>
          {t("wiki.newEntry")}
        </Button>
      </div>

      {/* Entries */}
      {entries.length === 0 ? (
        <p className="text-muted-foreground mb-8">{t("wiki.noEntries")}</p>
      ) : (
        <div className="grid gap-3 mb-10">
          {entries.map((entry) => (
            <div key={entry.id} className="border rounded-lg p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <span className="font-medium">{getEntryTitle(entry)}</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                {entry.visibility === "public" && (
                  <Badge variant={ENTRY_STATUS_VARIANT[entry.status]}>
                    {t(`wiki.status.${entry.status}`)}
                  </Badge>
                )}
                <Badge variant="outline">
                  {t(`wiki.visibility.${entry.visibility}`)}
                </Badge>
                {entry.visibility === "private" ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate({ to: "/wiki/my-entries/$entryId/edit", params: { entryId: entry.id } })}
                    >
                      {t("common.edit")}
                    </Button>
                    {!hasActiveCr(entry.id) && (
                      <Button
                        size="sm"
                        onClick={() => { if (confirm(t("wiki.submitConfirm"))) submitMutation.mutate(entry.id); }}
                        disabled={submitMutation.isPending}
                      >
                        {t("wiki.submit")}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => { if (confirm(t("wiki.deleteConfirm"))) deleteMutation.mutate(entry.id); }}
                      disabled={deleteMutation.isPending}
                    >
                      {t("common.delete")}
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate({ to: "/wiki/my-entries/$entryId/change-request", params: { entryId: entry.id } })}
                  >
                    {t("wiki.propose")}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Submissions (change requests) */}
      <h2 className="text-base font-semibold mb-3">{t("wiki.submissions")}</h2>
      {changeRequests.length === 0 ? (
        <p className="text-muted-foreground">{t("wiki.noSubmissions")}</p>
      ) : (
        <div className="grid gap-3">
          {changeRequests.map((cr) => (
            <div key={cr.id} className="border rounded-lg p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <span className="font-medium">{getCrTitle(cr)}</span>
                <p className="text-sm text-muted-foreground">{new Date(cr.createdAt as string).toLocaleDateString(i18n.language)}</p>
                {cr.status === "draft" && (
                  <p className="text-sm text-amber-600 dark:text-amber-400 mt-0.5">
                    {t("wiki.changesRequested")}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <Badge variant="outline">{t(`wiki.changeRequest.type.${cr.type}`)}</Badge>
                <Badge variant={CR_STATUS_VARIANT[cr.status]}>
                  {t(`wiki.changeRequest.status.${cr.status}`)}
                </Badge>
                {cr.status === "draft" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate({
                      to: "/wiki/my-entries/change-request-drafts/$changeRequestId",
                      params: { changeRequestId: cr.id },
                    })}
                  >
                    {t("wiki.editSubmission")}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </PageContent>
  );
}
