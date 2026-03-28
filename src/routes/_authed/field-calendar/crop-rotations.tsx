import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMembership } from "@/lib/useMembership";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { cropRotationsQueryOptions } from "@/api/cropRotations.queries";
import { plotsQueryOptions } from "@/api/plots.queries";
import { CropRotationTimeline } from "@/components/CropRotationTimeline";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import type { ZoomLevel } from "@/lib/cropRotationTimelineUtils";
import { Plus } from "lucide-react";

const searchSchema = z.object({
  plotId: z.string().optional(),
});

export const Route = createFileRoute("/_authed/field-calendar/crop-rotations")({
  validateSearch: searchSchema,
  loader: ({ context: { queryClient } }) => {
    const year = new Date().getFullYear();
    const fromDate = new Date(year - 10, 0, 1).toISOString();
    const toDate = new Date(year + 25, 11, 31, 23, 59, 59).toISOString();
    queryClient.ensureQueryData(cropRotationsQueryOptions(fromDate, toDate));
    queryClient.ensureQueryData(plotsQueryOptions());
  },
  component: CropRotations,
});

function CropRotations() {
  const { t } = useTranslation();
  const { hasAccess } = useMembership();
  const navigate = useNavigate();
  const { plotId } = Route.useSearch();
  const [zoom, setZoom] = useState<ZoomLevel>("years");
  const [selectedPlotIds, setSelectedPlotIds] = useState<string[]>([]);

  const currentYear = new Date().getFullYear();
  const timelineStart = new Date(currentYear - 10, 0, 1);
  const timelineEnd = new Date(currentYear + 25, 11, 31, 23, 59, 59);

  const fromDate = timelineStart.toISOString();
  const toDate = timelineEnd.toISOString();

  const rotationsQuery = useQuery(cropRotationsQueryOptions(fromDate, toDate));
  const plotsQuery = useQuery(plotsQueryOptions());

  const allRotations = rotationsQuery.data?.result ?? [];
  const allPlots = plotsQuery.data?.result ?? [];

  // Filter to specific plot if plotId search param is set
  const filteredRotations = plotId
    ? allRotations.filter((r) => r.plotId === plotId)
    : allRotations;
  const filteredPlots = plotId
    ? allPlots.filter((p) => p.id === plotId)
    : allPlots;

  return (
    <PageContent
      title={t("fieldCalendar.cropRotations.title")}
      showBackButton={false}
    >
      <div className="flex items-center justify-between mb-4">
        {hasAccess && (
          <Button variant="outline" size="sm" asChild>
            <Link to="/field-calendar/crop-rotation-drafts">
              {t("fieldCalendar.cropRotationDrafts.drafts")}
            </Link>
          </Button>
        )}
        {selectedPlotIds.length > 0 && (
          <Button
            size="sm"
            onClick={() =>
              navigate({
                to: "/field-calendar/crop-rotations/plan",
                search: { plotIds: selectedPlotIds },
              })
            }
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("fieldCalendar.cropRotations.plan")} ({selectedPlotIds.length})
          </Button>
        )}
      </div>
      <CropRotationTimeline
        rotations={filteredRotations}
        plots={filteredPlots}
        zoom={zoom}
        onZoomChange={setZoom}
        timelineStart={timelineStart}
        timelineEnd={timelineEnd}
        selectedPlotIds={selectedPlotIds}
        onPlotSelect={(id, selected) =>
          setSelectedPlotIds((prev) =>
            selected ? [...prev, id] : prev.filter((p) => p !== id),
          )
        }
        onBarClick={(rotationId) => {
          const rotation = allRotations.find((r) => r.id === rotationId);
          if (rotation) {
            navigate({
              to: "/field-calendar/plots/$plotId/crop-rotations",
              params: { plotId: rotation.plotId },
            });
          }
        }}
      />
    </PageContent>
  );
}
