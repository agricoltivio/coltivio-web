import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OutdoorSchedule, OutdoorScheduleOverride } from "@/api/types";
import { buildHerdYearBars, type HerdTimelineType } from "@/lib/herdTimeline";

const DAY_WIDTH = 4;
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
  const { t, i18n } = useTranslation();
  const [year, setYear] = useState(new Date().getFullYear());

  const yearStart = new Date(year, 0, 1);
  const daysOfYear = Math.round(
    (new Date(year + 1, 0, 1).getTime() - yearStart.getTime()) / 86_400_000,
  );
  const timelineWidth = daysOfYear * DAY_WIDTH;
  const today = new Date();
  const todayDay =
    today.getFullYear() < year
      ? -1
      : today.getFullYear() > year
        ? daysOfYear
        : Math.floor((today.getTime() - yearStart.getTime()) / 86_400_000);

  const months = Array.from({ length: 12 }, (_, monthIndex) => {
    const monthStart = new Date(year, monthIndex, 1);
    const dayOffset = Math.round(
      (monthStart.getTime() - yearStart.getTime()) / 86_400_000,
    );
    return {
      name: monthStart.toLocaleString(i18n.language, { month: "short" }),
      left: dayOffset * DAY_WIDTH,
      width: new Date(year, monthIndex + 1, 0).getDate() * DAY_WIDTH,
    };
  });

  const bars = buildHerdYearBars(schedules, overrides, year);

  // Open on today (current year) or the first bar, not on January
  const scrollerRef = useRef<HTMLDivElement>(null);
  const focusDay =
    todayDay >= 0 && todayDay < daysOfYear ? todayDay : (bars[0]?.startDay ?? 0);
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollLeft = Math.max(0, focusDay * DAY_WIDTH - scroller.clientWidth / 2);
  }, [year, focusDay]);

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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label={String(year - 1)}
            onClick={() => setYear(year - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="w-12 text-center font-medium">{year}</span>
          <Button
            variant="outline"
            size="icon"
            aria-label={String(year + 1)}
            onClick={() => setYear(year + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
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

      <div ref={scrollerRef} className="overflow-x-auto rounded-md border">
        <div style={{ width: timelineWidth }} className="relative">
          {/* Month headers */}
          <div className="relative h-8 border-b">
            {months.map((month) => (
              <div
                key={month.left}
                className="absolute flex h-full items-center border-r px-1 text-xs text-muted-foreground"
                style={{ left: month.left, width: month.width }}
              >
                {month.name}
              </div>
            ))}
          </div>
          <div className="relative" style={{ height: ROW_HEIGHT }}>
            {/* Today */}
            {todayDay >= 0 && todayDay < daysOfYear && (
              <div
                className="absolute top-0 bottom-0 w-px bg-primary"
                style={{ left: todayDay * DAY_WIDTH }}
              />
            )}
            {bars.map((bar) => {
              const left = bar.startDay * DAY_WIDTH;
              const width = (bar.endDay - bar.startDay + 1) * DAY_WIDTH;
              const label = t(`herds.scheduleTypes.${bar.type}`);
              return (
                <button
                  type="button"
                  key={`${bar.id}-${bar.startDay}`}
                  onClick={() => openBar(bar.id, bar.isOverride)}
                  className={`absolute rounded-sm opacity-85 hover:opacity-100 ${TYPE_COLORS[bar.type]} ${
                    bar.isOverride ? "z-10 ring-2 ring-foreground" : ""
                  } ${bar.startDay > todayDay ? "opacity-50" : ""}`}
                  style={{ left, width, top: 6, height: ROW_HEIGHT - 12 }}
                  title={bar.notes ? `${label}: ${bar.notes}` : label}
                  aria-label={bar.notes ? `${label}: ${bar.notes}` : label}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
