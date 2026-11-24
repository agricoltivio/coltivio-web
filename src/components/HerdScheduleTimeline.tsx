import { useTranslation } from "react-i18next";
import type { OutdoorSchedule, OutdoorScheduleOverride } from "@/api/types";
import {
  buildHerdYearBars,
  HERD_TYPE_COLORS as TYPE_COLORS,
} from "@/lib/herdTimeline";
import {
  useYearTimeline,
  dayOfYear,
  YearTimelineHeader,
  YearTimelineNavigation,
} from "@/components/YearTimelineControls";

const ROW_HEIGHT = 36;

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
      ? dayOfYear(today, year)
      : today.getFullYear() > year
        ? totalDays
        : -1;

  const bars = buildHerdYearBars(schedules, overrides, year);

  // The current year opens on today, other years on their first bar
  function changeYear(nextYear: number) {
    const firstBarDay = Math.min(
      ...buildHerdYearBars(schedules, overrides, nextYear).map(
        (bar) => bar.startDay,
      ),
    );
    const centerDay =
      nextYear === today.getFullYear()
        ? dayOfYear(today, nextYear)
        : Number.isFinite(firstBarDay)
          ? firstBarDay
          : 0;
    timeline.changeYear(nextYear, centerDay);
  }

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
          onYearChange={changeYear}
          zoom={timeline.zoom}
          onZoomChange={timeline.changeZoom}
          onToday={timeline.goToToday}
        />
      </div>

      <div
        ref={timeline.scrollerRef}
        className="overflow-x-auto rounded-md border"
      >
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
              const left = bar.startDay * pxPerDay;
              const width = Math.max(
                (bar.endDay - bar.startDay + 1) * pxPerDay,
                3,
              );
              // Planned part (from today on) lighter, like in the turnout journal
              const plannedFrom = Math.min(
                Math.max(todayDay * pxPerDay - left, 0),
                width,
              );
              return (
                <button
                  type="button"
                  key={`${bar.id}-${bar.startDay}`}
                  onClick={() => openBar(bar.id, bar.isOverride)}
                  className={`absolute overflow-hidden rounded-sm opacity-85 hover:opacity-100 ${TYPE_COLORS[bar.type]} ${
                    bar.isOverride ? "z-10 ring-2 ring-foreground" : ""
                  }`}
                  style={{ left, width, top: 6, height: ROW_HEIGHT - 12 }}
                  title={bar.notes ? `${label}: ${bar.notes}` : label}
                  aria-label={bar.notes ? `${label}: ${bar.notes}` : label}
                >
                  {plannedFrom < width && (
                    <span
                      className="absolute top-0 bottom-0 border-2 border-l-0 border-dashed border-white/80 bg-white/55"
                      style={{ left: plannedFrom, right: 0 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {(["pasture", "exercise_yard", "stable"] as const).map((type) => (
          <span key={type} className="flex items-center gap-1">
            <span
              className={`inline-block h-3 w-3 rounded-sm ${TYPE_COLORS[type]}`}
            />
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
