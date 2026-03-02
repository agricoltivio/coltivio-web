import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { treatmentQueryOptions } from "@/api/treatments.queries";
import { animalsQueryOptions } from "@/api/animals.queries";
import { drugsQueryOptions } from "@/api/drugs.queries";
import { PageContent } from "@/components/PageContent";
import {
  TreatmentForm,
  type TreatmentFormData,
} from "@/components/TreatmentForm";

export const Route = createFileRoute("/_authed/treatments/$treatmentId/edit")({
  loader: ({ params, context: { queryClient } }) => {
    queryClient.ensureQueryData(treatmentQueryOptions(params.treatmentId));
    queryClient.ensureQueryData(animalsQueryOptions(true));
    queryClient.ensureQueryData(drugsQueryOptions());
  },
  component: EditTreatment,
});

function formDataToApiBody(data: TreatmentFormData) {
  return {
    animalIds: data.animalIds,
    drugId: data.drugId,
    startDate: new Date(data.startDate).toISOString(),
    endDate: new Date(data.endDate).toISOString(),
    name: data.name,
    notes: data.notes || undefined,
    milkUsableDate: data.milkUsableDate
      ? new Date(data.milkUsableDate).toISOString()
      : null,
    meatUsableDate: data.meatUsableDate
      ? new Date(data.meatUsableDate).toISOString()
      : null,
    organsUsableDate: data.organsUsableDate
      ? new Date(data.organsUsableDate).toISOString()
      : null,
    criticalAntibiotic: data.criticalAntibiotic,
    antibiogramAvailable: data.antibiogramAvailable,
  };
}

function EditTreatment() {
  const { t } = useTranslation();
  const { treatmentId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const treatment = useQuery(treatmentQueryOptions(treatmentId)).data!;
  const animalsQuery = useQuery(animalsQueryOptions(true));
  const drugsQuery = useQuery(drugsQueryOptions());

  const updateMutation = useMutation({
    mutationFn: async (data: TreatmentFormData) => {
      const response = await apiClient.PATCH(
        "/v1/treatments/byId/{treatmentId}",
        {
          params: { path: { treatmentId } },
          body: formDataToApiBody(data),
        },
      );
      if (response.error) {
        throw new Error("Failed to update treatment");
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["treatments"] });
      queryClient.invalidateQueries({ queryKey: ["animals"] });
      navigate({ to: "/treatments/$treatmentId", params: { treatmentId } });
    },
  });

  const animalOptions = (animalsQuery.data?.result || []).map((animal) => ({
    value: animal.id,
    label: `${animal.name} (${t(`animals.types.${animal.type}`)})`,
  }));

  const drugOptions = (drugsQuery.data?.result || []).map((drug) => ({
    value: drug.id,
    label: drug.name,
  }));

  return (
    <PageContent title={t("treatments.editTreatment")} showBackButton backTo={() => navigate({ to: "/treatments/$treatmentId", params: { treatmentId } })}>
      <TreatmentForm
        treatment={treatment}
        animalOptions={animalOptions}
        drugOptions={drugOptions}
        drugs={drugsQuery.data?.result || []}
        animals={animalsQuery.data?.result || []}
        onSubmit={(data) => updateMutation.mutate(data)}
        isSubmitting={updateMutation.isPending}
      />
    </PageContent>
  );
}
