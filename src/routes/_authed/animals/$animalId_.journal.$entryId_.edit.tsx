import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import {
  animalJournalEntryQueryOptions,
  uploadAnimalJournalImage,
} from "@/api/animalJournal.queries";
import { PageContent } from "@/components/PageContent";
import {
  JournalEntryForm,
  type JournalEntryFormData,
} from "@/components/JournalEntryForm";

export const Route = createFileRoute(
  "/_authed/animals/$animalId_/journal/$entryId_/edit",
)({
  loader: ({ context: { queryClient }, params: { entryId } }) => {
    queryClient.ensureQueryData(animalJournalEntryQueryOptions(entryId));
  },
  component: AnimalJournalEditPage,
});

function AnimalJournalEditPage() {
  const { t } = useTranslation();
  const { animalId, entryId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const entryQuery = useQuery(animalJournalEntryQueryOptions(entryId));
  const entry = entryQuery.data;

  const updateMutation = useMutation({
    mutationFn: async (data: JournalEntryFormData) => {
      const response = await apiClient.PATCH(
        "/v1/animals/journal/byId/{entryId}",
        {
          params: { path: { entryId } },
          body: {
            title: data.title,
            date: new Date(data.date).toISOString(),
            content: data.content || undefined,
          },
        },
      );
      if (response.error) throw new Error("Failed to update journal entry");
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["animalJournal", animalId] });
      queryClient.invalidateQueries({
        queryKey: ["animalJournal", "entry", entryId],
      });
      navigate({
        to: "/animals/$animalId/journal/$entryId",
        params: { animalId, entryId },
      });
    },
  });

  async function handleUploadImage(file: File) {
    await uploadAnimalJournalImage(entryId, file);
    // Refetch so the new image appears in the grid
    queryClient.invalidateQueries({
      queryKey: ["animalJournal", "entry", entryId],
    });
  }

  async function handleDeleteImage(imageId: string) {
    const response = await apiClient.DELETE(
      "/v1/animals/journal/images/byId/{imageId}",
      { params: { path: { imageId } } },
    );
    if (response.error) throw new Error("Failed to delete image");
    queryClient.invalidateQueries({
      queryKey: ["animalJournal", "entry", entryId],
    });
  }

  if (!entry) {
    return (
      <PageContent
        title={t("common.loading")}
        showBackButton
        backTo={() =>
          navigate({
            to: "/animals/$animalId/journal/$entryId",
            params: { animalId, entryId },
          })
        }
      >
        <div className="py-8 text-center text-muted-foreground">
          {t("common.loading")}
        </div>
      </PageContent>
    );
  }

  return (
    <PageContent
      title={t("common.edit")}
      showBackButton
      backTo={() =>
        navigate({
          to: "/animals/$animalId/journal/$entryId",
          params: { animalId, entryId },
        })
      }
    >
      <JournalEntryForm
        entry={entry}
        existingImages={entry.images}
        onUploadImage={handleUploadImage}
        onDeleteImage={handleDeleteImage}
        onSubmit={(data) => updateMutation.mutate(data)}
        onCancel={() =>
          navigate({
            to: "/animals/$animalId/journal/$entryId",
            params: { animalId, entryId },
          })
        }
        isSubmitting={updateMutation.isPending}
      />
    </PageContent>
  );
}
