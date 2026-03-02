import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { harvestQueryOptions } from "@/api/harvests.queries";
import { PageContent } from "@/components/PageContent";

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
  const harvestQuery = useQuery(harvestQueryOptions(harvestId));
  const harvest = harvestQuery.data;

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
          <span className="font-medium">{harvest.size.toFixed(2)} ha</span>
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
