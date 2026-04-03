import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useFeatureAccess } from "@/lib/useFeatureAccess";
import { orderPaymentQueryOptions } from "@/api/payments.queries";
import { apiClient } from "@/api/client";
import { PageContent } from "@/components/PageContent";
import {
  ScopedPaymentForm,
  type ScopedPaymentFormData,
} from "@/components/ScopedPaymentForm";

export const Route = createFileRoute(
  "/_authed/orders/$orderId_/payments/$paymentId/edit",
)({
  loader: ({ params, context: { queryClient } }) => {
    return queryClient.ensureQueryData(
      orderPaymentQueryOptions(params.orderId, params.paymentId),
    );
  },
  component: EditOrderPayment,
});

function EditOrderPayment() {
  const { t } = useTranslation();
  const { canWrite } = useFeatureAccess("commerce");
  const { orderId, paymentId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const payment = useQuery(orderPaymentQueryOptions(orderId, paymentId)).data!;

  const updateMutation = useMutation({
    mutationFn: async (data: ScopedPaymentFormData) => {
      const response = await apiClient.PATCH(
        "/v1/orders/byId/{orderId}/payments/byId/{paymentId}",
        {
          params: { path: { orderId, paymentId } },
          body: {
            date: new Date(data.date).toISOString(),
            amount: data.amount,
            currency: data.currency,
            method: data.method,
            notes: data.notes || undefined,
          },
        },
      );
      if (response.error) throw new Error("Failed to update payment");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({
        queryKey: ["orders", "byId", orderId, "payments", "byId", paymentId],
      });
      navigate({
        to: "/orders/$orderId/payments/$paymentId",
        params: { orderId, paymentId },
      });
    },
  });

  if (!canWrite) {
    navigate({
      to: "/orders/$orderId/payments/$paymentId",
      params: { orderId, paymentId },
    });
    return null;
  }

  return (
    <PageContent
      title={t("payments.editPayment")}
      showBackButton
      backTo={() =>
        navigate({
          to: "/orders/$orderId/payments/$paymentId",
          params: { orderId, paymentId },
        })
      }
    >
      <ScopedPaymentForm
        payment={payment}
        onSubmit={(data) => updateMutation.mutate(data)}
        isSubmitting={updateMutation.isPending}
      />
    </PageContent>
  );
}
