import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { animalsQueryOptions } from "@/api/animals.queries";
import { availableEarTagsQueryOptions } from "@/api/earTags.queries";
import { type Animal } from "@/api/types";
import { PageContent } from "@/components/PageContent";
import { AnimalForm, type AnimalFormData } from "@/components/AnimalForm";

export const Route = createFileRoute("/_authed/animals/create")({
  loader: ({ context: { queryClient } }) => {
    return Promise.all([
      queryClient.ensureQueryData(animalsQueryOptions()),
      queryClient.ensureQueryData(availableEarTagsQueryOptions()),
    ]);
  },
  component: CreateAnimal,
});

// Build parent options filtered by sex
function buildParentOptions(
  animals: Animal[],
  sex: "male" | "female",
): { value: string; label: string }[] {
  return animals
    .filter((animal) => animal.sex === sex)
    .map((animal) => ({ value: animal.id, label: animal.name }));
}

// Convert form data to API body
function formDataToApiBody(data: AnimalFormData) {
  return {
    name: data.name,
    type: data.type,
    sex: data.sex,
    dateOfBirth: data.dateOfBirth
      ? new Date(data.dateOfBirth).toISOString()
      : undefined,
    earTagId: data.earTagId || undefined,
    motherId: data.motherId || undefined,
    fatherId: data.fatherId || undefined,
    dateOfDeath: data.dateOfDeath
      ? new Date(data.dateOfDeath).toISOString()
      : undefined,
    deathReason: data.deathReason || undefined,
  };
}

function CreateAnimal() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Data already loaded by loader
  const allAnimals = useQuery(animalsQueryOptions()).data!;
  const availableEarTags = useQuery(availableEarTagsQueryOptions()).data!;

  // Build combobox options
  const earTagOptions = availableEarTags.result.map((earTag) => ({
    value: earTag.id,
    label: earTag.number,
  }));
  const motherOptions = buildParentOptions(allAnimals.result, "female");
  const fatherOptions = buildParentOptions(allAnimals.result, "male");

  const createMutation = useMutation({
    mutationFn: async (data: AnimalFormData) => {
      const response = await apiClient.POST("/v1/animals", {
        body: formDataToApiBody(data),
      });
      if (response.error) {
        throw new Error("Failed to create animal");
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["animals"] });
      queryClient.invalidateQueries({ queryKey: ["earTags"] });
      navigate({ to: "/animals" });
    },
  });

  return (
    <PageContent title={t("animals.createAnimal")} showBackButton>
      <AnimalForm
        earTagOptions={earTagOptions}
        motherOptions={motherOptions}
        fatherOptions={fatherOptions}
        onSubmit={(data) => createMutation.mutate(data)}
        isSubmitting={createMutation.isPending}
      />
    </PageContent>
  );
}
