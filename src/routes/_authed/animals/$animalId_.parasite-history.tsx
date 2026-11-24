import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { animalQueryOptions } from "@/api/animals.queries";
import { animalParasiteHistoryQueryOptions } from "@/api/parasiteChecks.queries";
import { PageContent } from "@/components/PageContent";
import { AnimalParasiteHistory } from "@/components/parasites/AnimalParasiteHistory";
import { animalDisplayName } from "@/components/parasites/ParasiteCharts";

// Kept for existing links; the animal page shows the same history inline
export const Route = createFileRoute(
  "/_authed/animals/$animalId_/parasite-history",
)({
  loader: ({ params, context: { queryClient } }) => {
    queryClient.ensureQueryData(animalQueryOptions(params.animalId));
    queryClient.ensureQueryData(
      animalParasiteHistoryQueryOptions(params.animalId),
    );
  },
  component: AnimalParasiteHistoryPage,
});

function AnimalParasiteHistoryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { animalId } = Route.useParams();
  const animal = useQuery(animalQueryOptions(animalId)).data;

  return (
    <PageContent
      title={t("parasiteChecks.parasiteHistory")}
      description={
        animal
          ? animalDisplayName(animal.name, animal.earTag?.number)
          : undefined
      }
      showBackButton
      backTo={() =>
        navigate({ to: "/animals/$animalId", params: { animalId } })
      }
    >
      <AnimalParasiteHistory animalId={animalId} />
    </PageContent>
  );
}
