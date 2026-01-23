import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { animalsQueryOptions } from "@/api/animals.queries";
import { contactsQueryOptions } from "@/api/contacts.queries";
import { sponsorshipProgramsQueryOptions } from "@/api/sponsorshipPrograms.queries";
import { PageContent } from "@/components/PageContent";
import {
  SponsorshipForm,
  type SponsorshipFormData,
} from "@/components/SponsorshipForm";

export const Route = createFileRoute("/_authed/sponsorships/create")({
  loader: ({ context: { queryClient } }) => {
    return Promise.all([
      queryClient.ensureQueryData(contactsQueryOptions()),
      queryClient.ensureQueryData(animalsQueryOptions()),
      queryClient.ensureQueryData(sponsorshipProgramsQueryOptions()),
    ]);
  },
  component: CreateSponsorship,
});

function formDataToApiBody(data: SponsorshipFormData) {
  return {
    contactId: data.contactId,
    animalId: data.animalId,
    sponsorshipProgramId: data.sponsorshipProgramId,
    startDate: new Date(data.startDate).toISOString(),
    endDate: data.endDate ? new Date(data.endDate).toISOString() : undefined,
    notes: data.notes || undefined,
    preferredCommunication: data.preferredCommunication || undefined,
  };
}

function CreateSponsorship() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Data already loaded by loader
  const contacts = useQuery(contactsQueryOptions()).data!;
  const animals = useQuery(animalsQueryOptions()).data!;
  const types = useQuery(sponsorshipProgramsQueryOptions()).data!;

  // Build combobox options
  const contactOptions = contacts.result.map((contact) => ({
    value: contact.id,
    label: `${contact.firstName} ${contact.lastName}`,
  }));
  const animalOptions = animals.result.map((animal) => ({
    value: animal.id,
    label: animal.name,
  }));
  const typeOptions = types.result.map((type) => ({
    value: type.id,
    label: type.name,
  }));

  const createMutation = useMutation({
    mutationFn: async (data: SponsorshipFormData) => {
      const response = await apiClient.POST("/v1/sponsorships", {
        body: formDataToApiBody(data),
      });
      if (response.error) {
        throw new Error("Failed to create sponsorship");
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sponsorships"] });
      navigate({ to: "/sponsorships" });
    },
  });

  return (
    <PageContent title={t("sponsorships.createSponsorship")} showBackButton>
      <SponsorshipForm
        contactOptions={contactOptions}
        animalOptions={animalOptions}
        typeOptions={typeOptions}
        onSubmit={(data) => createMutation.mutate(data)}
        isSubmitting={createMutation.isPending}
      />
    </PageContent>
  );
}
