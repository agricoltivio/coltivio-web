import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { apiClient } from "@/api/client";
import { contactsQueryOptions } from "@/api/contacts.queries";
import { sponsorshipsQueryOptions } from "@/api/sponsorships.queries";
import { ordersQueryOptions } from "@/api/orders.queries";
import { PageContent } from "@/components/PageContent";
import { PaymentForm, type PaymentFormData } from "@/components/PaymentForm";

const searchSchema = z.object({
  contactId: z.string().optional(),
  sponsorshipId: z.string().optional(),
  orderId: z.string().optional(),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/_authed/payments/create")({
  validateSearch: searchSchema,
  loader: ({ context: { queryClient } }) => {
    return Promise.all([
      queryClient.ensureQueryData(contactsQueryOptions()),
      queryClient.ensureQueryData(sponsorshipsQueryOptions()),
      queryClient.ensureQueryData(ordersQueryOptions()),
    ]);
  },
  component: CreatePayment,
});

function formDataToApiBody(data: PaymentFormData) {
  return {
    contactId: data.contactId,
    sponsorshipId: data.sponsorshipId || undefined,
    orderId: data.orderId || undefined,
    date: new Date(data.date).toISOString(),
    amount: data.amount,
    currency: data.currency,
    method: data.method,
    notes: data.notes || undefined,
  };
}

function CreatePayment() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { contactId, sponsorshipId, orderId, redirect } = Route.useSearch();

  // Data already loaded by loader
  const contacts = useQuery(contactsQueryOptions()).data!;
  const sponsorships = useQuery(sponsorshipsQueryOptions()).data!;
  const orders = useQuery(ordersQueryOptions()).data!;

  // Build combobox options
  const contactOptions = contacts.result.map((contact) => ({
    value: contact.id,
    label: `${contact.firstName} ${contact.lastName}`,
  }));
  const sponsorshipOptions = sponsorships.result.map((sponsorship) => ({
    value: sponsorship.id,
    label: `${sponsorship.contact.firstName} ${sponsorship.contact.lastName} - ${sponsorship.animal.name}`,
  }));
  const orderOptions = orders.result.map((order) => ({
    value: order.id,
    label: `${order.contact.firstName} ${order.contact.lastName} - ${new Date(order.orderDate).toLocaleDateString()}`,
  }));

  const createMutation = useMutation({
    mutationFn: async (data: PaymentFormData) => {
      const response = await apiClient.POST("/v1/payments", {
        body: formDataToApiBody(data),
      });
      if (response.error) {
        throw new Error("Failed to create payment");
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["sponsorships"] });
      if (redirect) {
        navigate({ to: redirect });
      } else {
        navigate({ to: "/payments" });
      }
    },
  });

  return (
    <PageContent
      title={t("payments.addPayment")}
      showBackButton
      backTo={() => navigate({ to: redirect ?? "/payments" })}
    >
      <PaymentForm
        contactOptions={contactOptions}
        sponsorshipOptions={sponsorshipOptions}
        orderOptions={orderOptions}
        onSubmit={(data) => createMutation.mutate(data)}
        isSubmitting={createMutation.isPending}
        defaultValues={{ contactId, sponsorshipId, orderId }}
      />
    </PageContent>
  );
}
