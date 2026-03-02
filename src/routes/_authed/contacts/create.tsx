import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { PageContent } from "@/components/PageContent";
import { ContactForm, type ContactFormData } from "@/components/ContactForm";

export const Route = createFileRoute("/_authed/contacts/create")({
  component: CreateContact,
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

function CreateContact() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: ContactFormData) => {
      const response = await apiClient.POST("/v1/contacts", {
        body: formDataToApiBody(data),
      });
      if (response.error) {
        throw new Error("Failed to create contact");
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      navigate({ to: "/contacts" });
    },
  });

  return (
    <PageContent title={t("contacts.createContact")} showBackButton backTo={() => navigate({ to: "/contacts" })}>
      <ContactForm
        onSubmit={(data) => createMutation.mutate(data)}
        isSubmitting={createMutation.isPending}
      />
    </PageContent>
  );
}
