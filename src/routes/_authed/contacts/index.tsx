import { contactsQueryOptions } from "@/api/contacts.queries";
import { PageContent } from "@/components/PageContent";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_authed/contacts/")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(contactsQueryOptions());
  },
  component: Contacts,
});

function Contacts() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const contactsQuery = useQuery(contactsQueryOptions());

  return (
    <PageContent title={t("contacts.title")} showBackButton={false}>
      <div className="flex-col">
        <div className="flex justify-end">
          <Button onClick={() => navigate({ to: "/contacts/create" })}>
            Erfassen
          </Button>
        </div>
        <Table className="mt-3">
          <TableHeader>
            <TableRow>
              <TableHead>{t("contacts.fullName")}</TableHead>
              <TableHead>{t("contacts.city")}</TableHead>
              <TableHead>{t("contacts.phone")}</TableHead>
              <TableHead>{t("contacts.email")}</TableHead>
              <TableHead>{t("contacts.labels")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contactsQuery.data?.result.map((contact) => (
              <TableRow
                key={contact.id}
                className="cursor-pointer"
                onClick={() =>
                  navigate({
                    to: "/contacts/$contactId",
                    params: { contactId: contact.id },
                  })
                }
              >
                <TableCell className="font-medium">
                  {contact.firstName} {contact.lastName}
                </TableCell>
                <TableCell>{contact.city || "-"}</TableCell>
                <TableCell>{contact.phone || "-"}</TableCell>
                <TableCell>{contact.email || "-"}</TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {contact.labels?.map((label) => (
                      <Badge key={label} variant="secondary">
                        {label}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </PageContent>
  );
}
