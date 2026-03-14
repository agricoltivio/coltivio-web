import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { apiClient } from "@/api/client";
import { orderQueryOptions } from "@/api/orders.queries";
import { PageContent } from "@/components/PageContent";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";

export const Route = createFileRoute("/_authed/orders/$orderId/edit")({
  loader: ({ params, context: { queryClient } }) => {
    return queryClient.ensureQueryData(orderQueryOptions(params.orderId));
  },
  component: EditOrder,
});

interface EditOrderFormData {
  shippingDate: string | null;
  notes: string | null;
}

function EditOrder() {
  const { t } = useTranslation();
  const { orderId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const order = useQuery(orderQueryOptions(orderId)).data!;

  const { register, handleSubmit } = useForm<EditOrderFormData>({
    defaultValues: {
      shippingDate: order.shippingDate?.split("T")[0] || null,
      notes: order.notes,
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: EditOrderFormData) => {
      const response = await apiClient.PATCH("/v1/orders/byId/{orderId}", {
        params: { path: { orderId } },
        body: {
          shippingDate: data.shippingDate
            ? new Date(data.shippingDate).toISOString()
            : undefined,
          notes: data.notes || undefined,
        },
      });
      if (response.error) {
        throw new Error("Failed to update order");
      }
      return response.data.data;
    },
    onSuccess: () => {
      navigate({ to: "/orders/$orderId", params: { orderId } });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  const onSubmit = (data: EditOrderFormData) => {
    updateMutation.mutate(data);
  };

  return (
    <PageContent title={t("orders.editOrder")} showBackButton backTo={() => navigate({ to: "/orders/$orderId", params: { orderId } })}>
      <form onSubmit={handleSubmit(onSubmit)} className="max-w-lg">
        {/* Shipping date */}
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="shippingDate">
              {t("orders.shippingDate")}
            </FieldLabel>
            <Input id="shippingDate" type="date" {...register("shippingDate")} />
          </Field>
        </FieldGroup>

        {/* Notes */}
        <FieldGroup className="mt-7">
          <Field>
            <FieldLabel htmlFor="notes">{t("orders.notes")}</FieldLabel>
            <Textarea id="notes" rows={3} {...register("notes")} />
          </Field>
        </FieldGroup>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-6">
          <Button type="submit" disabled={updateMutation.isPending}>
            {t("common.save")}
          </Button>
        </div>
      </form>
    </PageContent>
  );
}
