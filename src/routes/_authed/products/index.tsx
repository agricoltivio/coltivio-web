import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { productsQueryOptions } from "@/api/products.queries";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authed/products/")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(productsQueryOptions());
  },
  component: Products,
});

function Products() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const productsQuery = useQuery(productsQueryOptions());

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("de-CH", {
      style: "currency",
      currency: "CHF",
    }).format(amount);
  }

  return (
    <PageContent title={t("products.title")} showBackButton={false}>
      <div className="flex-col">
        <div className="flex justify-end">
          <Button onClick={() => navigate({ to: "/products/create" })}>
            Erfassen
          </Button>
        </div>
        <Table className="mt-3">
          <TableHeader>
            <TableRow>
              <TableHead>{t("products.name")}</TableHead>
              <TableHead>{t("products.category")}</TableHead>
              <TableHead>{t("products.pricePerUnit")}</TableHead>
              <TableHead>{t("orders.status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productsQuery.data?.result.map((product) => (
              <TableRow
                key={product.id}
                className="cursor-pointer"
                onClick={() =>
                  navigate({
                    to: "/products/$productId",
                    params: { productId: product.id },
                  })
                }
              >
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {t(`products.categories.${product.category}`)}
                </TableCell>
                <TableCell>
                  {formatCurrency(product.pricePerUnit)} /{" "}
                  {t(`products.units.${product.unit}`)}
                </TableCell>
                <TableCell>
                  <Badge variant={product.active ? "default" : "secondary"}>
                    {product.active
                      ? t("products.active")
                      : t("products.inactive")}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </PageContent>
  );
}
