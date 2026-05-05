import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { fertilizerApplicationQueryOptions } from "@/api/fertilizerApplications.queries";
import { useFeatureAccess } from "@/lib/useFeatureAccess";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
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
  "/_authed/field-calendar/fertilizer-applications_/$fertilizerApplicationId",
)({
  loader: ({ context: { queryClient }, params: { fertilizerApplicationId } }) => {
    queryClient.ensureQueryData(fertilizerApplicationQueryOptions(fertilizerApplicationId));
  },
  component: FertilizerApplicationDetail,
});

function FertilizerApplicationDetail() {
  const { t } = useTranslation();
  const { fertilizerApplicationId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { canWrite } = useFeatureAccess("field_calendar");
  const appQuery = useQuery(fertilizerApplicationQueryOptions(fertilizerApplicationId));
  const app = appQuery.data;

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.DELETE(
        "/v1/fertilizerApplications/byId/{fertilizerApplicationId}",
        { params: { path: { fertilizerApplicationId } } },
      );
      if (response.error) throw new Error("Failed to delete fertilizer application");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fertilizerApplications"] });
      navigate({ to: "/field-calendar/fertilizer-applications" });
    },
  });

  if (!app) {
    return (
      <PageContent title={t("common.loading")} showBackButton backTo={() => navigate({ to: "/field-calendar/fertilizer-applications" })}>
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </PageContent>
    );
  }

  return (
    <PageContent
      title={`${app.fertilizer.name} – ${app.plot.name}`}
      showBackButton
      backTo={() => navigate({ to: "/field-calendar/fertilizer-applications" })}
    >
      {canWrite && (
        <div className="flex justify-end mb-6">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={deleteMutation.isPending}>
                {t("common.delete")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("common.confirm")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("fieldCalendar.fertilizerApplications.deleteConfirm")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate()}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  {t("common.delete")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      <div className="rounded-md border p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t("fieldCalendar.plots.plot")}</span>
          <span className="font-medium">{app.plot.name}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t("fieldCalendar.fertilizerApplications.fertilizer")}</span>
          <span className="font-medium">{app.fertilizer.name}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t("fieldCalendar.fertilizerApplications.date")}</span>
          <span className="font-medium">{new Date(app.date).toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t("fieldCalendar.harvests.amount")}</span>
          <span className="font-medium">
            {(app.numberOfUnits * app.amountPerUnit).toFixed(1)} {app.fertilizer.unit}
          </span>
        </div>
        {app.method && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("fieldCalendar.fertilizerApplications.method")}</span>
            <span className="font-medium">
              {t(`fieldCalendar.fertilizerApplications.methods.${app.method}`)}
            </span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t("fieldCalendar.tillages.size")}</span>
          <span className="font-medium">{(app.size / 100).toFixed(2)} a</span>
        </div>
        {app.additionalNotes && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("fieldCalendar.tillages.notes")}</span>
            <span className="font-medium">{app.additionalNotes}</span>
          </div>
        )}
      </div>
    </PageContent>
  );
}
