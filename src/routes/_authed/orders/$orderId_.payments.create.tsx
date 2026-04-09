import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useFeatureAccess } from "@/lib/useFeatureAccess";
import { apiClient } from "@/api/client";
import { PageContent } from "@/components/PageContent";
import {
  ScopedPaymentForm,
  type ScopedPaymentFormData,
} from "@/components/ScopedPaymentForm";

export const Route = createFileRoute(
  "/_authed/orders/$orderId_/payments/create",
)({
  component: CreateOrderPayment,
});

function CreateOrderPayment() {
  const { t } = useTranslation();
  const { canWrite } = useFeatureAccess("commerce");
  const { orderId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: ScopedPaymentFormData) => {
      const response = await apiClient.POST(
        "/v1/orders/byId/{orderId}/payments",
        {
          params: { path: { orderId } },
          body: {
            date: new Date(data.date).toISOString(),
            amount: data.amount,
            currency: data.currency,
            method: data.method,
            notes: data.notes || undefined,
          },
        },
      );
      if (response.error) throw new Error("Failed to create payment");
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      navigate({
        to: "/orders/$orderId",
        params: { orderId },
      });
    },
  });

  if (!canWrite) {
    navigate({ to: "/orders/$orderId", params: { orderId } });
    return null;
  }

  return (
    <PageContent
      title={t("payments.addPayment")}
      showBackButton
      backTo={() => navigate({ to: "/orders/$orderId", params: { orderId } })}
    >
      <ScopedPaymentForm
        onSubmit={(data) => createMutation.mutate(data)}
        isSubmitting={createMutation.isPending}
      />
    </PageContent>
  );
}
