import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { animalsQueryOptions } from "@/api/animals.queries";
import { herdsQueryOptions } from "@/api/herds.queries";
import { treatmentsQueryOptions } from "@/api/treatments.queries";
import {
  parasiteCheckQueryOptions,
  parasiteChecksQueryOptions,
} from "@/api/parasiteChecks.queries";
import { PageContent } from "@/components/PageContent";
import {
  ParasiteCheckForm,
  type ParasiteCheckFormSubmit,
} from "@/components/parasites/ParasiteCheckForm";

export const Route = createFileRoute("/_authed/parasite-checks/$checkId/edit")({
  loader: ({ params, context: { queryClient } }) => {
    queryClient.ensureQueryData(parasiteCheckQueryOptions(params.checkId));
    queryClient.ensureQueryData(animalsQueryOptions(false));
    queryClient.ensureQueryData(herdsQueryOptions());
    queryClient.ensureQueryData(treatmentsQueryOptions());
    queryClient.ensureQueryData(parasiteChecksQueryOptions());
  },
  component: EditParasiteCheckPage,
});

function EditParasiteCheckPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { checkId } = Route.useParams();

  const checkQuery = useQuery(parasiteCheckQueryOptions(checkId));
  const animalsQuery = useQuery(animalsQueryOptions(false));
  const herdsQuery = useQuery(herdsQueryOptions());
  const treatmentsQuery = useQuery(treatmentsQueryOptions());
  const checksQuery = useQuery(parasiteChecksQueryOptions());

  const updateMutation = useMutation({
    mutationFn: async ({ body }: ParasiteCheckFormSubmit) => {
      const response = await apiClient.PATCH("/v1/parasiteChecks/byId/{checkId}", {
        params: { path: { checkId } },
        body,
      });
      if (response.error) {
        throw new Error("Failed to update parasite check");
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parasiteChecks"] });
      navigate({ to: "/parasite-checks/$checkId", params: { checkId }, replace: true });
    },
  });

  if (!checkQuery.data || !checksQuery.data || !animalsQuery.data) {
    return (
      <PageContent title={t("parasiteChecks.editCheck")}>
        <div className="py-8 text-center text-muted-foreground">{t("common.loading")}</div>
      </PageContent>
    );
  }

  return (
    <PageContent title={t("parasiteChecks.editCheck")} showBackButton>
      <ParasiteCheckForm
        check={checkQuery.data}
        animals={animalsQuery.data.result}
        herds={herdsQuery.data?.result ?? []}
        treatments={treatmentsQuery.data?.result ?? []}
        checks={checksQuery.data}
        onSubmit={(submit) => updateMutation.mutate(submit)}
        isSubmitting={updateMutation.isPending}
      />
      {updateMutation.isError && (
        <p className="mt-4 text-sm text-destructive">{t("parasiteChecks.saveFailed")}</p>
      )}
    </PageContent>
  );
}
