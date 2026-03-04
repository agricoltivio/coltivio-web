import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
  const navigate = useNavigate();
  const { plotId } = Route.useSearch();
  const [zoom, setZoom] = useState<ZoomLevel>("months");

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
      {/* Planning is per-plot — only show when a plot is filtered */}
      {plotId && (
        <div className="flex justify-end mb-4">
          <Button
            onClick={() =>
              navigate({
                to: "/field-calendar/plots/$plotId/crop-rotations",
                params: { plotId },
              })
            }
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("fieldCalendar.cropRotations.planFor", { name: "" }).trim()}
          </Button>
        </div>
      )}
      <CropRotationTimeline
        rotations={filteredRotations}
        plots={filteredPlots}
        zoom={zoom}
        onZoomChange={setZoom}
        timelineStart={timelineStart}
        timelineEnd={timelineEnd}
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
