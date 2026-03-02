import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { sponsorshipQueryOptions } from "@/api/sponsorships.queries";
import { apiClient } from "@/api/client";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

export const Route = createFileRoute("/_authed/sponsorships/$sponsorshipId/")({
  loader: ({ params, context: { queryClient } }) => {
    return queryClient.ensureQueryData(
      sponsorshipQueryOptions(params.sponsorshipId),
    );
  },
  component: SponsorshipDetailPage,
});

function SponsorshipDetailPage() {
  const { t } = useTranslation();
  const { sponsorshipId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const sponsorshipQuery = useQuery(sponsorshipQueryOptions(sponsorshipId));

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.DELETE(
        "/v1/sponsorships/byId/{sponsorshipId}",
        {
          params: { path: { sponsorshipId } },
        },
      );
      if (response.error) {
        throw new Error("Failed to delete sponsorship");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sponsorships"] });
      navigate({ to: "/sponsorships" });
    },
  });

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString();
  }

  function isActive(sponsorship: { endDate: string | null }) {
    if (!sponsorship.endDate) return true;
    return new Date(sponsorship.endDate) > new Date();
  }

  if (sponsorshipQuery.isLoading) {
    return (
      <PageContent title={t("common.loading")}>
        <div className="py-8 text-center text-muted-foreground">
          {t("common.loading")}
        </div>
      </PageContent>
    );
  }

  if (sponsorshipQuery.error || !sponsorshipQuery.data) {
    return (
      <PageContent title={t("common.error")}>
        <div className="py-8 text-center text-destructive">
          {t("common.error")}
        </div>
      </PageContent>
    );
  }

  const sponsorship = sponsorshipQuery.data;
  const contactName = `${sponsorship.contact.firstName} ${sponsorship.contact.lastName}`;

  const currentYear = new Date().getFullYear();
  const paidThisYear = sponsorship.payments
    .filter((p) => new Date(p.date).getFullYear() === currentYear)
    .reduce((sum, p) => sum + p.amount, 0);
  const yearlyCost = sponsorship.sponsorshipProgram.yearlyCost;
  const isPaidThisYear = paidThisYear >= yearlyCost;

  return (
    <PageContent title={t("sponsorships.sponsorshipDetails")} showBackButton backTo={() => navigate({ to: "/sponsorships" })}>
      {/* Header actions */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isActive(sponsorship) ? (
            <Badge variant="default">{t("sponsorships.active")}</Badge>
          ) : (
            <Badge variant="secondary">{t("sponsorships.ended")}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link
              to="/sponsorships/$sponsorshipId/edit"
              params={{ sponsorshipId }}
            >
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
                  {t("sponsorships.deleteConfirm")}
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
        {/* Sponsorship Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t("sponsorships.sponsorshipDetails")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <DetailItem
                label={t("sponsorships.contact")}
                value={
                  <Link
                    className="hover:underline text-blue-600 hover:text-blue-800"
                    to="/contacts/$contactId"
                    params={{ contactId: sponsorship.contact.id }}
                  >
                    {contactName}
                  </Link>
                }
              />
              <DetailItem
                label={t("sponsorships.animal")}
                value={
                  <Link
                    className="hover:underline text-blue-600 hover:text-blue-800"
                    to="/animals/$animalId"
                    params={{ animalId: sponsorship.animal.id }}
                  >
                    {sponsorship.animal.name}
                  </Link>
                }
              />
              <DetailItem
                label={t("sponsorships.program")}
                value={`${sponsorship.sponsorshipProgram.name} (${yearlyCost} CHF / ${t("sponsorships.year")})`}
              />
              <DetailItem
                label={t("sponsorships.paidThisYear")}
                value={
                  <span className="flex items-center gap-2">
                    <Badge variant={isPaidThisYear ? "default" : "destructive"}>
                      {isPaidThisYear ? t("common.yes") : t("common.no")}
                    </Badge>
                    <span className="text-muted-foreground">
                      {paidThisYear} / {yearlyCost} CHF
                    </span>
                  </span>
                }
              />
              <DetailItem
                label={t("sponsorships.startDate")}
                value={formatDate(sponsorship.startDate)}
              />
              <DetailItem
                label={t("sponsorships.endDate")}
                value={
                  sponsorship.endDate ? formatDate(sponsorship.endDate) : "-"
                }
              />
              <DetailItem
                label={t("sponsorships.preferredCommunication")}
                value={
                  sponsorship.preferredCommunication
                    ? t(
                        `contacts.preferredCommunicationOptions.${sponsorship.preferredCommunication}`,
                      )
                    : "-"
                }
              />
              <DetailItem
                label={t("sponsorships.notes")}
                value={sponsorship.notes || "-"}
              />
            </div>
          </CardContent>
        </Card>

        {/* Payments Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t("payments.title")}</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link
                to="/payments/create"
                search={{
                  contactId: sponsorship.contactId,
                  sponsorshipId: sponsorship.id,
                  redirect: `/sponsorships/${sponsorshipId}`,
                }}
              >
                {t("payments.addPayment")}
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {sponsorship.payments && sponsorship.payments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("payments.date")}</TableHead>
                    <TableHead>{t("payments.amount")}</TableHead>
                    <TableHead>{t("payments.method")}</TableHead>
                    <TableHead>{t("payments.notes")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sponsorship.payments.map((payment) => (
                    <TableRow
                      key={payment.id}
                      className="cursor-pointer"
                      onClick={() =>
                        navigate({
                          to: "/payments/$paymentId",
                          params: { paymentId: payment.id },
                        })
                      }
                    >
                      <TableCell>{formatDate(payment.date)}</TableCell>
                      <TableCell>
                        {payment.amount} {payment.currency}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {t(`payments.methods.${payment.method}`)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {payment.notes || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-6 text-center text-muted-foreground">
                {t("payments.noPayments")}
              </div>
            )}
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
