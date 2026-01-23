import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { MoreHorizontalIcon } from "lucide-react";
import { paymentsQueryOptions } from "@/api/payments.queries";
import { apiClient } from "@/api/client";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

  return (
    <PageContent title={t("payments.title")} showBackButton={false}>
      <div className="flex-col">
        <div className="flex justify-end">
          <Button onClick={() => navigate({ to: "/payments/create" })}>
            Erfassen
          </Button>
        </div>
        <Table className="mt-3">
          <TableHeader>
            <TableRow>
              <TableHead>{t("payments.date")}</TableHead>
              <TableHead>{t("payments.contact")}</TableHead>
              <TableHead>{t("payments.amount")}</TableHead>
              <TableHead>{t("payments.method")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paymentsQuery.data?.result.map((payment) => (
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
                <TableCell className="font-medium">
                  {payment.contact.firstName} {payment.contact.lastName}
                </TableCell>
                <TableCell>
                  {formatCurrency(payment.amount, payment.currency)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {t(`payments.methods.${payment.method}`)}
                </TableCell>
                <TableCell className="text-right">
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </PageContent>
  );
}
