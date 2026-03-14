import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { contactQueryOptions } from "@/api/contacts.queries";
import { PageContent } from "@/components/PageContent";
import { ContactForm, type ContactFormData } from "@/components/ContactForm";

export const Route = createFileRoute("/_authed/contacts/$contactId/edit")({
  loader: ({ params, context: { queryClient } }) => {
    return queryClient.ensureQueryData(contactQueryOptions(params.contactId));
  },
  component: EditContact,
});

function formDataToApiBody(data: ContactFormData) {
  return {
    firstName: data.firstName,
    lastName: data.lastName,
    street: data.street || undefined,
    city: data.city || undefined,
    zip: data.zip || undefined,
    phone: data.phone || undefined,
    email: data.email || undefined,
    preferredCommunication: data.preferredCommunication || undefined,
    labels: data.labels,
  };
}

function EditContact() {
  const { t } = useTranslation();
  const { contactId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Data already loaded by loader
  const contact = useQuery(contactQueryOptions(contactId)).data!;

  const updateMutation = useMutation({
    mutationFn: async (data: ContactFormData) => {
      const response = await apiClient.PATCH("/v1/contacts/byId/{contactId}", {
        params: { path: { contactId } },
        body: formDataToApiBody(data),
      });
      if (response.error) {
        throw new Error("Failed to update contact");
      }
      return response.data.data;
    },
    onSuccess: () => {
      navigate({ to: "/contacts/$contactId", params: { contactId } });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });

  return (
    <PageContent title={t("contacts.editContact")} showBackButton backTo={() => navigate({ to: "/contacts/$contactId", params: { contactId } })}>
      <ContactForm
        contact={contact}
        onSubmit={(data) => updateMutation.mutate(data)}
        isSubmitting={updateMutation.isPending}
      />
    </PageContent>
  );
}
