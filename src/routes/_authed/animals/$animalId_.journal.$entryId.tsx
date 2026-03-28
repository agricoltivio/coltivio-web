import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { animalJournalEntryQueryOptions } from "@/api/animalJournal.queries";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute(
  "/_authed/animals/$animalId_/journal/$entryId",
)({
  loader: ({ context: { queryClient }, params: { entryId } }) => {
    queryClient.ensureQueryData(animalJournalEntryQueryOptions(entryId));
  },
  component: AnimalJournalEntryPage,
});

function AnimalJournalEntryPage() {
  const { t } = useTranslation();
  const { animalId, entryId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const entryQuery = useQuery(animalJournalEntryQueryOptions(entryId));
  const entry = entryQuery.data;

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.DELETE(
        "/v1/animals/journal/byId/{entryId}",
        { params: { path: { entryId } } },
      );
      if (response.error) throw new Error("Failed to delete journal entry");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["animalJournal", animalId] });
      navigate({ to: "/animals/$animalId/journal", params: { animalId } });
    },
  });

  if (entryQuery.isLoading || !entry) {
    return (
      <PageContent title={t("common.loading")} showBackButton backTo={() => navigate({ to: "/animals/$animalId/journal", params: { animalId } })}>
        <div className="py-8 text-center text-muted-foreground">{t("common.loading")}</div>
      </PageContent>
    );
  }

  return (
    <PageContent
      title={entry.title}
      showBackButton
      backTo={() =>
        navigate({ to: "/animals/$animalId/journal", params: { animalId } })
      }
    >
      <div className="mb-6 flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() =>
            navigate({
              to: "/animals/$animalId/journal/$entryId/edit",
              params: { animalId, entryId },
            })
          }
        >
          {t("common.edit")}
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">{t("common.delete")}</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("common.confirm")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("journal.deleteConfirm")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                {t("common.delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="space-y-4 max-w-lg">
        <div className="text-sm text-muted-foreground">
          {new Date(entry.date).toLocaleDateString()}
        </div>

        {entry.content && (
          <div className="rounded-md border p-4 whitespace-pre-wrap text-sm">
            {entry.content}
          </div>
        )}

        {entry.images.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {entry.images.map((image) => (
              <img
                key={image.id}
                src={image.signedUrl}
                alt=""
                className="rounded-md object-cover aspect-square w-full"
              />
            ))}
          </div>
        )}
      </div>
    </PageContent>
  );
}
