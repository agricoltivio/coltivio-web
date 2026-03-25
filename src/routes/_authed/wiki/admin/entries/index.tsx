import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { wikiEntriesQueryOptions } from "@/api/wiki.queries";
import { apiClient } from "@/api/client";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import type { WikiEntry } from "@/api/types";

export const Route = createFileRoute("/_authed/wiki/admin/entries/")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(wikiEntriesQueryOptions());
  },
  component: AdminEntries,
});

function AdminEntries() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const lang = i18n.language.slice(0, 2);

  const entriesQuery = useQuery(wikiEntriesQueryOptions());
  const entries = entriesQuery.data?.result ?? [];

  const deleteMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const response = await apiClient.DELETE("/v1/wiki/byId/{entryId}", {
        params: { path: { entryId } },
      });
      if (response.error) throw new Error("Failed to delete entry");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wiki", "entries"] });
    },
  });

  function getTitle(entry: WikiEntry) {
    return entry.translations.find((tr) => tr.locale === lang)?.title
      ?? entry.translations[0]?.title
      ?? entry.id;
  }

  return (
    <PageContent
      title={t("wiki.manageEntries")}
      showBackButton
      backTo={() => navigate({ to: "/wiki/admin" })}
    >
      {entries.length === 0 ? (
        <p className="text-muted-foreground">{t("wiki.noEntries")}</p>
      ) : (
        <div className="grid gap-2">
          {entries.map((entry) => (
            <div key={entry.id} className="border rounded-lg p-3 flex items-center gap-3">
              <span className="flex-1 font-medium">{getTitle(entry)}</span>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  if (confirm(t("wiki.deleteConfirm"))) deleteMutation.mutate(entry.id);
                }}
                disabled={deleteMutation.isPending}
              >
                {t("common.delete")}
              </Button>
            </div>
          ))}
        </div>
      )}
    </PageContent>
  );
}
