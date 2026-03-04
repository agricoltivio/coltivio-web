import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  fertilizerQueryOptions,
  fertilizerInUseQueryOptions,
} from "@/api/fertilizers.queries";
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
  "/_authed/field-calendar/fertilizers_/$fertilizerId",
)({
  loader: ({ params, context: { queryClient } }) => {
    return queryClient.ensureQueryData(
      fertilizerQueryOptions(params.fertilizerId),
    );
  },
  component: FertilizerDetailPage,
});

function FertilizerDetailPage() {
  const { t } = useTranslation();
  const { fertilizerId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const fertilizerQuery = useQuery(fertilizerQueryOptions(fertilizerId));
  const inUseQuery = useQuery(fertilizerInUseQueryOptions(fertilizerId));

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.DELETE(
        "/v1/fertilizers/byId/{fertilizerId}",
        { params: { path: { fertilizerId } } },
      );
      if (response.error) {
        throw new Error("Failed to delete fertilizer");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fertilizers"] });
      navigate({ to: "/field-calendar/fertilizers" });
    },
  });

  if (fertilizerQuery.isLoading) {
    return (
      <PageContent title={t("common.loading")}>
        <div className="py-8 text-center text-muted-foreground">
          {t("common.loading")}
        </div>
      </PageContent>
    );
  }

  if (fertilizerQuery.error || !fertilizerQuery.data) {
    return (
      <PageContent title={t("common.error")}>
        <div className="py-8 text-center text-destructive">
          {t("common.error")}
        </div>
      </PageContent>
    );
  }

  const fertilizer = fertilizerQuery.data;
  const canDelete = !inUseQuery.data?.inUse;

  return (
    <PageContent
      title={fertilizer.name}
      showBackButton
      backTo={() => navigate({ to: "/field-calendar/fertilizers" })}
    >
      <div className="mb-6 flex items-center justify-end gap-2">
        <Button variant="outline" asChild>
          <Link
            to="/field-calendar/fertilizers/$fertilizerId/edit"
            params={{ fertilizerId }}
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
                {t("fertilizers.deleteConfirm")}
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
          <CardTitle>{t("fertilizers.fertilizerDetails")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <DetailItem label={t("fertilizers.name")} value={fertilizer.name} />
            <DetailItem
              label={t("fertilizers.type")}
              value={t(`fertilizers.types.${fertilizer.type}`)}
            />
            <DetailItem label={t("fertilizers.unit")} value={fertilizer.unit} />
            <DetailItem
              label={t("fertilizers.description")}
              value={fertilizer.description || "-"}
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
