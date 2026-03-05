import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { plotQueryOptions } from "@/api/plots.queries";
import { PageContent } from "@/components/PageContent";
import {
  CalendarDays,
  ChevronRight,
  Droplets,
  Layers,
  RefreshCw,
  Shield,
  Wheat,
} from "lucide-react";

export const Route = createFileRoute("/_authed/field-calendar/plots_/$plotId")({
  loader: ({ context: { queryClient }, params: { plotId } }) => {
    queryClient.ensureQueryData(plotQueryOptions(plotId));
  },
  component: PlotDetail,
});

function PlotDetail() {
  const { t } = useTranslation();
  const { plotId } = Route.useParams();
  const navigate = useNavigate();
  const plotQuery = useQuery(plotQueryOptions(plotId));
  const plot = plotQuery.data;

  if (!plot) {
    return (
      <PageContent title={t("common.loading")} showBackButton backTo={() => navigate({ to: "/field-calendar/plots" })}>
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </PageContent>
    );
  }

  const navLinks = [
    {
      icon: Wheat,
      label: t("fieldCalendar.harvests.title"),
      to: "/field-calendar/harvests" as const,
      search: { plotId },
    },
    {
      icon: Droplets,
      label: t("fieldCalendar.fertilizerApplications.title"),
      to: "/field-calendar/fertilizer-applications" as const,
      search: { plotId },
    },
    {
      icon: Layers,
      label: t("fieldCalendar.tillages.title"),
      to: "/field-calendar/tillages" as const,
      search: { plotId },
    },
    {
      icon: Shield,
      label: t("fieldCalendar.cropProtectionApplications.title"),
      to: "/field-calendar/crop-protection-applications" as const,
      search: { plotId },
    },
  ] as const;

  return (
    <PageContent title={plot.name} showBackButton backTo={() => navigate({ to: "/field-calendar/plots" })}>
      {/* Plot info */}
      <div className="rounded-md border p-4 mb-6 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t("fieldCalendar.plots.size")}</span>
          <span className="font-medium">{(plot.size / 100).toFixed(2)} a</span>
        </div>
        {plot.usage !== null && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("fieldCalendar.plots.usage")}</span>
            <span className="font-medium">{plot.usage}</span>
          </div>
        )}
        {plot.cuttingDate && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("fieldCalendar.plots.cuttingDate")}</span>
            <span className="font-medium">
              <CalendarDays className="inline h-3 w-3 mr-1" />
              {new Date(plot.cuttingDate).toLocaleDateString()}
            </span>
          </div>
        )}
        {plot.currentCropRotation && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("fieldCalendar.plots.currentCrop")}</span>
            <span className="font-medium">{plot.currentCropRotation.crop.name}</span>
          </div>
        )}
      </div>

      {/* Navigation list */}
      <div className="rounded-md border divide-y">
        {/* Crop rotations → per-plot planning screen */}
        <Link
          to="/field-calendar/plots/$plotId/crop-rotations"
          params={{ plotId }}
          className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {t("fieldCalendar.cropRotations.title")}
            </span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
        {navLinks.map(({ icon: Icon, label, to, search }) => (
          <Link
            key={to}
            to={to}
            search={search}
            className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{label}</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </PageContent>
  );
}
