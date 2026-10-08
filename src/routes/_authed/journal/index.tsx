import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { farmJournalQueryOptions } from "@/api/farmJournal.queries";
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

export const Route = createFileRoute("/_authed/journal/")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(farmJournalQueryOptions());
  },
  component: FarmJournalPage,
});

function FarmJournalPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const journalQuery = useQuery(farmJournalQueryOptions());
  const entries = journalQuery.data ?? [];
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return (
    <PageContent title={t("nav.farmJournal")}>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => navigate({ to: "/journal/create" })}>
          {t("journal.add")}
        </Button>
      </div>

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
                    to: "/journal/$entryId",
                    params: { entryId: entry.id },
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
