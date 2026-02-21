import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { drugQueryOptions } from "@/api/drugs.queries";
import { PageContent } from "@/components/PageContent";
import { DrugForm, type DrugFormData } from "@/components/DrugForm";

export const Route = createFileRoute("/_authed/drugs/$drugId/edit")({
  loader: ({ params, context: { queryClient } }) => {
    return queryClient.ensureQueryData(drugQueryOptions(params.drugId));
  },
  component: EditDrug,
});

function formDataToApiBody(data: DrugFormData) {
  return {
    name: data.name,
    notes: data.notes || undefined,
    drugTreatment: data.drugTreatment,
  };
}

function EditDrug() {
  const { t } = useTranslation();
  const { drugId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const drug = useQuery(drugQueryOptions(drugId)).data!;

  const updateMutation = useMutation({
    mutationFn: async (data: DrugFormData) => {
      const response = await apiClient.PATCH("/v1/drugs/byId/{drugId}", {
        params: { path: { drugId } },
        body: formDataToApiBody(data),
      });
      if (response.error) {
        throw new Error("Failed to update drug");
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drugs"] });
      navigate({ to: "/drugs/$drugId", params: { drugId } });
    },
  });

  return (
    <PageContent title={t("drugs.editDrug")} showBackButton>
      <DrugForm
        drug={drug}
        onSubmit={(data) => updateMutation.mutate(data)}
        isSubmitting={updateMutation.isPending}
      />
    </PageContent>
  );
}
