import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { myWikiEntriesQueryOptions } from "@/api/wiki.queries";
import { apiClient } from "@/api/client";
import { PageContent } from "@/components/PageContent";
import { WikiEntryForm, type WikiEntryFormData } from "@/components/wiki/WikiEntryForm";

export const Route = createFileRoute("/_authed/wiki/my-entries/$entryId/edit")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(myWikiEntriesQueryOptions());
  },
  component: EditWikiEntry,
});

function EditWikiEntry() {
  const { entryId } = Route.useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const entriesQuery = useQuery(myWikiEntriesQueryOptions());
  const entry = entriesQuery.data?.result.find((e) => e.id === entryId);

  const updateMutation = useMutation({
    mutationFn: async (data: WikiEntryFormData) => {
      const response = await apiClient.PATCH("/v1/wiki/byId/{entryId}", {
        params: { path: { entryId } },
        body: {
          categoryId: data.categoryId,
          tagIds: data.tagIds,
          translations: data.translations,
        },
      });
      if (response.error) throw new Error("Failed to update wiki entry");
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wiki", "myEntries"] });
      navigate({ to: "/wiki/$entryId", params: { entryId } });
    },
  });

  if (!entry) return null;

  return (
    <PageContent
      title={t("wiki.editEntry")}
      showBackButton
      backTo={() => navigate({ to: "/wiki/$entryId", params: { entryId } })}
    >
      <WikiEntryForm
        entry={entry}
        onSubmit={(data) => updateMutation.mutate(data)}
        isSubmitting={updateMutation.isPending}
      />
    </PageContent>
  );
}
