import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { paymentQueryOptions } from "@/api/payments.queries";
import { apiClient } from "@/api/client";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authed/payments/$paymentId/")({
  loader: ({ params, context: { queryClient } }) => {
    return queryClient.ensureQueryData(paymentQueryOptions(params.paymentId));
  },
  component: PaymentDetailPage,
});

function PaymentDetailPage() {
  const { t } = useTranslation();
  const { paymentId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const paymentQuery = useQuery(paymentQueryOptions(paymentId));

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.DELETE("/v1/payments/byId/{paymentId}", {
        params: { path: { paymentId } },
      });
      if (response.error) {
        throw new Error("Failed to delete payment");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      navigate({ to: "/payments" });
    },
  });

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString();
  }

  function formatCurrency(amount: number, currency: string) {
    return new Intl.NumberFormat("de-CH", {
      style: "currency",
      currency: currency,
    }).format(amount);
  }

  if (paymentQuery.isLoading) {
    return (
      <PageContent title={t("common.loading")}>
        <div className="py-8 text-center text-muted-foreground">
          {t("common.loading")}
        </div>
      </PageContent>
    );
  }

  if (paymentQuery.error || !paymentQuery.data) {
    return (
      <PageContent title={t("common.error")}>
        <div className="py-8 text-center text-destructive">
          {t("common.error")}
        </div>
      </PageContent>
    );
  }

  const payment = paymentQuery.data;
  const contactName = `${payment.contact.firstName} ${payment.contact.lastName}`;

  return (
    <PageContent title={t("payments.title")} showBackButton>
      {/* Header actions */}
      <div className="mb-6 flex items-center justify-end">
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to="/payments/$paymentId/edit" params={{ paymentId }}>
              {t("common.edit")}
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">{t("common.delete")}</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("common.confirm")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("payments.deleteConfirm")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  {t("common.delete")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("payments.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <DetailItem
                label={t("payments.date")}
                value={formatDate(payment.date)}
              />
              <DetailItem
                label={t("payments.contact")}
                value={
                  <Link
                    className="hover:underline text-blue-600 hover:text-blue-800"
                    to="/contacts/$contactId"
                    params={{ contactId: payment.contact.id }}
                  >
                    {contactName}
                  </Link>
                }
              />
              <DetailItem
                label={t("payments.amount")}
                value={formatCurrency(payment.amount, payment.currency)}
              />
              <DetailItem
                label={t("payments.method")}
                value={t(`payments.methods.${payment.method}`)}
              />
              {payment.sponsorshipId && (
                <DetailItem
                  label={t("payments.sponsorship")}
                  value={
                    <Link
                      className="hover:underline text-blue-600 hover:text-blue-800"
                      to="/sponsorships/$sponsorshipId"
                      params={{ sponsorshipId: payment.sponsorshipId }}
                    >
                      {t("sponsorships.title")}
                    </Link>
                  }
                />
              )}
              <DetailItem
                label={t("payments.notes")}
                value={payment.notes || "-"}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContent>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm">{value}</dd>
    </div>
  );
}
