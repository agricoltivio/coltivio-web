import { useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { contactsQueryOptions } from "@/api/contacts.queries";
import type { Contact } from "@/api/types";
import { PageContent } from "@/components/PageContent";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp } from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";

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

  const columns = useMemo<ColumnDef<Contact>[]>(
    () => [
      {
        accessorKey: "firstName",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="p-0 hover:bg-transparent justify-start"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("contacts.fullName")}
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ArrowDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.firstName} {row.original.lastName}
          </span>
        ),
      },
      {
        accessorKey: "city",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="p-0 hover:bg-transparent justify-start"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("contacts.city")}
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ArrowDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => row.getValue("city") || "-",
      },
      {
        accessorKey: "phone",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="p-0 hover:bg-transparent justify-start"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("contacts.phone")}
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ArrowDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => row.getValue("phone") || "-",
      },
      {
        accessorKey: "email",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="p-0 hover:bg-transparent justify-start"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("contacts.email")}
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ArrowDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => row.getValue("email") || "-",
      },
      {
        accessorKey: "labels",
        header: t("contacts.labels"),
        cell: ({ row }) => {
          const labels = row.getValue("labels") as string[] | null;
          return (
            <div className="flex gap-1 flex-wrap">
              {labels?.map((label) => (
                <Badge key={label} variant="secondary">
                  {label}
                </Badge>
              ))}
            </div>
          );
        },
        enableSorting: false,
      },
    ],
    [t],
  );

  const data = contactsQuery.data?.result ?? [];

  return (
    <PageContent title={t("contacts.title")} showBackButton={false}>
      <div className="flex justify-end mb-4">
        <Button onClick={() => navigate({ to: "/contacts/create" })}>
          Erfassen
        </Button>
      </div>
      <DataTable
        data={data}
        columns={columns}
        onRowClick={(contact) =>
          navigate({
            to: "/contacts/$contactId",
            params: { contactId: contact.id },
          })
        }
        globalFilterFn={(row, _columnId, filterValue) => {
          const contact = row.original;
          const searchValue = filterValue.toLowerCase();
          return (
            contact.firstName.toLowerCase().includes(searchValue) ||
            contact.lastName.toLowerCase().includes(searchValue) ||
            (contact.email?.toLowerCase().includes(searchValue) ?? false) ||
            (contact.city?.toLowerCase().includes(searchValue) ?? false)
          );
        }}
      />
    </PageContent>
  );
}
