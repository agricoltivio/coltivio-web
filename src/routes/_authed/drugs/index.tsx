import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { drugsQueryOptions } from "@/api/drugs.queries";
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

export const Route = createFileRoute("/_authed/drugs/")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(drugsQueryOptions());
  },
  component: Drugs,
});

function Drugs() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const drugsQuery = useQuery(drugsQueryOptions());

  return (
    <PageContent title={t("drugs.title")} showBackButton={false}>
      <div className="flex-col">
        <div className="flex justify-end">
          <Button onClick={() => navigate({ to: "/drugs/create" })}>
            {t("common.create")}
          </Button>
        </div>
        <Table className="mt-3">
          <TableHeader>
            <TableRow>
              <TableHead>{t("drugs.name")}</TableHead>
              <TableHead>{t("drugs.animalTypes")}</TableHead>
              <TableHead>{t("drugs.notes")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {drugsQuery.data?.result.map((drug) => (
              <TableRow
                key={drug.id}
                className="cursor-pointer"
                onClick={() =>
                  navigate({
                    to: "/drugs/$drugId",
                    params: { drugId: drug.id },
                  })
                }
              >
                <TableCell className="font-medium">{drug.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {drug.drugTreatment
                    .map((dt) => t(`animals.types.${dt.animalType}`))
                    .join(", ") || "-"}
                </TableCell>
                <TableCell className="text-muted-foreground max-w-xs truncate">
                  {drug.notes || "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </PageContent>
  );
}
