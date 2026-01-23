import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { apiClient } from "@/api/client";
import { contactsQueryOptions } from "@/api/contacts.queries";
import { sponsorshipsQueryOptions } from "@/api/sponsorships.queries";
import { ordersQueryOptions } from "@/api/orders.queries";
import { paymentQueryOptions } from "@/api/payments.queries";
import { PageContent } from "@/components/PageContent";
import { PaymentForm, type PaymentFormData } from "@/components/PaymentForm";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/_authed/payments/$paymentId/edit")({
  validateSearch: searchSchema,
  loader: ({ params, context: { queryClient } }) => {
    return Promise.all([
      queryClient.ensureQueryData(paymentQueryOptions(params.paymentId)),
      queryClient.ensureQueryData(contactsQueryOptions()),
      queryClient.ensureQueryData(sponsorshipsQueryOptions()),
      queryClient.ensureQueryData(ordersQueryOptions()),
    ]);
  },
  component: EditPayment,
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

function EditPayment() {
  const { t } = useTranslation();
  const { paymentId } = Route.useParams();
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Data already loaded by loader
  const payment = useQuery(paymentQueryOptions(paymentId)).data!;
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

  const updateMutation = useMutation({
    mutationFn: async (data: PaymentFormData) => {
      const response = await apiClient.PATCH("/v1/payments/byId/{paymentId}", {
        params: { path: { paymentId } },
        body: formDataToApiBody(data),
      });
      if (response.error) {
        throw new Error("Failed to update payment");
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
        navigate({ to: "/payments/$paymentId", params: { paymentId } });
      }
    },
  });

  return (
    <PageContent title={t("payments.editPayment")} showBackButton>
      <PaymentForm
        payment={payment}
        contactOptions={contactOptions}
        sponsorshipOptions={sponsorshipOptions}
        orderOptions={orderOptions}
        onSubmit={(data) => updateMutation.mutate(data)}
        isSubmitting={updateMutation.isPending}
      />
    </PageContent>
  );
}
