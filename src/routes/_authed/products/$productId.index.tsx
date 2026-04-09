import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useFeatureAccess } from "@/lib/useFeatureAccess";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { productQueryOptions } from "@/api/products.queries";
import { apiClient } from "@/api/client";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export const Route = createFileRoute("/_authed/products/$productId/")({
  loader: ({ params, context: { queryClient } }) => {
    return queryClient.ensureQueryData(productQueryOptions(params.productId));
  },
  component: ProductDetailPage,
});

function ProductDetailPage() {
  const { t } = useTranslation();
  const { canWrite: canWriteProducts } = useFeatureAccess("commerce");
  const { productId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const productQuery = useQuery(productQueryOptions(productId));

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.DELETE("/v1/products/byId/{productId}", {
        params: { path: { productId } },
      });
      if (response.error) {
        throw new Error("Failed to delete product");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      navigate({ to: "/products" });
    },
  });

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("de-CH", {
      style: "currency",
      currency: "CHF",
    }).format(amount);
  }

  if (productQuery.isLoading) {
    return (
      <PageContent title={t("common.loading")}>
        <div className="py-8 text-center text-muted-foreground">
          {t("common.loading")}
        </div>
      </PageContent>
    );
  }

  if (productQuery.error || !productQuery.data) {
    return (
      <PageContent title={t("common.error")}>
        <div className="py-8 text-center text-destructive">
          {t("common.error")}
        </div>
      </PageContent>
    );
  }

  const product = productQuery.data;

  return (
    <PageContent title={product.name} showBackButton backTo={() => navigate({ to: "/products" })}>
      {/* Header actions */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={product.active ? "default" : "secondary"}>
            {product.active ? t("products.active") : t("products.inactive")}
          </Badge>
        </div>
        {canWriteProducts && <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to="/products/$productId/edit" params={{ productId }}>
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
                  {t("products.deleteConfirm")}
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
        <Card>
          <CardHeader>
            <CardTitle>{t("products.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <DetailItem label={t("products.name")} value={product.name} />
              <DetailItem
                label={t("products.category")}
                value={t(`products.categories.${product.category}`)}
              />
              <DetailItem
                label={t("products.pricePerUnit")}
                value={formatCurrency(product.pricePerUnit)}
              />
              <DetailItem
                label={t("products.unit")}
                value={t(`products.units.${product.unit}`)}
              />
              <DetailItem
                label={t("products.description")}
                value={product.description || "-"}
              />
            </div>
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
