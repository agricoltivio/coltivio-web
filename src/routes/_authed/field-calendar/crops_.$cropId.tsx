import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useFeatureAccess } from "@/lib/useFeatureAccess";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { cropQueryOptions, cropInUseQueryOptions } from "@/api/crops.queries";
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

export const Route = createFileRoute("/_authed/field-calendar/crops_/$cropId")({
  loader: ({ params, context: { queryClient } }) => {
    return queryClient.ensureQueryData(cropQueryOptions(params.cropId));
  },
  component: CropDetailPage,
});

function CropDetailPage() {
  const { t } = useTranslation();
  const { canWrite: canWriteCrops } = useFeatureAccess("field_calendar");
  const { cropId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const cropQuery = useQuery(cropQueryOptions(cropId));
  const inUseQuery = useQuery(cropInUseQueryOptions(cropId));

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.DELETE("/v1/crops/byId/{cropId}", {
        params: { path: { cropId } },
      });
      if (response.error) {
        throw new Error("Failed to delete crop");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crops"] });
      navigate({ to: "/field-calendar/crops" });
    },
  });

  if (cropQuery.isLoading) {
    return (
      <PageContent title={t("common.loading")}>
        <div className="py-8 text-center text-muted-foreground">
          {t("common.loading")}
        </div>
      </PageContent>
    );
  }

  if (cropQuery.error || !cropQuery.data) {
    return (
      <PageContent title={t("common.error")}>
        <div className="py-8 text-center text-destructive">
          {t("common.error")}
        </div>
      </PageContent>
    );
  }

  const crop = cropQuery.data;
  const canDelete = !inUseQuery.data?.inUse;

  return (
    <PageContent
      title={crop.name}
      showBackButton
      backTo={() => navigate({ to: "/field-calendar/crops" })}
    >
      {canWriteCrops && <div className="mb-6 flex items-center justify-end gap-2">
        <Button variant="outline" asChild>
          <Link to="/field-calendar/crops/$cropId/edit" params={{ cropId }}>
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
                {t("crops.deleteConfirm")}
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

      <Card>
        <CardHeader>
          <CardTitle>{t("crops.cropDetails")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <DetailItem label={t("crops.name")} value={crop.name} />
            <DetailItem
              label={t("crops.category")}
              value={t(`crops.categories.${crop.category}`)}
            />
            <DetailItem label={t("crops.variety")} value={crop.variety || "-"} />
            <DetailItem label={t("crops.family")} value={crop.family?.name || "-"} />
            <DetailItem
              label={t("crops.waitingTimeInYears")}
              value={crop.waitingTimeInYears ?? "-"}
            />
            <DetailItem
              label={t("crops.additionalNotes")}
              value={crop.additionalNotes || "-"}
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
