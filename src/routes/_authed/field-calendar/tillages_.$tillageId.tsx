import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { useFeatureAccess } from "@/lib/useFeatureAccess";
import { tillageQueryOptions } from "@/api/tillages.queries";
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
  "/_authed/field-calendar/tillages_/$tillageId",
)({
  loader: ({ context: { queryClient }, params: { tillageId } }) => {
    queryClient.ensureQueryData(tillageQueryOptions(tillageId));
  },
  component: TillageDetail,
});

function TillageDetail() {
  const { t } = useTranslation();
  const { canWrite: canWriteTillages } = useFeatureAccess("field_calendar");
  const { tillageId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const tillageQuery = useQuery(tillageQueryOptions(tillageId));
  const tillage = tillageQuery.data;

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.DELETE("/v1/tillages/byId/{tillageId}", {
        params: { path: { tillageId } },
      });
      if (response.error) throw new Error("Failed to delete tillage");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tillages"] });
      navigate({ to: "/field-calendar/tillages" });
    },
  });

  if (!tillage) {
    return (
      <PageContent title={t("common.loading")} showBackButton backTo={() => navigate({ to: "/field-calendar/tillages" })}>
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </PageContent>
    );
  }

  const actionLabel =
    tillage.action === "custom"
      ? (tillage.customAction ?? tillage.action)
      : t(`fieldCalendar.tillages.actions.${tillage.action}`);

  return (
    <PageContent
      title={`${actionLabel} – ${tillage.plot.name}`}
      showBackButton
      backTo={() => navigate({ to: "/field-calendar/tillages" })}
    >
      {canWriteTillages && (
        <div className="flex justify-end gap-2 mb-6">
          <Button asChild variant="outline">
            <Link
              to="/field-calendar/tillages/$tillageId/edit"
              params={{ tillageId }}
            >
              {t("common.edit")}
            </Link>
          </Button>
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
                  {t("fieldCalendar.tillages.deleteConfirm")}
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
          <span className="font-medium">{tillage.plot.name}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t("fieldCalendar.tillages.date")}</span>
          <span className="font-medium">{new Date(tillage.date).toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t("fieldCalendar.tillages.action")}</span>
          <span className="font-medium">{actionLabel}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t("fieldCalendar.tillages.size")}</span>
          <span className="font-medium">{(tillage.size / 100).toFixed(2)} a</span>
        </div>
        {tillage.additionalNotes && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("fieldCalendar.tillages.notes")}</span>
            <span className="font-medium">{tillage.additionalNotes}</span>
          </div>
        )}
      </div>
    </PageContent>
  );
}
