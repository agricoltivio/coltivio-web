import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useFeatureAccess } from "@/lib/useFeatureAccess";
import { animalJournalQueryOptions } from "@/api/animalJournal.queries";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_authed/animals/$animalId_/journal/")({
  loader: ({ context: { queryClient }, params: { animalId } }) => {
    queryClient.ensureQueryData(animalJournalQueryOptions(animalId));
  },
  component: AnimalJournalPage,
});

function AnimalJournalPage() {
  const { t } = useTranslation();
  const { canWrite: canWriteAnimals } = useFeatureAccess("animals");
  const { animalId } = Route.useParams();
  const navigate = useNavigate();

  const journalQuery = useQuery(animalJournalQueryOptions(animalId));
  const entries = journalQuery.data ?? [];
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return (
    <PageContent
      title={t("journal.title")}
      showBackButton
      backTo={() => navigate({ to: "/animals/$animalId", params: { animalId } })}
    >
      {canWriteAnimals && (
        <div className="mb-4 flex justify-end">
          <Button
            onClick={() =>
              navigate({
                to: "/animals/$animalId/journal/create",
                params: { animalId },
              })
            }
          >
            <Plus className="h-4 w-4 mr-1" />
            {t("journal.add")}
          </Button>
        </div>
      )}

      {sortedEntries.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          {t("journal.noEntries")}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("common.date")}</TableHead>
              <TableHead>{t("common.title")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedEntries.map((entry) => (
              <TableRow
                key={entry.id}
                className="cursor-pointer"
                onClick={() =>
                  navigate({
                    to: "/animals/$animalId/journal/$entryId",
                    params: { animalId, entryId: entry.id },
                  })
                }
              >
                <TableCell className="text-muted-foreground">
                  {new Date(entry.date).toLocaleDateString()}
                </TableCell>
                <TableCell className="font-medium">{entry.title}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </PageContent>
  );
}
