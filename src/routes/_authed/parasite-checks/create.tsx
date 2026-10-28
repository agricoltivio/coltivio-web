import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { apiClient } from "@/api/client";
import { animalsQueryOptions } from "@/api/animals.queries";
import { herdsQueryOptions } from "@/api/herds.queries";
import { treatmentsQueryOptions } from "@/api/treatments.queries";
import { parasiteChecksQueryOptions } from "@/api/parasiteChecks.queries";
import { PageContent } from "@/components/PageContent";
import {
  ParasiteCheckForm,
  type ParasiteCheckFormSubmit,
} from "@/components/parasites/ParasiteCheckForm";

export const Route = createFileRoute("/_authed/parasite-checks/create")({
  validateSearch: z.object({
    previousCheckId: z.string().optional(),
  }),
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(animalsQueryOptions(false));
    queryClient.ensureQueryData(herdsQueryOptions());
    queryClient.ensureQueryData(treatmentsQueryOptions());
    queryClient.ensureQueryData(parasiteChecksQueryOptions());
  },
  component: CreateParasiteCheckPage,
});

function CreateParasiteCheckPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { previousCheckId } = Route.useSearch();

  const animalsQuery = useQuery(animalsQueryOptions(false));
  const herdsQuery = useQuery(herdsQueryOptions());
  const treatmentsQuery = useQuery(treatmentsQueryOptions());
  const checksQuery = useQuery(parasiteChecksQueryOptions());

  const createMutation = useMutation({
    mutationFn: async ({ body, followUpDueDate }: ParasiteCheckFormSubmit) => {
      const response = await apiClient.POST("/v1/parasiteChecks", {
        body: {
          ...body,
          followUp: followUpDueDate ? { dueDate: followUpDueDate } : undefined,
        },
      });
      if (response.error) {
        throw new Error("Failed to create parasite check");
      }
      return response.data.data;
    },
    onSuccess: (createdCheck) => {
      queryClient.invalidateQueries({ queryKey: ["parasiteChecks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      // A re-check returns to its base check, a base check to the overview of
      // its animal type (both replacing the form in the history)
      if (createdCheck.previousCheckId) {
        navigate({
          to: "/parasite-checks/$checkId",
          params: { checkId: createdCheck.previousCheckId },
          replace: true,
        });
      } else {
        navigate({
          to: "/animals/parasite-checks",
          search: { animalType: createdCheck.animalType ?? undefined },
          replace: true,
        });
      }
    },
  });

  // Wait for the base check, otherwise the re-check would start without its settings
  if (!checksQuery.data || !animalsQuery.data) {
    return (
      <PageContent title={t("parasiteChecks.newCheck")}>
        <div className="py-8 text-center text-muted-foreground">{t("common.loading")}</div>
      </PageContent>
    );
  }

  return (
    <PageContent title={t("parasiteChecks.newCheck")} showBackButton>
      <ParasiteCheckForm
        defaults={{ previousCheckId }}
        animals={animalsQuery.data.result}
        herds={herdsQuery.data?.result ?? []}
        treatments={treatmentsQuery.data?.result ?? []}
        checks={checksQuery.data}
        onSubmit={(submit) => createMutation.mutate(submit)}
        isSubmitting={createMutation.isPending}
      />
      {createMutation.isError && (
        <p className="mt-4 text-sm text-destructive">{t("parasiteChecks.saveFailed")}</p>
      )}
    </PageContent>
  );
}
