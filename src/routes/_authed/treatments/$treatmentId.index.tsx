import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { treatmentQueryOptions } from "@/api/treatments.queries";
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

export const Route = createFileRoute("/_authed/treatments/$treatmentId/")({
  loader: ({ params, context: { queryClient } }) => {
    return queryClient.ensureQueryData(
      treatmentQueryOptions(params.treatmentId),
    );
  },
  component: TreatmentDetailPage,
});

function TreatmentDetailPage() {
  const { t } = useTranslation();
  const { treatmentId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const treatmentQuery = useQuery(treatmentQueryOptions(treatmentId));

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.DELETE(
        "/v1/treatments/byId/{treatmentId}",
        {
          params: { path: { treatmentId } },
        },
      );
      if (response.error) {
        throw new Error("Failed to delete treatment");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["treatments"] });
      queryClient.invalidateQueries({ queryKey: ["animals"] });
      navigate({ to: "/animals/treatments-journal" });
    },
  });

  function formatDate(dateString: string | null) {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString();
  }

  if (treatmentQuery.isLoading) {
    return (
      <PageContent title={t("common.loading")}>
        <div className="py-8 text-center text-muted-foreground">
          {t("common.loading")}
        </div>
      </PageContent>
    );
  }

  if (treatmentQuery.error || !treatmentQuery.data) {
    return (
      <PageContent title={t("common.error")}>
        <div className="py-8 text-center text-destructive">
          {t("common.error")}
        </div>
      </PageContent>
    );
  }

  const treatment = treatmentQuery.data;

  return (
    <PageContent title={treatment.name} showBackButton backTo={() => navigate({ to: "/animals/treatments-journal" })}>
      {/* Header actions */}
      <div className="mb-6 flex items-center justify-end">
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to="/treatments/$treatmentId/edit" params={{ treatmentId }}>
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
                  {t("treatments.deleteConfirm")}
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
        {/* Treatment Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t("treatments.treatmentDetails")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <DetailItem
                label={t("treatments.animals")}
                value={treatment.animals.map((a) => a.name).join(", ") || "-"}
              />
              <DetailItem
                label={t("treatments.startDate")}
                value={formatDate(treatment.startDate)}
              />
              <DetailItem
                label={t("treatments.endDate")}
                value={formatDate(treatment.endDate)}
              />
              <DetailItem label={t("treatments.name")} value={treatment.name} />
              <DetailItem
                label={t("treatments.drug")}
                value={treatment.drug?.name || "-"}
              />
              {treatment.drugDoseValue != null && (
                <DetailItem
                  label={t("treatments.drugDoseValue")}
                  value={[
                    treatment.drugDoseValue,
                    treatment.drugDoseUnit ? t(`drugs.doseUnits.${treatment.drugDoseUnit}`) : null,
                    treatment.drugDosePerUnit ? `${t("treatments.drugDosePerUnit").toLowerCase()} ${t(`drugs.dosePerUnits.${treatment.drugDosePerUnit}`)}` : null,
                  ].filter(Boolean).join(" ")}
                />
              )}
              <DetailItem
                label={t("treatments.isAntibiotic")}
                value={treatment.isAntibiotic ? t("common.yes") : t("common.no")}
              />
              <DetailItem
                label={t("treatments.criticalAntibiotic")}
                value={treatment.criticalAntibiotic ? t("common.yes") : t("common.no")}
              />
              {treatment.drugReceivedFrom && (
                <DetailItem
                  label={t("treatments.drugReceivedFrom")}
                  value={treatment.drugReceivedFrom}
                />
              )}
              <DetailItem
                label={t("treatments.notes")}
                value={treatment.notes || "-"}
              />
            </div>
          </CardContent>
        </Card>

        {/* Waiting Dates Card (if drug was used) */}
        {treatment.drug && (
          <Card>
            <CardHeader>
              <CardTitle>{t("treatments.waitingDates")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <DetailItem
                  label={t("treatments.milkUsableDate")}
                  value={formatDate(treatment.milkUsableDate)}
                />
                <DetailItem
                  label={t("treatments.meatUsableDate")}
                  value={formatDate(treatment.meatUsableDate)}
                />
                <DetailItem
                  label={t("treatments.organsUsableDate")}
                  value={formatDate(treatment.organsUsableDate)}
                />
              </div>
            </CardContent>
          </Card>
        )}
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
