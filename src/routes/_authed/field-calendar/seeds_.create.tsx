import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { PageContent } from "@/components/PageContent";
import {
  SEED_FORM_NONE,
  SeedForm,
  seedDefaultRateFromForm,
  type SeedFormData,
} from "@/components/SeedForm";

export const Route = createFileRoute("/_authed/field-calendar/seeds_/create")({
  component: CreateSeedPage,
});

function CreateSeedPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: SeedFormData) => {
      const { defaultAmount, defaultUnit } = seedDefaultRateFromForm(data);
      const response = await apiClient.POST("/v1/seeds", {
        body: {
          name: data.name,
          cropId: data.cropId,
          quantityKind: data.quantityKind,
          defaultAmount: defaultAmount ?? undefined,
          defaultUnit: defaultUnit ?? undefined,
          description: data.description || undefined,
        },
      });
      if (response.error) {
        throw new Error("Failed to create seed");
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seeds"] });
      navigate({ to: "/field-calendar/seeds" });
    },
  });

  return (
    <PageContent
      title={t("seeds.createSeed")}
      showBackButton
      backTo={() => navigate({ to: "/field-calendar/seeds" })}
    >
      {createMutation.isError && (
        <p className="mb-4 text-sm text-destructive">
          {t("common.saveFailed")}
        </p>
      )}
      <SeedForm
        defaultValues={{
          name: "",
          cropId: "",
          quantityKind: "weight",
          defaultAmount: "",
          defaultUnit: SEED_FORM_NONE,
          description: "",
        }}
        quantityKindLocked={false}
        submitLabel={t("common.create")}
        submitting={createMutation.isPending}
        onSubmit={(data) => createMutation.mutate(data)}
        onCancel={() => navigate({ to: "/field-calendar/seeds" })}
      />
    </PageContent>
  );
}
