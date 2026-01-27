import { animalsQueryOptions } from "@/api/animals.queries";
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
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { useTranslation } from "react-i18next";
import z from "zod";

const animalSearchSchema = z.object({
  page: fallback(z.number(), 1).default(1),
  filter: fallback(z.string(), "").default(""),
  onlyLiving: fallback(z.boolean(), true).default(true),
});

export const Route = createFileRoute("/_authed/animals/")({
  loaderDeps: ({ search: { onlyLiving } }) => ({ onlyLiving }),
  loader: ({ deps, context: { queryClient } }) => {
    queryClient.ensureQueryData(animalsQueryOptions(deps.onlyLiving));
  },
  validateSearch: zodValidator(animalSearchSchema),
  component: Animals,
});

function Animals() {
  const { t } = useTranslation();
  const { onlyLiving } = Route.useSearch();
  const navigate = useNavigate();
  const animalsQuery = useQuery(animalsQueryOptions(onlyLiving));

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString();
  }

  return (
    <PageContent title="Tiere">
      <div className="flex-col">
        <div className="flex justify-end">
          <Button onClick={() => navigate({ to: "/animals/create" })}>
            Erfassen
          </Button>
        </div>
        <Table className="mt-3">
          <TableHeader>
            <TableRow>
              <TableHead>{t("animals.name")}</TableHead>
              <TableHead> {t("animals.type")}</TableHead>
              <TableHead> {t("animals.earTag")}</TableHead>
              <TableHead> {t("animals.dateOfBirth")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {animalsQuery.data?.result.map((animal) => (
              <TableRow
                key={animal.id}
                className="cursor-pointer"
                onClick={() =>
                  navigate({
                    to: "/animals/$animalId",
                    params: { animalId: animal.id },
                  })
                }
              >
                <TableCell className="font-medium">{animal.name}</TableCell>
                <TableCell>{t(`animals.types.${animal.type}`)}</TableCell>
                <TableCell>{animal.earTag?.number}</TableCell>
                <TableCell>
                  {animal.dateOfBirth ? formatDate(animal.dateOfBirth) : "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </PageContent>
  );
}
