import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useFeatureAccess } from "@/lib/useFeatureAccess";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  cropFamilyQueryOptions,
  cropFamilyInUseQueryOptions,
} from "@/api/crops.queries";
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
  "/_authed/field-calendar/crop-families_/$familyId",
)({
  loader: ({ params, context: { queryClient } }) => {
    return queryClient.ensureQueryData(cropFamilyQueryOptions(params.familyId));
  },
  component: CropFamilyDetailPage,
});

function CropFamilyDetailPage() {
  const { t } = useTranslation();
  const { canWrite: canWriteCrops } = useFeatureAccess("field_calendar");
  const { familyId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const familyQuery = useQuery(cropFamilyQueryOptions(familyId));
  const inUseQuery = useQuery(cropFamilyInUseQueryOptions(familyId));

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.DELETE(
        "/v1/crops/families/byId/{familyId}",
        { params: { path: { familyId } } },
      );
      if (response.error) {
        throw new Error("Failed to delete crop family");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cropFamilies"] });
      navigate({ to: "/field-calendar/crop-families" });
    },
  });

  if (familyQuery.isLoading) {
    return (
      <PageContent title={t("common.loading")}>
        <div className="py-8 text-center text-muted-foreground">
          {t("common.loading")}
        </div>
      </PageContent>
    );
  }

  if (familyQuery.error || !familyQuery.data) {
    return (
      <PageContent title={t("common.error")}>
        <div className="py-8 text-center text-destructive">
          {t("common.error")}
        </div>
      </PageContent>
    );
  }

  const family = familyQuery.data;
  const canDelete = !inUseQuery.data?.inUse;

  return (
    <PageContent
      title={family.name}
      showBackButton
      backTo={() => navigate({ to: "/field-calendar/crop-families" })}
    >
      {canWriteCrops && <div className="mb-6 flex items-center justify-end gap-2">
        <Button variant="outline" asChild>
          <Link
            to="/field-calendar/crop-families/$familyId/edit"
            params={{ familyId }}
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
                {t("cropFamilies.deleteConfirm")}
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
          <CardTitle>{t("cropFamilies.familyDetails")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <DetailItem label={t("cropFamilies.name")} value={family.name} />
            <DetailItem
              label={t("cropFamilies.waitingTimeInYears")}
              value={family.waitingTimeInYears}
            />
            <DetailItem
              label={t("cropFamilies.additionalNotes")}
              value={family.additionalNotes || "-"}
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
