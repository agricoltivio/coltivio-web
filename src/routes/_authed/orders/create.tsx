import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { contactsQueryOptions } from "@/api/contacts.queries";
import { activeProductsQueryOptions } from "@/api/products.queries";
import { PageContent } from "@/components/PageContent";
import { OrderForm, type OrderFormData } from "@/components/OrderForm";

export const Route = createFileRoute("/_authed/orders/create")({
  validateSearch: z.object({
    contactId: z.string().optional(),
    returnTo: z.string().optional(),
  }),
  loader: ({ context: { queryClient } }) => {
    return Promise.all([
      queryClient.ensureQueryData(contactsQueryOptions()),
      queryClient.ensureQueryData(activeProductsQueryOptions()),
    ]);
  },
  component: CreateOrder,
});

function formDataToApiBody(data: OrderFormData) {
  return {
    contactId: data.contactId,
    orderDate: new Date(data.orderDate).toISOString(),
    shippingDate: data.shippingDate
      ? new Date(data.shippingDate).toISOString()
      : undefined,
    notes: data.notes || undefined,
    status: data.confirmed ? ("confirmed" as const) : undefined,
    items: data.items
      .filter((item) => item.productId)
      .map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice !== "" ? Number(item.unitPrice) : undefined,
      })),
  };
}

function CreateOrder() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { contactId, returnTo } = Route.useSearch();

  const contacts = useQuery(contactsQueryOptions()).data!;
  const products = useQuery(activeProductsQueryOptions()).data!;

  const contactOptions = contacts.result.map((contact) => ({
    value: contact.id,
    label: `${contact.firstName} ${contact.lastName}`,
  }));

  const productOptions = products.result.map((product) => ({
    value: product.id,
    label: `${product.name} (${t(`products.units.${product.unit}`)})`,
  }));

  const productPriceMap = new Map(products.result.map((p) => [p.id, p.pricePerUnit]));

  const createMutation = useMutation({
    mutationFn: async (data: OrderFormData) => {
      const response = await apiClient.POST("/v1/orders", {
        body: formDataToApiBody(data),
      });
      if (response.error) {
        throw new Error("Failed to create order");
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      navigate({ to: returnTo ?? "/orders" });
    },
  });

  return (
    <PageContent
      title={t("orders.createOrder")}
      showBackButton
      backTo={() => navigate({ to: returnTo ?? "/orders" })}
    >
      <OrderForm
        contactOptions={contactOptions}
        productOptions={productOptions}
        productPriceMap={productPriceMap}
        defaultValues={contactId ? { contactId } : undefined}
        onSubmit={(data) => createMutation.mutate(data)}
        isSubmitting={createMutation.isPending}
        showConfirmedCheckbox
      />
    </PageContent>
  );
}
