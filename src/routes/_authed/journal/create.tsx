import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { uploadFarmJournalImage } from "@/api/farmJournal.queries";
import { PageContent } from "@/components/PageContent";
import {
  JournalEntryForm,
  type JournalEntryFormData,
} from "@/components/JournalEntryForm";

export const Route = createFileRoute("/_authed/journal/create")({
  component: FarmJournalCreatePage,
});

function FarmJournalCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  function backToList() {
    navigate({ to: "/journal" });
  }

  const createMutation = useMutation({
    mutationFn: async ({
      data,
      pendingFiles,
    }: {
      data: JournalEntryFormData;
      pendingFiles: File[];
    }) => {
      const response = await apiClient.POST("/v1/farm/journal", {
        body: {
          title: data.title,
          date: new Date(data.date).toISOString(),
          content: data.content || undefined,
        },
      });
      if (response.error) throw new Error("Failed to create journal entry");
      const created = response.data.data;

      // Upload images non-fatally — entry is created even if images fail
      for (const file of pendingFiles) {
        try {
          await uploadFarmJournalImage(created.id, file);
        } catch {
          // ignore individual upload failures
        }
      }
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farmJournal"] });
      backToList();
    },
  });

  return (
    <PageContent title={t("journal.add")} showBackButton backTo={backToList}>
      <JournalEntryForm
        onSubmit={(data, pendingFiles) =>
          createMutation.mutate({ data, pendingFiles })
        }
        onCancel={backToList}
        isSubmitting={createMutation.isPending}
      />
    </PageContent>
  );
}
