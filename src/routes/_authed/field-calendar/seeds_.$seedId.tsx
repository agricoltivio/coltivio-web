import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useFeatureAccess } from "@/lib/useFeatureAccess";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { seedQueryOptions, seedInUseQueryOptions } from "@/api/seeds.queries";
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

export const Route = createFileRoute("/_authed/field-calendar/seeds_/$seedId")({
  loader: ({ params, context: { queryClient } }) => {
    return queryClient.ensureQueryData(seedQueryOptions(params.seedId));
  },
  component: SeedDetailPage,
});

function SeedDetailPage() {
  const { t } = useTranslation();
  const { canWrite } = useFeatureAccess("field_calendar");
  const { seedId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const seedQuery = useQuery(seedQueryOptions(seedId));
  const inUseQuery = useQuery(seedInUseQueryOptions(seedId));

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.DELETE("/v1/seeds/byId/{seedId}", {
        params: { path: { seedId } },
      });
      if (response.error) {
        throw new Error("Failed to delete seed");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seeds"] });
      navigate({ to: "/field-calendar/seeds" });
    },
  });

  if (seedQuery.isLoading) {
    return (
      <PageContent title={t("common.loading")}>
        <div className="py-8 text-center text-muted-foreground">
          {t("common.loading")}
        </div>
      </PageContent>
    );
  }

  if (seedQuery.error || !seedQuery.data) {
    return (
      <PageContent title={t("common.error")}>
        <div className="py-8 text-center text-destructive">
          {t("common.error")}
        </div>
      </PageContent>
    );
  }

  const seed = seedQuery.data;
  const canDelete = !inUseQuery.data?.inUse;

  return (
    <PageContent
      title={seed.name}
      showBackButton
      backTo={() => navigate({ to: "/field-calendar/seeds" })}
    >
      {canWrite && (
        <div className="mb-6 flex items-center justify-end gap-2">
          <Button variant="outline" asChild>
            <Link to="/field-calendar/seeds/$seedId/edit" params={{ seedId }}>
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
                  {t("seeds.deleteConfirm")}
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
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("seeds.seedDetails")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <DetailItem label={t("seeds.name")} value={seed.name} />
            <DetailItem label={t("seeds.crop")} value={seed.crop.name} />
            <DetailItem
              label={t("seeds.quantityKind")}
              value={t(`seeds.quantityKinds.${seed.quantityKind}`)}
            />
            <DetailItem
              label={t("seeds.defaultRate")}
              value={
                seed.defaultUnit
                  ? [seed.defaultAmount, t(`fieldCalendar.sowings.units.${seed.defaultUnit}`)]
                      .filter((part) => part != null)
                      .join(" ")
                  : "-"
              }
            />
            <DetailItem
              label={t("seeds.description")}
              value={seed.description || "-"}
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
