import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  cropProtectionProductQueryOptions,
  cropProtectionProductInUseQueryOptions,
} from "@/api/cropProtectionProducts.queries";
import { apiClient } from "@/api/client";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
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

export const Route = createFileRoute(
  "/_authed/field-calendar/crop-protection-products_/$cropProtectionProductId",
)({
  loader: ({ params, context: { queryClient } }) => {
    return queryClient.ensureQueryData(
      cropProtectionProductQueryOptions(params.cropProtectionProductId),
    );
  },
  component: CropProtectionProductDetailPage,
});

function CropProtectionProductDetailPage() {
  const { t } = useTranslation();
  const { cropProtectionProductId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const productQuery = useQuery(
    cropProtectionProductQueryOptions(cropProtectionProductId),
  );
  const inUseQuery = useQuery(
    cropProtectionProductInUseQueryOptions(cropProtectionProductId),
  );

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.DELETE(
        "/v1/cropProtectionProducts/byId/{cropProtectionProductId}",
        { params: { path: { cropProtectionProductId } } },
      );
      if (response.error) {
        throw new Error("Failed to delete crop protection product");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cropProtectionProducts"] });
      navigate({ to: "/field-calendar/crop-protection-products" });
    },
  });

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
  const canDelete = !inUseQuery.data?.inUse;

  return (
    <PageContent
      title={product.name}
      showBackButton
      backTo={() => navigate({ to: "/field-calendar/crop-protection-products" })}
    >
      <div className="mb-6 flex items-center justify-end gap-2">
        <Button variant="outline" asChild>
          <Link
            to="/field-calendar/crop-protection-products/$cropProtectionProductId/edit"
            params={{ cropProtectionProductId }}
          >
            {t("common.edit")}
          </Link>
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={!canDelete}>
              {t("common.delete")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("common.confirm")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("cropProtectionProducts.deleteConfirm")}
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("cropProtectionProducts.productDetails")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <DetailItem label={t("cropProtectionProducts.name")} value={product.name} />
            <DetailItem label={t("cropProtectionProducts.unit")} value={product.unit} />
            <DetailItem
              label={t("cropProtectionProducts.description")}
              value={product.description || "-"}
            />
          </div>
        </CardContent>
      </Card>
    </PageContent>
  );
}

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm">{value}</dd>
    </div>
  );
}
