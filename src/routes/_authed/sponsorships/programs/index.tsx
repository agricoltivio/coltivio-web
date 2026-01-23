import { sponsorshipProgramsQueryOptions } from "@/api/sponsorshipPrograms.queries";
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
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_authed/sponsorships/programs/")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(sponsorshipProgramsQueryOptions());
  },
  component: SponsorshipPrograms,
});

function SponsorshipPrograms() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const programsQuery = useQuery(sponsorshipProgramsQueryOptions());

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("de-CH", {
      style: "currency",
      currency: "CHF",
    }).format(amount);
  }

  return (
    <PageContent title={t("sponsorshipPrograms.title")} showBackButton={false}>
      <div className="flex-col">
        <div className="flex justify-end">
          <Button
            onClick={() => navigate({ to: "/sponsorships/programs/create" })}
          >
            Erfassen
          </Button>
        </div>
        <Table className="mt-3">
          <TableHeader>
            <TableRow>
              <TableHead>{t("sponsorshipPrograms.name")}</TableHead>
              <TableHead>{t("sponsorshipPrograms.yearlyCost")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {programsQuery.data?.result.map((program) => (
              <TableRow
                key={program.id}
                className="cursor-pointer"
                onClick={() =>
                  navigate({
                    to: "/sponsorships/programs/$programId",
                    params: { programId: program.id },
                  })
                }
              >
                <TableCell className="font-medium">{program.name}</TableCell>
                <TableCell>{formatCurrency(program.yearlyCost)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </PageContent>
  );
}
