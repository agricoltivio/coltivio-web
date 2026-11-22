import { useTranslation } from "react-i18next";
import type { OutdoorSchedule, OutdoorScheduleOverride } from "@/api/types";
import { buildHerdYearBars, type HerdTimelineType } from "@/lib/herdTimeline";
import {
  useYearTimeline,
  YearTimelineHeader,
  YearTimelineNavigation,
  YearTimelineZoomControls,
} from "@/components/YearTimelineControls";

const ROW_HEIGHT = 36;

// Same colors as the turnout journal's meadow view, plus grey for stable time
const TYPE_COLORS: Record<HerdTimelineType, string> = {
  pasture: "bg-green-600",
  exercise_yard: "bg-amber-500",
  stable: "bg-slate-500",
};

// One herd's year: schedule bars colored by type, exceptions outlined on top (they take
// precedence over the schedule on their days). Clicking a bar opens it.
export function HerdScheduleTimeline({
  schedules,
  overrides,
  onScheduleClick,
  onOverrideClick,
}: {
  schedules: OutdoorSchedule[];
  overrides: OutdoorScheduleOverride[];
  onScheduleClick?: (schedule: OutdoorSchedule) => void;
  onOverrideClick?: (override: OutdoorScheduleOverride) => void;
}) {
  const { t } = useTranslation();
  const timeline = useYearTimeline();
  const { year, pxPerDay, totalDays } = timeline;

  const today = new Date();
  const todayDay =
    today.getFullYear() === year
      ? Math.floor((today.getTime() - new Date(year, 0, 1).getTime()) / 86_400_000)
      : today.getFullYear() > year
        ? totalDays
        : -1;

  const bars = buildHerdYearBars(schedules, overrides, year);

  function openBar(id: string, isOverride: boolean) {
    if (isOverride) {
      const override = overrides.find((candidate) => candidate.id === id);
      if (override) onOverrideClick?.(override);
      return;
    }
    const schedule = schedules.find((candidate) => candidate.id === id);
    if (schedule) onScheduleClick?.(schedule);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <YearTimelineNavigation
          year={year}
          onYearChange={timeline.setYear}
          onToday={timeline.goToToday}
        />
        <YearTimelineZoomControls zoom={timeline.zoom} onZoomChange={timeline.changeZoom} />
      </div>

      <div ref={timeline.scrollerRef} className="overflow-x-auto rounded-md border">
        <div style={{ width: timeline.timelineWidth }} className="relative">
          <YearTimelineHeader labels={timeline.headerLabels} />
          <div className="relative" style={{ height: ROW_HEIGHT }}>
            {/* Today */}
            {todayDay >= 0 && todayDay < totalDays && (
              <div
                className="absolute top-0 bottom-0 z-20 border-l-2 border-destructive"
                style={{ left: todayDay * pxPerDay }}
              />
            )}
            {bars.map((bar) => {
              const label = t(`herds.scheduleTypes.${bar.type}`);
              return (
                <button
                  type="button"
                  key={`${bar.id}-${bar.startDay}`}
                  onClick={() => openBar(bar.id, bar.isOverride)}
                  className={`absolute rounded-sm opacity-85 hover:opacity-100 ${TYPE_COLORS[bar.type]} ${
                    bar.isOverride ? "z-10 ring-2 ring-foreground" : ""
                  } ${bar.startDay > todayDay ? "opacity-50" : ""}`}
                  style={{
                    left: bar.startDay * pxPerDay,
                    width: Math.max((bar.endDay - bar.startDay + 1) * pxPerDay, 3),
                    top: 6,
                    height: ROW_HEIGHT - 12,
                  }}
                  title={bar.notes ? `${label}: ${bar.notes}` : label}
                  aria-label={bar.notes ? `${label}: ${bar.notes}` : label}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {(["pasture", "exercise_yard", "stable"] as const).map((type) => (
          <span key={type} className="flex items-center gap-1">
            <span className={`inline-block h-3 w-3 rounded-sm ${TYPE_COLORS[type]}`} />
            {t(`herds.scheduleTypes.${type}`)}
          </span>
        ))}
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm ring-2 ring-foreground" />
          {t("herds.overrides.title")}
        </span>
      </div>
    </div>
  );
}
