import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { seedQueryOptions } from "@/api/seeds.queries";
import { PageContent } from "@/components/PageContent";
import {
  SEED_FORM_NONE,
  SeedForm,
  seedDefaultRateFromForm,
  type SeedFormData,
} from "@/components/SeedForm";

export const Route = createFileRoute(
  "/_authed/field-calendar/seeds_/$seedId_/edit",
)({
  loader: ({ params, context: { queryClient } }) => {
    return queryClient.ensureQueryData(seedQueryOptions(params.seedId));
  },
  component: EditSeedPage,
});

function EditSeedPage() {
  const { t } = useTranslation();
  const { seedId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const seed = useQuery(seedQueryOptions(seedId)).data!;

  const updateMutation = useMutation({
    mutationFn: async (data: SeedFormData) => {
      const response = await apiClient.PATCH("/v1/seeds/byId/{seedId}", {
        params: { path: { seedId } },
        body: {
          name: data.name,
          cropId: data.cropId,
          ...seedDefaultRateFromForm(data),
          description: data.description || null,
        },
      });
      if (response.error) {
        throw new Error("Failed to update seed");
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seeds"] });
      navigate({ to: "/field-calendar/seeds/$seedId", params: { seedId } });
    },
  });

  return (
    <PageContent
      title={t("seeds.editSeed")}
      showBackButton
      backTo={() =>
        navigate({ to: "/field-calendar/seeds/$seedId", params: { seedId } })
      }
    >
      <SeedForm
        defaultValues={{
          name: seed.name,
          cropId: seed.cropId,
          quantityKind: seed.quantityKind,
          defaultAmount: seed.defaultAmount?.toString() ?? "",
          defaultUnit: seed.defaultUnit ?? SEED_FORM_NONE,
          description: seed.description ?? "",
        }}
        quantityKindLocked
        submitLabel={t("common.save")}
        submitting={updateMutation.isPending}
        onSubmit={(data) => updateMutation.mutate(data)}
        onCancel={() =>
          navigate({ to: "/field-calendar/seeds/$seedId", params: { seedId } })
        }
      />
    </PageContent>
  );
}
