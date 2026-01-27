import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { drugQueryOptions, drugInUseQueryOptions } from "@/api/drugs.queries";
import { apiClient } from "@/api/client";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

export const Route = createFileRoute("/_authed/drugs/$drugId/")({
  loader: ({ params, context: { queryClient } }) => {
    return queryClient.ensureQueryData(drugQueryOptions(params.drugId));
  },
  component: DrugDetailPage,
});

function DrugDetailPage() {
  const { t } = useTranslation();
  const { drugId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const drugQuery = useQuery(drugQueryOptions(drugId));
  const inUseQuery = useQuery(drugInUseQueryOptions(drugId));

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.DELETE("/v1/drugs/byId/{drugId}", {
        params: { path: { drugId } },
      });
      if (response.error) {
        throw new Error("Failed to delete drug");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drugs"] });
      navigate({ to: "/drugs" });
    },
  });

  if (drugQuery.isLoading) {
    return (
      <PageContent title={t("common.loading")}>
        <div className="py-8 text-center text-muted-foreground">
          {t("common.loading")}
        </div>
      </PageContent>
    );
  }

  if (drugQuery.error || !drugQuery.data) {
    return (
      <PageContent title={t("common.error")}>
        <div className="py-8 text-center text-destructive">
          {t("common.error")}
        </div>
      </PageContent>
    );
  }

  const drug = drugQuery.data;
  const canDelete = !inUseQuery.data?.inUse;

  return (
    <PageContent title={drug.name} showBackButton>
      {/* Header actions */}
      <div className="mb-6 flex items-center justify-end">
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to="/drugs/$drugId/edit" params={{ drugId }}>
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
                  {t("drugs.deleteConfirm")}
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
      </div>

      <div className="space-y-6">
        {/* Drug Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t("drugs.drugDetails")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <DetailItem label={t("drugs.name")} value={drug.name} />
              <DetailItem label={t("drugs.notes")} value={drug.notes || "-"} />
            </div>
          </CardContent>
        </Card>

        {/* Dosing Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t("drugs.dosing")}</CardTitle>
          </CardHeader>
          <CardContent>
            {drug.drugTreatment.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("drugs.animalType")}</TableHead>
                    <TableHead>{t("drugs.dosePerKg")}</TableHead>
                    <TableHead>{t("drugs.milkWaitingDays")}</TableHead>
                    <TableHead>{t("drugs.meatWaitingDays")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drug.drugTreatment.map((dt) => (
                    <TableRow key={dt.id}>
                      <TableCell>
                        {t(`animals.types.${dt.animalType}`)}
                      </TableCell>
                      <TableCell>{dt.dosePerKg}</TableCell>
                      <TableCell>{dt.milkWaitingDays}</TableCell>
                      <TableCell>{dt.meatWaitingDays}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-6 text-center text-muted-foreground">
                {t("drugs.noDosing")}
              </div>
            )}
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
