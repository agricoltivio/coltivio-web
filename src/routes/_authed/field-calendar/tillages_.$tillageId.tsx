import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { tillageQueryOptions } from "@/api/tillages.queries";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";

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
  const { tillageId } = Route.useParams();
  const tillageQuery = useQuery(tillageQueryOptions(tillageId));
  const tillage = tillageQuery.data;

  if (!tillage) {
    return (
      <PageContent title={t("common.loading")} showBackButton>
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
    >
      <div className="flex justify-end mb-6">
        <Button asChild variant="outline">
          <Link
            to="/field-calendar/tillages/$tillageId/edit"
            params={{ tillageId }}
          >
            {t("common.edit")}
          </Link>
        </Button>
      </div>

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
          <span className="font-medium">{tillage.size.toFixed(2)} ha</span>
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
