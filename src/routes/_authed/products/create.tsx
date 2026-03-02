import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { PageContent } from "@/components/PageContent";
import { ProductForm, type ProductFormData } from "@/components/ProductForm";

export const Route = createFileRoute("/_authed/products/create")({
  component: CreateProduct,
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

function CreateProduct() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const response = await apiClient.POST("/v1/products", {
        body: formDataToApiBody(data),
      });
      if (response.error) {
        throw new Error("Failed to create product");
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      navigate({ to: "/products" });
    },
  });

  return (
    <PageContent title={t("products.createProduct")} showBackButton backTo={() => navigate({ to: "/products" })}>
      <ProductForm
        onSubmit={(data) => createMutation.mutate(data)}
        isSubmitting={createMutation.isPending}
      />
    </PageContent>
  );
}
