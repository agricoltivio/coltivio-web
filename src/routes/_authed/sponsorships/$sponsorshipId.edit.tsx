import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { animalsQueryOptions } from "@/api/animals.queries";
import { contactsQueryOptions } from "@/api/contacts.queries";
import { sponsorshipProgramsQueryOptions } from "@/api/sponsorshipPrograms.queries";
import { sponsorshipQueryOptions } from "@/api/sponsorships.queries";
import { PageContent } from "@/components/PageContent";
import {
  SponsorshipForm,
  type SponsorshipFormData,
} from "@/components/SponsorshipForm";

export const Route = createFileRoute(
  "/_authed/sponsorships/$sponsorshipId/edit",
)({
  loader: ({ params, context: { queryClient } }) => {
    return Promise.all([
      queryClient.ensureQueryData(
        sponsorshipQueryOptions(params.sponsorshipId),
      ),
      queryClient.ensureQueryData(contactsQueryOptions()),
      queryClient.ensureQueryData(animalsQueryOptions()),
      queryClient.ensureQueryData(sponsorshipProgramsQueryOptions()),
    ]);
  },
  component: EditSponsorship,
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

function EditSponsorship() {
  const { t } = useTranslation();
  const { sponsorshipId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Data already loaded by loader
  const sponsorship = useQuery(sponsorshipQueryOptions(sponsorshipId)).data!;
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

  const updateMutation = useMutation({
    mutationFn: async (data: SponsorshipFormData) => {
      const response = await apiClient.PATCH(
        "/v1/sponsorships/byId/{sponsorshipId}",
        {
          params: { path: { sponsorshipId } },
          body: formDataToApiBody(data),
        },
      );
      if (response.error) {
        throw new Error("Failed to update sponsorship");
      }
      return response.data.data;
    },
    onSuccess: () => {
      navigate({
        to: "/sponsorships/$sponsorshipId",
        params: { sponsorshipId },
      });
      queryClient.invalidateQueries({ queryKey: ["sponsorships"] });
    },
  });

  return (
    <PageContent title={t("sponsorships.editSponsorship")} showBackButton backTo={() => navigate({ to: "/sponsorships/$sponsorshipId", params: { sponsorshipId } })}>
      <SponsorshipForm
        sponsorship={sponsorship}
        contactOptions={contactOptions}
        animalOptions={animalOptions}
        typeOptions={typeOptions}
        onSubmit={(data) => updateMutation.mutate(data)}
        isSubmitting={updateMutation.isPending}
      />
    </PageContent>
  );
}
