import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { myWikiEntriesQueryOptions } from "@/api/wiki.queries";
import { apiClient } from "@/api/client";
import { PageContent } from "@/components/PageContent";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MyWikiEntry, MyWikiEntryActiveChangeRequest, WikiChangeRequestStatus } from "@/api/types";

export const Route = createFileRoute("/_authed/wiki/my-entries/")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(myWikiEntriesQueryOptions());
  },
  component: MyWikiEntries,
});

const CR_STATUS_VARIANT: Record<WikiChangeRequestStatus, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "outline",
  under_review: "secondary",
  approved: "default",
  rejected: "destructive",
  changes_requested: "outline",
};

function MyWikiEntries() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const entriesQuery = useQuery(myWikiEntriesQueryOptions());
  const entries = (entriesQuery.data?.result ?? []).filter((e) => e.visibility === "private");
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wiki", "myEntries"] }),
  });

  function getEntryTitle(entry: MyWikiEntry) {
    return entry.translations.find((tr) => tr.locale === lang)?.title
      ?? entry.translations[0]?.title
      ?? entry.id;
  }

  function getCrPath(cr: MyWikiEntryActiveChangeRequest) {
    return { to: "/wiki/my-entries/change-request-drafts/$changeRequestId" as const, params: { changeRequestId: cr.id } };
  }

  return (
    <PageContent title={t("wiki.myEntries")} showBackButton={false}>
      <div className="flex justify-end mb-4">
        <Button onClick={() => navigate({ to: "/wiki/my-entries/new" })}>
          {t("wiki.newEntry")}
        </Button>
      </div>

      {entries.length === 0 ? (
        <p className="text-muted-foreground">{t("wiki.noEntries")}</p>
      ) : (
        <div className="grid gap-3">
          {entries.map((entry) => {
            const cr = entry.activeChangeRequest;
            return (
              <div key={entry.id} className="border rounded-lg p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{getEntryTitle(entry)}</span>
                  {cr?.status === "changes_requested" && (
                    <p className="text-sm text-amber-600 dark:text-amber-400 mt-0.5">
                      {t("wiki.changesRequested")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  {/* CR status badge — clickable, always navigates to CR detail */}
                  {cr && (
                    <button type="button" onClick={() => navigate(getCrPath(cr))}>
                      <Badge variant={CR_STATUS_VARIANT[cr.status]} className="hover:opacity-80 cursor-pointer">
                        {t(`wiki.changeRequest.status.${cr.status}`)}
                      </Badge>
                    </button>
                  )}
                  {/* Private entry: always editable */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate({ to: "/wiki/my-entries/$entryId/edit", params: { entryId: entry.id } })}
                  >
                    {t("common.edit")}
                  </Button>
                  {/* Submit: only when no active CR */}
                  {!cr && (
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
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageContent>
  );
}
