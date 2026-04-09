import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useFeatureAccess } from "@/lib/useFeatureAccess";
import { sponsorshipPaymentQueryOptions } from "@/api/payments.queries";
import { apiClient } from "@/api/client";
import { PageContent } from "@/components/PageContent";
import {
  ScopedPaymentForm,
  type ScopedPaymentFormData,
} from "@/components/ScopedPaymentForm";

export const Route = createFileRoute(
  "/_authed/sponsorships/$sponsorshipId_/payments/$paymentId/edit",
)({
  loader: ({ params, context: { queryClient } }) => {
    return queryClient.ensureQueryData(
      sponsorshipPaymentQueryOptions(params.sponsorshipId, params.paymentId),
    );
  },
  component: EditSponsorshipPayment,
});

function EditSponsorshipPayment() {
  const { t } = useTranslation();
  const { canWrite } = useFeatureAccess("commerce");
  const { sponsorshipId, paymentId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const payment = useQuery(
    sponsorshipPaymentQueryOptions(sponsorshipId, paymentId),
  ).data!;

  const updateMutation = useMutation({
    mutationFn: async (data: ScopedPaymentFormData) => {
      const response = await apiClient.PATCH(
        "/v1/sponsorships/byId/{sponsorshipId}/payments/byId/{paymentId}",
        {
          params: { path: { sponsorshipId, paymentId } },
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
      queryClient.invalidateQueries({ queryKey: ["sponsorships"] });
      queryClient.invalidateQueries({
        queryKey: [
          "sponsorships",
          "byId",
          sponsorshipId,
          "payments",
          "byId",
          paymentId,
        ],
      });
      navigate({
        to: "/sponsorships/$sponsorshipId/payments/$paymentId",
        params: { sponsorshipId, paymentId },
      });
    },
  });

  if (!canWrite) {
    navigate({
      to: "/sponsorships/$sponsorshipId/payments/$paymentId",
      params: { sponsorshipId, paymentId },
    });
    return null;
  }

  return (
    <PageContent
      title={t("payments.editPayment")}
      showBackButton
      backTo={() =>
        navigate({
          to: "/sponsorships/$sponsorshipId/payments/$paymentId",
          params: { sponsorshipId, paymentId },
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
