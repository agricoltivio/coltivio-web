import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { productQueryOptions } from "@/api/products.queries";
import { PageContent } from "@/components/PageContent";
import { ProductForm, type ProductFormData } from "@/components/ProductForm";

export const Route = createFileRoute("/_authed/products/$productId/edit")({
  loader: ({ params, context: { queryClient } }) => {
    return queryClient.ensureQueryData(productQueryOptions(params.productId));
  },
  component: EditProduct,
});

function formDataToApiBody(data: ProductFormData) {
  return {
    name: data.name,
    category: data.category,
    unit: data.unit,
    pricePerUnit: data.pricePerUnit,
    stock: data.stock,
    description: data.description || undefined,
    active: data.active,
  };
}

function EditProduct() {
  const { t } = useTranslation();
  const { productId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const product = useQuery(productQueryOptions(productId)).data!;

  const updateMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const response = await apiClient.PATCH("/v1/products/byId/{productId}", {
        params: { path: { productId } },
        body: formDataToApiBody(data),
      });
      if (response.error) {
        throw new Error("Failed to update product");
      }
      return response.data.data;
    },
    onSuccess: () => {
      navigate({ to: "/products/$productId", params: { productId } });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  return (
    <PageContent title={t("products.editProduct")} showBackButton backTo={() => navigate({ to: "/products/$productId", params: { productId } })}>
      <ProductForm
        product={product}
        onSubmit={(data) => updateMutation.mutate(data)}
        isSubmitting={updateMutation.isPending}
      />
    </PageContent>
  );
}
