import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useFeatureAccess } from "@/lib/useFeatureAccess";
import { plotJournalQueryOptions } from "@/api/plotJournal.queries";
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

export const Route = createFileRoute(
  "/_authed/field-calendar/plots_/$plotId_/journal/",
)({
  validateSearch: z.object({ returnTo: z.string().optional() }),
  loader: ({ context: { queryClient }, params: { plotId } }) => {
    queryClient.ensureQueryData(plotJournalQueryOptions(plotId));
  },
  component: PlotJournalPage,
});

function PlotJournalPage() {
  const { t } = useTranslation();
  const { canWrite: canWritePlots } = useFeatureAccess("field_calendar");
  const { plotId } = Route.useParams();
  const { returnTo } = Route.useSearch();
  const navigate = useNavigate();

  const journalQuery = useQuery(plotJournalQueryOptions(plotId));
  const entries = journalQuery.data ?? [];
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return (
    <PageContent
      title={t("journal.title")}
      showBackButton
      backTo={() =>
        returnTo
          ? navigate({ to: returnTo as "/" })
          : navigate({ to: "/field-calendar/plots/$plotId", params: { plotId } })
      }
    >
      {canWritePlots && (
        <div className="mb-4 flex justify-end">
          <Button
            onClick={() =>
              navigate({
                to: "/field-calendar/plots/$plotId/journal/create",
                params: { plotId },
                search: returnTo ? { returnTo } : {},
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
                    to: "/field-calendar/plots/$plotId/journal/$entryId",
                    params: { plotId, entryId: entry.id },
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
