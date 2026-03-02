import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { animalsQueryOptions } from "@/api/animals.queries";
import { drugsQueryOptions } from "@/api/drugs.queries";
import { PageContent } from "@/components/PageContent";
import {
  TreatmentForm,
  type TreatmentFormData,
} from "@/components/TreatmentForm";
import { z } from "zod";

const searchSchema = z.object({
  animalId: z.string().optional(),
  returnTo: z.string().optional(),
});

export const Route = createFileRoute("/_authed/treatments/create")({
  validateSearch: searchSchema,
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(animalsQueryOptions(true));
    queryClient.ensureQueryData(drugsQueryOptions());
  },
  component: CreateTreatment,
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

function CreateTreatment() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { animalId, returnTo } = Route.useSearch();

  const animalsQuery = useQuery(animalsQueryOptions(true));
  const drugsQuery = useQuery(drugsQueryOptions());

  const createMutation = useMutation({
    mutationFn: async (data: TreatmentFormData) => {
      const response = await apiClient.POST("/v1/treatments", {
        body: formDataToApiBody(data),
      });
      if (response.error) {
        throw new Error("Failed to create treatment");
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["treatments"] });
      queryClient.invalidateQueries({ queryKey: ["animals"] });
      if (returnTo) {
        navigate({ to: returnTo });
      } else {
        navigate({ to: "/animals/treatments-journal" });
      }
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
    <PageContent title={t("treatments.createTreatment")} showBackButton>
      <TreatmentForm
        animalOptions={animalOptions}
        drugOptions={drugOptions}
        drugs={drugsQuery.data?.result || []}
        animals={animalsQuery.data?.result || []}
        onSubmit={(data) => createMutation.mutate(data)}
        isSubmitting={createMutation.isPending}
        defaultValues={{ animalIds: animalId ? [animalId] : [] }}
      />
    </PageContent>
  );
}
