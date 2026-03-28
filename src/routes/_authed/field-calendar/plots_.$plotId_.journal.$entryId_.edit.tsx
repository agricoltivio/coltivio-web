import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import {
  plotJournalEntryQueryOptions,
  uploadPlotJournalImage,
} from "@/api/plotJournal.queries";
import { PageContent } from "@/components/PageContent";
import {
  JournalEntryForm,
  type JournalEntryFormData,
} from "@/components/JournalEntryForm";

export const Route = createFileRoute(
  "/_authed/field-calendar/plots_/$plotId_/journal/$entryId_/edit",
)({
  loader: ({ context: { queryClient }, params: { entryId } }) => {
    queryClient.ensureQueryData(plotJournalEntryQueryOptions(entryId));
  },
  component: PlotJournalEditPage,
});

function PlotJournalEditPage() {
  const { t } = useTranslation();
  const { plotId, entryId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const entryQuery = useQuery(plotJournalEntryQueryOptions(entryId));
  const entry = entryQuery.data;

  const updateMutation = useMutation({
    mutationFn: async (data: JournalEntryFormData) => {
      const response = await apiClient.PATCH(
        "/v1/plots/journal/byId/{entryId}",
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
      queryClient.invalidateQueries({ queryKey: ["plotJournal", plotId] });
      queryClient.invalidateQueries({
        queryKey: ["plotJournal", "entry", entryId],
      });
      navigate({
        to: "/field-calendar/plots/$plotId/journal/$entryId",
        params: { plotId, entryId },
      });
    },
  });

  async function handleUploadImage(file: File) {
    await uploadPlotJournalImage(entryId, file);
    queryClient.invalidateQueries({
      queryKey: ["plotJournal", "entry", entryId],
    });
  }

  async function handleDeleteImage(imageId: string) {
    const response = await apiClient.DELETE(
      "/v1/plots/journal/images/byId/{imageId}",
      { params: { path: { imageId } } },
    );
    if (response.error) throw new Error("Failed to delete image");
    queryClient.invalidateQueries({
      queryKey: ["plotJournal", "entry", entryId],
    });
  }

  if (!entry) {
    return (
      <PageContent
        title={t("common.loading")}
        showBackButton
        backTo={() =>
          navigate({
            to: "/field-calendar/plots/$plotId/journal/$entryId",
            params: { plotId, entryId },
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
          to: "/field-calendar/plots/$plotId/journal/$entryId",
          params: { plotId, entryId },
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
            to: "/field-calendar/plots/$plotId/journal/$entryId",
            params: { plotId, entryId },
          })
        }
        isSubmitting={updateMutation.isPending}
      />
    </PageContent>
  );
}
