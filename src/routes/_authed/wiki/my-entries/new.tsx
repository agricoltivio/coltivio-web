import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { PageContent } from "@/components/PageContent";
import { WikiEntryForm, type WikiEntryFormData } from "@/components/wiki/WikiEntryForm";

export const Route = createFileRoute("/_authed/wiki/my-entries/new")({
  component: NewWikiEntry,
});

function NewWikiEntry() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: WikiEntryFormData) => {
      const response = await apiClient.POST("/v1/wiki", {
        body: {
          id: data.entryId,
          categoryId: data.categoryId,
          tagIds: data.tagIds,
          translations: data.translations,
        },
      });
      if (response.error) throw new Error("Failed to create wiki entry");
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wiki", "myEntries"] });
      navigate({ to: "/wiki/my-entries" });
    },
  });

  return (
    <PageContent
      title={t("wiki.newEntry")}
      showBackButton
      backTo={() => navigate({ to: "/wiki/my-entries" })}
    >
      <p className="text-sm text-muted-foreground mb-6">
        {t("wiki.privateNote")} {t("wiki.submitNote")}
      </p>
      <WikiEntryForm
        onSubmit={(data) => createMutation.mutate(data)}
        isSubmitting={createMutation.isPending}
      />
    </PageContent>
  );
}
