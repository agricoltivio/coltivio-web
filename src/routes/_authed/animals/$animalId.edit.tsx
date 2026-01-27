import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { animalsQueryOptions, animalQueryOptions } from "@/api/animals.queries";
import { availableEarTagsQueryOptions } from "@/api/earTags.queries";
import { type Animal, type AvailableEarTag } from "@/api/types";
import { PageContent } from "@/components/PageContent";
import { AnimalForm, type AnimalFormData } from "@/components/AnimalForm";

export const Route = createFileRoute("/_authed/animals/$animalId/edit")({
  loader: ({ params, context: { queryClient } }) => {
    return Promise.all([
      queryClient.ensureQueryData(animalQueryOptions(params.animalId)),
      queryClient.ensureQueryData(animalsQueryOptions()),
      queryClient.ensureQueryData(availableEarTagsQueryOptions()),
    ]);
  },
  component: EditAnimal,
});

// Build ear tag options, including current animal's ear tag if editing
function buildEarTagOptions(
  available: AvailableEarTag[],
  currentAnimal?: Animal,
): { value: string; label: string }[] {
  const options = available.map((earTag) => ({
    value: earTag.id,
    label: earTag.number,
  }));
  // Add current ear tag if editing and not in available list
  if (
    currentAnimal?.earTag &&
    !options.find((o) => o.value === currentAnimal.earTag!.id)
  ) {
    options.unshift({
      value: currentAnimal.earTag.id,
      label: currentAnimal.earTag.number,
    });
  }
  return options;
}

// Build parent options filtered by sex, excluding current animal
function buildParentOptions(
  animals: Animal[],
  excludeId: string | undefined,
  sex: "male" | "female",
): { value: string; label: string }[] {
  return animals
    .filter((animal) => animal.id !== excludeId && animal.sex === sex)
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

function EditAnimal() {
  const { t } = useTranslation();
  const { animalId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Data already loaded by loader
  const animal = useQuery(animalQueryOptions(animalId)).data!;
  const allAnimals = useQuery(animalsQueryOptions()).data!;
  const availableEarTags = useQuery(availableEarTagsQueryOptions()).data!;

  // Build combobox options
  const earTagOptions = buildEarTagOptions(availableEarTags.result, animal);
  const motherOptions = buildParentOptions(
    allAnimals.result,
    animalId,
    "female",
  );
  const fatherOptions = buildParentOptions(allAnimals.result, animalId, "male");

  const updateMutation = useMutation({
    mutationFn: async (data: AnimalFormData) => {
      const response = await apiClient.PATCH("/v1/animals/byId/{animalId}", {
        params: { path: { animalId } },
        body: formDataToApiBody(data),
      });
      if (response.error) {
        throw new Error("Failed to update animal");
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["animals"] });
      queryClient.invalidateQueries({ queryKey: ["earTags"] });
      navigate({ to: "/animals/$animalId", params: { animalId } });
    },
  });

  return (
    <PageContent title={t("animals.editAnimal")} showBackButton>
      <AnimalForm
        animal={animal}
        earTagOptions={earTagOptions}
        motherOptions={motherOptions}
        fatherOptions={fatherOptions}
        onSubmit={(data) => updateMutation.mutate(data)}
        isSubmitting={updateMutation.isPending}
      />
    </PageContent>
  );
}
