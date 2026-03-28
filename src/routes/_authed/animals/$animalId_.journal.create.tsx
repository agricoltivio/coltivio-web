import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { uploadAnimalJournalImage } from "@/api/animalJournal.queries";
import { PageContent } from "@/components/PageContent";
import {
  JournalEntryForm,
  type JournalEntryFormData,
} from "@/components/JournalEntryForm";

export const Route = createFileRoute(
  "/_authed/animals/$animalId_/journal/create",
)({
  component: AnimalJournalCreatePage,
});

function AnimalJournalCreatePage() {
  const { t } = useTranslation();
  const { animalId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async ({
      data,
      pendingFiles,
    }: {
      data: JournalEntryFormData;
      pendingFiles: File[];
    }) => {
      const response = await apiClient.POST(
        "/v1/animals/byId/{animalId}/journal",
        {
          params: { path: { animalId } },
          body: {
            title: data.title,
            date: new Date(data.date).toISOString(),
            content: data.content || undefined,
          },
        },
      );
      if (response.error) throw new Error("Failed to create journal entry");
      const created = response.data.data;

      // Upload images non-fatally — entry is created even if images fail
      for (const file of pendingFiles) {
        try {
          await uploadAnimalJournalImage(created.id, file);
        } catch {
          // ignore individual upload failures
        }
      }
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["animalJournal", animalId] });
      navigate({
        to: "/animals/$animalId/journal",
        params: { animalId },
      });
    },
  });

  return (
    <PageContent
      title={t("journal.add")}
      showBackButton
      backTo={() =>
        navigate({ to: "/animals/$animalId/journal", params: { animalId } })
      }
    >
      <JournalEntryForm
        onSubmit={(data, pendingFiles) =>
          createMutation.mutate({ data, pendingFiles })
        }
        onCancel={() =>
          navigate({ to: "/animals/$animalId/journal", params: { animalId } })
        }
        isSubmitting={createMutation.isPending}
      />
    </PageContent>
  );
}
