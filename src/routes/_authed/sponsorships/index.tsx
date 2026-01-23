import { sponsorshipsQueryOptions } from "@/api/sponsorships.queries";
import { PageContent } from "@/components/PageContent";
import { Badge } from "@/components/ui/badge";
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

export const Route = createFileRoute("/_authed/sponsorships/")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(sponsorshipsQueryOptions());
  },
  component: Sponsorships,
});

function Sponsorships() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const sponsorshipsQuery = useQuery(sponsorshipsQueryOptions());

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString();
  }

  function isActive(sponsorship: { endDate: string | null }) {
    if (!sponsorship.endDate) return true;
    return new Date(sponsorship.endDate) > new Date();
  }

  return (
    <PageContent title={t("sponsorships.title")} showBackButton={false}>
      <div className="flex-col">
        <div className="flex justify-end">
          <Button onClick={() => navigate({ to: "/sponsorships/create" })}>
            Erfassen
          </Button>
        </div>
        <Table className="mt-3">
          <TableHeader>
            <TableRow>
              <TableHead>{t("sponsorships.contact")}</TableHead>
              <TableHead>{t("sponsorships.animal")}</TableHead>
              <TableHead>{t("sponsorships.startDate")}</TableHead>
              <TableHead>{t("sponsorships.endDate")}</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sponsorshipsQuery.data?.result.map((sponsorship) => (
              <TableRow
                key={sponsorship.id}
                className="cursor-pointer"
                onClick={() =>
                  navigate({
                    to: "/sponsorships/$sponsorshipId",
                    params: { sponsorshipId: sponsorship.id },
                  })
                }
              >
                <TableCell className="font-medium">
                  {sponsorship.contact.firstName} {sponsorship.contact.lastName}
                </TableCell>
                <TableCell>{sponsorship.animal.name}</TableCell>
                <TableCell>{formatDate(sponsorship.startDate)}</TableCell>
                <TableCell>
                  {sponsorship.endDate ? formatDate(sponsorship.endDate) : "-"}
                </TableCell>
                <TableCell>
                  {isActive(sponsorship) ? (
                    <Badge variant="default">{t("sponsorships.active")}</Badge>
                  ) : (
                    <Badge variant="secondary">{t("sponsorships.ended")}</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </PageContent>
  );
}
