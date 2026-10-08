import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import {
  farmJournalEntryQueryOptions,
  uploadFarmJournalImage,
} from "@/api/farmJournal.queries";
import { PageContent } from "@/components/PageContent";
import {
  JournalEntryForm,
  type JournalEntryFormData,
} from "@/components/JournalEntryForm";

export const Route = createFileRoute("/_authed/journal/$entryId/edit")({
  loader: ({ context: { queryClient }, params: { entryId } }) => {
    queryClient.ensureQueryData(farmJournalEntryQueryOptions(entryId));
  },
  component: FarmJournalEditPage,
});

function FarmJournalEditPage() {
  const { t } = useTranslation();
  const { entryId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const entryQuery = useQuery(farmJournalEntryQueryOptions(entryId));
  const entry = entryQuery.data;

  function backToEntry() {
    navigate({ to: "/journal/$entryId", params: { entryId } });
  }

  const updateMutation = useMutation({
    mutationFn: async (data: JournalEntryFormData) => {
      const response = await apiClient.PATCH(
        "/v1/farm/journal/byId/{entryId}",
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
      queryClient.invalidateQueries({ queryKey: ["farmJournal"] });
      backToEntry();
    },
  });

  async function handleUploadImage(file: File) {
    await uploadFarmJournalImage(entryId, file);
    queryClient.invalidateQueries({
      queryKey: ["farmJournal", "entry", entryId],
    });
  }

  async function handleDeleteImage(imageId: string) {
    const response = await apiClient.DELETE(
      "/v1/farm/journal/images/byId/{imageId}",
      { params: { path: { imageId } } },
    );
    if (response.error) throw new Error("Failed to delete image");
    queryClient.invalidateQueries({
      queryKey: ["farmJournal", "entry", entryId],
    });
  }

  if (!entry) {
    return (
      <PageContent
        title={t("common.loading")}
        showBackButton
        backTo={backToEntry}
      >
        <div className="py-8 text-center text-muted-foreground">
          {t("common.loading")}
        </div>
      </PageContent>
    );
  }

  return (
    <PageContent title={t("common.edit")} showBackButton backTo={backToEntry}>
      <JournalEntryForm
        entry={entry}
        existingImages={entry.images}
        onUploadImage={handleUploadImage}
        onDeleteImage={handleDeleteImage}
        onSubmit={(data) => updateMutation.mutate(data)}
        onCancel={backToEntry}
        isSubmitting={updateMutation.isPending}
      />
    </PageContent>
  );
}
