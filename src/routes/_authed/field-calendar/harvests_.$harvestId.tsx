import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { harvestQueryOptions } from "@/api/harvests.queries";
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
  "/_authed/field-calendar/harvests_/$harvestId",
)({
  loader: ({ context: { queryClient }, params: { harvestId } }) => {
    queryClient.ensureQueryData(harvestQueryOptions(harvestId));
  },
  component: HarvestDetail,
});

function HarvestDetail() {
  const { t } = useTranslation();
  const { harvestId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { canWrite } = useFeatureAccess("field_calendar");
  const harvestQuery = useQuery(harvestQueryOptions(harvestId));
  const harvest = harvestQuery.data;

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.DELETE("/v1/harvests/byId/{harvestId}", {
        params: { path: { harvestId } },
      });
      if (response.error) throw new Error("Failed to delete harvest");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["harvests"] });
      navigate({ to: "/field-calendar/harvests" });
    },
  });

  if (!harvest) {
    return (
      <PageContent title={t("common.loading")} showBackButton backTo={() => navigate({ to: "/field-calendar/harvests" })}>
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </PageContent>
    );
  }

  return (
    <PageContent
      title={`${harvest.crop.name} – ${harvest.plot.name}`}
      showBackButton
      backTo={() => navigate({ to: "/field-calendar/harvests" })}
      actions={
        canWrite && (
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
                  {t("fieldCalendar.harvests.deleteConfirm")}
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
        )
      }
    >
      <div className="rounded-md border p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t("fieldCalendar.plots.plot")}</span>
          <span className="font-medium">{harvest.plot.name}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t("fieldCalendar.harvests.crop")}</span>
          <span className="font-medium">{harvest.crop.name}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t("fieldCalendar.harvests.date")}</span>
          <span className="font-medium">{new Date(harvest.date).toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t("fieldCalendar.harvests.amount")}</span>
          <span className="font-medium">
            {harvest.numberOfUnits} × {harvest.kilosPerUnit} kg
            ({t(`fieldCalendar.harvests.units.${harvest.unit}`)})
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t("fieldCalendar.tillages.size")}</span>
          <span className="font-medium">{(harvest.size / 100).toFixed(2)} a</span>
        </div>
        {harvest.conservationMethod && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {t("fieldCalendar.harvests.conservationMethod")}
            </span>
            <span className="font-medium">
              {t(`fieldCalendar.harvests.conservationMethods.${harvest.conservationMethod}`)}
            </span>
          </div>
        )}
        {harvest.additionalNotes && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("fieldCalendar.tillages.notes")}</span>
            <span className="font-medium">{harvest.additionalNotes}</span>
          </div>
        )}
      </div>
    </PageContent>
  );
}
