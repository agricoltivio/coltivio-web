import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useFeatureAccess } from "@/lib/useFeatureAccess";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { contactQueryOptions } from "@/api/contacts.queries";
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

export const Route = createFileRoute("/_authed/contacts/$contactId/")({
  validateSearch: z.object({ returnTo: z.string().optional() }),
  loader: ({ params, context: { queryClient } }) => {
    return queryClient.ensureQueryData(contactQueryOptions(params.contactId));
  },
  component: ContactDetailPage,
});

function ContactDetailPage() {
  const { t } = useTranslation();
  const { canWrite: canWriteContacts } = useFeatureAccess("commerce");
  const { contactId } = Route.useParams();
  const { returnTo } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const contactQuery = useQuery(contactQueryOptions(contactId));

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.DELETE("/v1/contacts/byId/{contactId}", {
        params: { path: { contactId } },
      });
      if (response.error) {
        throw new Error("Failed to delete contact");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      navigate({ to: "/contacts" });
    },
  });

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString();
  }

  if (contactQuery.isLoading) {
    return (
      <PageContent title={t("common.loading")}>
        <div className="py-8 text-center text-muted-foreground">
          {t("common.loading")}
        </div>
      </PageContent>
    );
  }

  if (contactQuery.error || !contactQuery.data) {
    return (
      <PageContent title={t("common.error")}>
        <div className="py-8 text-center text-destructive">
          {t("common.error")}
        </div>
      </PageContent>
    );
  }

  const contact = contactQuery.data;
  const fullName = `${contact.firstName} ${contact.lastName}`;

  return (
    <PageContent title={fullName} showBackButton backTo={() => navigate({ to: returnTo ?? "/contacts" })}>
      {/* Header actions */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {contact.labels?.map((label) => (
            <Badge key={label} variant="secondary">
              {label}
            </Badge>
          ))}
        </div>
        {canWriteContacts && <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to="/contacts/$contactId/edit" params={{ contactId }}>
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
                  {t("contacts.deleteConfirm")}
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
        </div>}
      </div>

      <div className="space-y-6">
        {/* Contact Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t("contacts.contactDetails")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <DetailItem
                label={t("contacts.firstName")}
                value={contact.firstName}
              />
              <DetailItem
                label={t("contacts.lastName")}
                value={contact.lastName}
              />
              <DetailItem
                label={t("contacts.street")}
                value={contact.street || "-"}
              />
              <DetailItem
                label={t("contacts.city")}
                value={
                  contact.zip && contact.city
                    ? `${contact.zip} ${contact.city}`
                    : contact.city || "-"
                }
              />
              <DetailItem
                label={t("contacts.phone")}
                value={contact.phone || "-"}
              />
              <DetailItem
                label={t("contacts.email")}
                value={contact.email || "-"}
              />
              <DetailItem
                label={t("contacts.preferredCommunication")}
                value={
                  contact.preferredCommunication
                    ? t(
                        `contacts.preferredCommunicationOptions.${contact.preferredCommunication}`,
                      )
                    : "-"
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Sponsorships Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t("contacts.sponsorships")}</CardTitle>
          </CardHeader>
          <CardContent>
            {contact.sponsorships && contact.sponsorships.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("sponsorships.animal")}</TableHead>
                    <TableHead>{t("sponsorships.type")}</TableHead>
                    <TableHead>{t("sponsorships.startDate")}</TableHead>
                    <TableHead>{t("sponsorships.endDate")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contact.sponsorships.map((sponsorship) => (
                    <TableRow
                      key={sponsorship.id}
                      className="cursor-pointer"
                      onClick={() =>
                        navigate({
                          to: "/sponsorships/$sponsorshipId",
                          params: { sponsorshipId: sponsorship.id },
                        })
                      }
                    >
                      <TableCell>{sponsorship.animal.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {sponsorship.sponsorshipProgram.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(sponsorship.startDate)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {sponsorship.endDate
                          ? formatDate(sponsorship.endDate)
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-6 text-center text-muted-foreground">
                {t("contacts.noSponsorships")}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payments Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t("contacts.payments")}</CardTitle>
          </CardHeader>
          <CardContent>
            {contact.payments && contact.payments.length > 0 ? (
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
                  {contact.payments.map((payment) => (
                    <TableRow key={payment.id}>
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
                {t("contacts.noPayments")}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Orders Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t("contacts.orders")}</CardTitle>
          </CardHeader>
          <CardContent>
            {contact.orders && contact.orders.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Shipping Date</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contact.orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>{order.status}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(order.orderDate)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {order.shippingDate
                          ? formatDate(order.shippingDate)
                          : "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {order.notes || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-6 text-center text-muted-foreground">
                {t("contacts.noOrders")}
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
