import { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { getScaleForZoomLevel } from "@/lib/cropRotationTimelineUtils";

// Year, zoom (months / weeks) and "Today" for the one-year timelines (turnout journal,
// herd), with the same scales as the crop rotation timeline.

type HeaderLabel = { x: number; label: string };

export type YearTimelineZoom = "months" | "weeks";

const MS_PER_DAY = 86_400_000;

function dayOfYear(date: Date, year: number) {
  return Math.floor((date.getTime() - new Date(year, 0, 1).getTime()) / MS_PER_DAY);
}

export function useYearTimeline() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [zoom, setZoom] = useState<YearTimelineZoom>("months");
  const [scrollRequest, setScrollRequest] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);
  // Day of the year to center after the next render; opens on today
  const pendingCenterDayRef = useRef<number | null>(dayOfYear(new Date(), currentYear));

  const { i18n } = useTranslation();
  const pxPerDay = getScaleForZoomLevel(zoom);
  const totalDays = dayOfYear(new Date(year + 1, 0, 1), year);
  // Month starts, or week starts (Mondays) when zoomed in; no year, it's in the year switcher
  const headerLabels: HeaderLabel[] = [];
  for (let day = 0; day < totalDays; day++) {
    const date = new Date(year, 0, 1 + day);
    if (zoom === "months" && date.getDate() === 1) {
      headerLabels.push({
        x: day * pxPerDay,
        label: date.toLocaleString(i18n.language, { month: "short" }),
      });
    } else if (zoom === "weeks" && date.getDay() === 1) {
      headerLabels.push({
        x: day * pxPerDay,
        label: date.toLocaleString(i18n.language, { day: "2-digit", month: "short" }),
      });
    }
  }

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    const centerDay = pendingCenterDayRef.current;
    if (!scroller || centerDay === null) return;
    scroller.scrollLeft = Math.max(0, centerDay * pxPerDay - scroller.clientWidth / 2);
    pendingCenterDayRef.current = null;
  }, [year, zoom, scrollRequest, pxPerDay]);

  // Zooming centers today when it's in view (the whole year can be narrower than the view,
  // then its middle would be some other day), otherwise keeps the day in the middle
  function changeZoom(nextZoom: YearTimelineZoom) {
    const scroller = scrollerRef.current;
    if (scroller) {
      const firstVisibleDay = scroller.scrollLeft / pxPerDay;
      const lastVisibleDay = (scroller.scrollLeft + scroller.clientWidth) / pxPerDay;
      const todayDay = year === currentYear ? dayOfYear(new Date(), year) : null;
      pendingCenterDayRef.current =
        todayDay !== null && todayDay >= firstVisibleDay && todayDay <= lastVisibleDay
          ? todayDay
          : (firstVisibleDay + lastVisibleDay) / 2;
    }
    setZoom(nextZoom);
  }

  function goToToday() {
    if (year !== currentYear) setYear(currentYear);
    pendingCenterDayRef.current = dayOfYear(new Date(), currentYear);
    setScrollRequest((request) => request + 1);
  }

  return {
    year,
    setYear,
    zoom,
    changeZoom,
    goToToday,
    scrollerRef,
    pxPerDay,
    totalDays,
    timelineWidth: totalDays * pxPerDay,
    headerLabels,
  };
}

// ‹ 2026 › [Months | Weeks] Today
export function YearTimelineNavigation({
  year,
  onYearChange,
  zoom,
  onZoomChange,
  onToday,
}: {
  year: number;
  onYearChange: (year: number) => void;
  zoom: YearTimelineZoom;
  onZoomChange: (zoom: YearTimelineZoom) => void;
  onToday: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        aria-label={String(year - 1)}
        onClick={() => onYearChange(year - 1)}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="w-14 text-center text-lg font-semibold">{year}</span>
      <Button
        variant="outline"
        size="icon"
        aria-label={String(year + 1)}
        onClick={() => onYearChange(year + 1)}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      <YearTimelineZoomControls zoom={zoom} onZoomChange={onZoomChange} />
      <Button variant="outline" size="sm" onClick={onToday}>
        {t("fieldCalendar.timeline.today")}
      </Button>
    </div>
  );
}

export function YearTimelineZoomControls({
  zoom,
  onZoomChange,
}: {
  zoom: YearTimelineZoom;
  onZoomChange: (zoom: YearTimelineZoom) => void;
}) {
  const { t } = useTranslation();
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      spacing={0}
      value={zoom}
      onValueChange={(value) => {
        if (value === "months" || value === "weeks") onZoomChange(value);
      }}
    >
      <ToggleGroupItem value="months">{t("fieldCalendar.timeline.months")}</ToggleGroupItem>
      <ToggleGroupItem value="weeks">{t("fieldCalendar.timeline.weeks")}</ToggleGroupItem>
    </ToggleGroup>
  );
}

export function YearTimelineHeader({ labels }: { labels: HeaderLabel[] }) {
  return (
    <div className="relative h-8 border-b">
      {labels.map((label) => (
        <div
          key={label.x}
          className="absolute top-0 bottom-0 flex items-center border-l px-1"
          style={{ left: label.x }}
        >
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {label.label}
          </span>
        </div>
      ))}
    </div>
  );
}
