import { toLocalDateString } from "@/lib/utils";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { animalsQueryOptions } from "@/api/animals.queries";
import { availableEarTagsQueryOptions } from "@/api/earTags.queries";
import { ANIMAL_TYPES, type Animal } from "@/api/types";
import { PageContent } from "@/components/PageContent";
import { AnimalForm, type AnimalFormData } from "@/components/AnimalForm";

export const Route = createFileRoute("/_authed/animals/create")({
  // Set when creating offspring from a parent's detail page
  validateSearch: z.object({
    motherId: z.string().optional(),
    fatherId: z.string().optional(),
    type: z.string().optional(),
  }),
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
): { value: string; label: string; description?: string }[] {
  return animals
    .filter((animal) => animal.sex === sex)
    .map((animal) => ({
      value: animal.id,
      label: animal.name,
      description: animal.earTag?.number,
    }));
}

// Convert form data to API body
function formDataToApiBody(data: AnimalFormData) {
  return {
    name: data.name,
    type: data.type,
    sex: data.sex,
    dateOfBirth: data.dateOfBirth || toLocalDateString(new Date()),
    earTagId: data.earTagId || undefined,
    motherId: data.motherId || undefined,
    fatherId: data.fatherId || undefined,
    dateOfDeath: data.dateOfDeath
      ? data.dateOfDeath
      : undefined,
    deathReason: data.deathReason || undefined,
    registered: data.registered,
    usage: data.usage,
    // An emptied field clears the value
    color: data.color.trim() || null,
    notes: data.notes.trim() || null,
  };
}

function CreateAnimal() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { motherId, fatherId, type } = Route.useSearch();
  const presetType = ANIMAL_TYPES.find((animalType) => animalType === type);
  // When creating offspring, go back to the parent instead of the animal list
  const parentAnimalId = motherId ?? fatherId;
  function navigateBack() {
    if (parentAnimalId) {
      navigate({
        to: "/animals/$animalId",
        params: { animalId: parentAnimalId },
      });
    } else {
      navigate({ to: "/animals" });
    }
  }

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
      navigateBack();
    },
  });

  return (
    <PageContent title={t("animals.createAnimal")} showBackButton backTo={navigateBack}>
      <AnimalForm
        earTagOptions={earTagOptions}
        motherOptions={motherOptions}
        fatherOptions={fatherOptions}
        initialValues={{
          ...(presetType ? { type: presetType } : {}),
          ...(motherId ? { motherId } : {}),
          ...(fatherId ? { fatherId } : {}),
        }}
        onSubmit={(data) => createMutation.mutate(data)}
        isSubmitting={createMutation.isPending}
      />
    </PageContent>
  );
}
