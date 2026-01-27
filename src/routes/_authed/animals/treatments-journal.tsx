import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { treatmentsQueryOptions } from "@/api/treatments.queries";
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

export const Route = createFileRoute("/_authed/animals/treatments-journal")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(treatmentsQueryOptions());
  },
  component: TreatmentsJournal,
});

function TreatmentsJournal() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const treatmentsQuery = useQuery(treatmentsQueryOptions());

  function formatDate(dateString: string | null) {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString();
  }

  return (
    <PageContent title={t("treatments.title")} showBackButton={false}>
      <div className="flex-col">
        <div className="flex justify-end">
          <Button onClick={() => navigate({ to: "/treatments/create" })}>
            {t("treatments.addTreatment")}
          </Button>
        </div>
        <Table className="mt-3">
          <TableHeader>
            <TableRow>
              <TableHead>{t("treatments.date")}</TableHead>
              <TableHead>{t("treatments.animal")}</TableHead>
              <TableHead>{t("treatments.name")}</TableHead>
              <TableHead>{t("treatments.reason")}</TableHead>
              <TableHead>{t("treatments.drug")}</TableHead>
              <TableHead>{t("treatments.milkUsableDate")}</TableHead>
              <TableHead>{t("treatments.meatUsableDate")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {treatmentsQuery.data?.result.map((treatment) => (
              <TableRow
                key={treatment.id}
                className="cursor-pointer"
                onClick={() =>
                  navigate({
                    to: "/treatments/$treatmentId",
                    params: { treatmentId: treatment.id },
                  })
                }
              >
                <TableCell>{formatDate(treatment.date)}</TableCell>
                <TableCell className="font-medium">
                  {treatment.animal.name}
                </TableCell>
                <TableCell>{treatment.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {treatment.reason}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {treatment.drug?.name || "-"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(treatment.milkUsableDate)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(treatment.meatUsableDate)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </PageContent>
  );
}
