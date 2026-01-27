import { apiClient } from "@/api/client";
import { paymentsQueryOptions } from "@/api/payments.queries";
import type { Payment } from "@/api/types";
import { DataTable } from "@/components/DataTable";
import { PageContent } from "@/components/PageContent";
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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { type ColumnDef } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, MoreHorizontalIcon } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_authed/payments/")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(paymentsQueryOptions());
  },
  component: Payments,
});

function Payments() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const paymentsQuery = useQuery(paymentsQueryOptions());

  const deleteMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const response = await apiClient.DELETE("/v1/payments/byId/{paymentId}", {
        params: { path: { paymentId } },
      });
      if (response.error) {
        throw new Error("Failed to delete payment");
      }
    },
    onSuccess: () => {
      paymentsQuery.refetch();
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

  const columns = useMemo<ColumnDef<Payment>[]>(
    () => [
      {
        accessorKey: "date",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="p-0 hover:bg-transparent justify-start"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("payments.date")}
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ArrowDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => formatDate(row.getValue("date")),
      },
      {
        accessorKey: "contact.firstName",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="p-0 hover:bg-transparent justify-start"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("payments.contact")}
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ArrowDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.contact.firstName} {row.original.contact.lastName}
          </span>
        ),
      },
      {
        accessorKey: "amount",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="p-0 hover:bg-transparent justify-start"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("payments.amount")}
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ArrowDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => {
          const payment = row.original;
          return formatCurrency(payment.amount, payment.currency);
        },
      },
      {
        accessorKey: "method",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="p-0 hover:bg-transparent justify-start"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("payments.method")}
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ArrowDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {t(`payments.methods.${row.getValue("method")}`)}
          </span>
        ),
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const payment = row.original;
          return (
            <div className="text-right" onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8">
                    <MoreHorizontalIcon />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link
                      to="/payments/$paymentId/edit"
                      params={{ paymentId: payment.id }}
                    >
                      {t("common.edit")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem variant="destructive">
                        {t("common.delete")}
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {t("common.confirm")}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {t("payments.deleteConfirm")}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>
                          {t("common.cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate(payment.id)}
                        >
                          {t("common.delete")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
        enableSorting: false,
      },
    ],
    [t, deleteMutation],
  );

  const data = paymentsQuery.data?.result ?? [];

  return (
    <PageContent title={t("payments.title")} showBackButton={false}>
      <div className="flex justify-end mb-4">
        <Button onClick={() => navigate({ to: "/payments/create" })}>
          Erfassen
        </Button>
      </div>
      <DataTable
        data={data}
        columns={columns}
        onRowClick={(payment) =>
          navigate({
            to: "/payments/$paymentId",
            params: { paymentId: payment.id },
          })
        }
        globalFilterFn={(row, _columnId, filterValue) => {
          const payment = row.original;
          const searchValue = filterValue.toLowerCase();
          return (
            payment.contact.firstName.toLowerCase().includes(searchValue) ||
            payment.contact.lastName.toLowerCase().includes(searchValue)
          );
        }}
        defaultSorting={[{ id: "date", desc: true }]}
      />
    </PageContent>
  );
}
