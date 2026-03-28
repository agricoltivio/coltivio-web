import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { uploadPlotJournalImage } from "@/api/plotJournal.queries";
import { PageContent } from "@/components/PageContent";
import {
  JournalEntryForm,
  type JournalEntryFormData,
} from "@/components/JournalEntryForm";

export const Route = createFileRoute(
  "/_authed/field-calendar/plots_/$plotId_/journal/create",
)({
  validateSearch: z.object({ returnTo: z.string().optional() }),
  component: PlotJournalCreatePage,
});

function PlotJournalCreatePage() {
  const { t } = useTranslation();
  const { plotId } = Route.useParams();
  const { returnTo } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  function backToList() {
    navigate({
      to: "/field-calendar/plots/$plotId/journal",
      params: { plotId },
      search: returnTo ? { returnTo } : {},
    });
  }

  const createMutation = useMutation({
    mutationFn: async ({
      data,
      pendingFiles,
    }: {
      data: JournalEntryFormData;
      pendingFiles: File[];
    }) => {
      const response = await apiClient.POST("/v1/plots/byId/{plotId}/journal", {
        params: { path: { plotId } },
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
          await uploadPlotJournalImage(created.id, file);
        } catch {
          // ignore individual upload failures
        }
      }
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plotJournal", plotId] });
      backToList();
    },
  });

  return (
    <PageContent
      title={t("journal.add")}
      showBackButton
      backTo={backToList}
    >
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
