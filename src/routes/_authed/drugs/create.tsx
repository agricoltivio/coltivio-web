import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { PageContent } from "@/components/PageContent";
import { DrugForm, type DrugFormData } from "@/components/DrugForm";

export const Route = createFileRoute("/_authed/drugs/create")({
  component: CreateDrug,
});

function formDataToApiBody(data: DrugFormData) {
  return {
    name: data.name,
    notes: data.notes || undefined,
    isAntibiotic: data.isAntibiotic,
    criticalAntibiotic: data.criticalAntibiotic,
    receivedFrom: data.receivedFrom,
    drugTreatment: data.drugTreatment,
  };
}

function CreateDrug() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: DrugFormData) => {
      const response = await apiClient.POST("/v1/drugs", {
        body: formDataToApiBody(data),
      });
      if (response.error) {
        throw new Error("Failed to create drug");
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drugs"] });
      navigate({ to: "/drugs" });
    },
  });

  return (
    <PageContent title={t("drugs.createDrug")} showBackButton backTo={() => navigate({ to: "/drugs" })}>
      <DrugForm
        onSubmit={(data) => createMutation.mutate(data)}
        isSubmitting={createMutation.isPending}
      />
    </PageContent>
  );
}
