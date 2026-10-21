import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useUpdateMeadowMutation } from "@/api/meadows.queries";
import { useUpdatePlotMutation } from "@/api/plots.queries";
import type { Meadow, Plot } from "@/api/types";
import { ArchivedNotice } from "@/components/ArchivedNotice";
import { Button } from "@/components/ui/button";
import { useFeatureAccess } from "@/lib/useFeatureAccess";

// Read-only panel for an archived plot or meadow on the map: restore it or open its details
export function ArchivedAreaPanel({
  kind,
  area,
  onClose,
}: {
  kind: "plot" | "meadow";
  area: Plot | Meadow;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { canWrite: canRestore } = useFeatureAccess(kind === "plot" ? "field_calendar" : "animals");
  const restorePlotMutation = useUpdatePlotMutation();
  const restoreMeadowMutation = useUpdateMeadowMutation();
  const restoreMutation = kind === "plot" ? restorePlotMutation : restoreMeadowMutation;

  function restore() {
    // Restored, it's an active plot or meadow again and leaves the archived layer
    if (kind === "plot") {
      restorePlotMutation.mutate({ plotId: area.id, body: { archived: false } }, { onSuccess: onClose });
      return;
    }
    restoreMeadowMutation.mutate({ meadowId: area.id, body: { archived: false } }, { onSuccess: onClose });
  }

  return (
    <>
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold text-base truncate pr-2">{area.name}</h2>
        <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-xs text-muted-foreground">{t("fieldCalendar.plots.size")}</div>
            <div>{(area.size / 100).toFixed(2)} a</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">{kind === "plot" ? t("meadows.layers.plots") : t("meadows.layers.meadows")}</div>
            <div>{t("archive.archived")}</div>
          </div>
        </div>
        {area.archivedAt && (
          <ArchivedNotice
            kind={kind}
            name={area.name}
            archivedAt={area.archivedAt}
            onRestore={restore}
            isRestoring={restoreMutation.isPending}
            restoreFailed={restoreMutation.isError}
            canRestore={canRestore}
          />
        )}
        {kind === "plot" ? (
          <Link to="/field-calendar/plots/$plotId" params={{ plotId: area.id }} className="block w-full">
            <Button className="w-full" size="sm">{t("fieldCalendar.plots.viewDetails")}</Button>
          </Link>
        ) : (
          <Link to="/animals/meadows/$meadowId" params={{ meadowId: area.id }} className="block w-full">
            <Button className="w-full" size="sm">{t("meadows.usage")}</Button>
          </Link>
        )}
      </div>
    </>
  );
}
