import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { PencilIcon, TrashIcon } from "lucide-react";
import { apiClient } from "@/api/client";
import { invoiceSettingsQueryOptions } from "@/api/orders.queries";
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

export const Route = createFileRoute("/_authed/orders/invoice-settings/")({
  loader: ({ context: { queryClient } }) => {
    return queryClient.ensureQueryData(invoiceSettingsQueryOptions());
  },
  component: InvoiceSettingsPage,
});

function InvoiceSettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: settings = [] } = useQuery(invoiceSettingsQueryOptions());

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.DELETE("/v1/orders/invoiceSettings/{id}", {
        params: { path: { id } },
      });
      if (response.error) throw new Error("Failed to delete invoice settings");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", "invoiceSettings"] });
    },
  });

  return (
    <PageContent title={t("orders.invoiceSettings")}>
      <div className="flex justify-end mb-4">
        <Button onClick={() => navigate({ to: "/orders/invoice-settings/create" })}>
          {t("common.create")}
        </Button>
      </div>

      {settings.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          {t("orders.noInvoiceSettings")}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("common.name")}</TableHead>
              <TableHead>{t("orders.senderName")}</TableHead>
              <TableHead>{t("contacts.city")}</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {settings.map((s) => (
              <TableRow
                key={s.id}
                className="cursor-pointer"
                onClick={() =>
                  navigate({
                    to: "/orders/invoice-settings/$settingsId",
                    params: { settingsId: s.id },
                  })
                }
              >
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>{s.senderName}</TableCell>
                <TableCell className="text-muted-foreground">{s.city}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate({
                          to: "/orders/invoice-settings/$settingsId",
                          params: { settingsId: s.id },
                        });
                      }}
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={deleteMutation.isPending}
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMutation.mutate(s.id);
                      }}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </PageContent>
  );
}
