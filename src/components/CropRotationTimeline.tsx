import { Link } from "@tanstack/react-router";
import { useRef, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  buildTimelineData,
  getScaleForZoomLevel,
  getTodayX,
  hexToRgba,
  stringToColor,
  type TimelineData,
  type ZoomLevel,
} from "@/lib/cropRotationTimelineUtils";
import type { Plot } from "@/api/types";
import type { TimelineRotation } from "@/lib/cropRotationTimelineUtils";

const ROW_HEIGHT = 36;
const LEFT_COLUMN_WIDTH = 140;

type CropRotationTimelineProps = {
  rotations: TimelineRotation[];
  plots: Plot[];
  zoom: ZoomLevel;
  onZoomChange: (zoom: ZoomLevel) => void;
  timelineStart: Date;
  timelineEnd: Date;
  onBarClick?: (rotationId: string) => void;
  // Override the default plot-name link (which goes to the live plan screen).
  // When provided, plot names render as buttons instead of links.
  onPlotClick?: (plotId: string) => void;
  // When provided, checkboxes appear next to plot names for multi-plot selection.
  selectedPlotIds?: string[];
  onPlotSelect?: (plotId: string, selected: boolean) => void;
};

export function CropRotationTimeline({
  rotations,
  plots,
  zoom,
  onZoomChange,
  timelineStart,
  timelineEnd,
  onBarClick,
  onPlotClick,
  selectedPlotIds,
  onPlotSelect,
}: CropRotationTimelineProps) {
  const { t } = useTranslation();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const leftColumnRef = useRef<HTMLDivElement>(null);
  // Stores the center date before a zoom change so we can restore scroll after re-render
  const centerDateRef = useRef<Date | null>(null);

  const pxPerDay = getScaleForZoomLevel(zoom);

  const timelineData: TimelineData = buildTimelineData(
    rotations,
    plots,
    zoom,
    timelineStart,
    timelineEnd,
  );

  const todayX = getTodayX(timelineStart, pxPerDay);

  // Scroll to today once, after data has arrived (rotations.length > 0 or plots settled).
  // Keying on plots.length means a hard reload — where data arrives asynchronously —
  // still gets the correct clientWidth because the layout is finalized by then.
  const initialScrollDoneRef = useRef(false);
  useEffect(() => {
    if (plots.length === 0 || initialScrollDoneRef.current) return;
    // Double RAF so clientWidth is measured after layout is complete.
    // Mark done only after the scroll actually executes — if the RAF is
    // cancelled by cleanup (StrictMode or fast unmount), the flag stays false
    // so the next effect invocation retries.
    let inner: number;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        if (!scrollAreaRef.current || scrollAreaRef.current.clientWidth === 0) return;
        initialScrollDoneRef.current = true;
        const todayOffset = getTodayX(timelineStart, pxPerDay);
        scrollAreaRef.current.scrollLeft = Math.max(0, todayOffset - scrollAreaRef.current.clientWidth / 2);
        if (headerScrollRef.current) {
          headerScrollRef.current.scrollLeft = scrollAreaRef.current.scrollLeft;
        }
      });
    });
    return () => { cancelAnimationFrame(outer); cancelAnimationFrame(inner); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plots.length]);

  // After zoom changes, restore scroll so the same date stays centered
  useEffect(() => {
    if (!scrollAreaRef.current || !centerDateRef.current) return;
    const newPxPerDay = getScaleForZoomLevel(zoom);
    const centerDays = (centerDateRef.current.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24);
    const newScrollLeft = Math.max(0, centerDays * newPxPerDay - scrollAreaRef.current.clientWidth / 2);
    scrollAreaRef.current.scrollLeft = newScrollLeft;
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = newScrollLeft;
    }
    centerDateRef.current = null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  // Sync horizontal scroll to header and vertical scroll to the left name column.
  // The left column uses overflow-hidden so it clips without its own scrollbar,
  // and we drive its scrollTop from here to keep names aligned with rows.
  const handleBodyScroll = useCallback(() => {
    if (headerScrollRef.current && scrollAreaRef.current) {
      headerScrollRef.current.scrollLeft = scrollAreaRef.current.scrollLeft;
    }
    if (leftColumnRef.current && scrollAreaRef.current) {
      leftColumnRef.current.scrollTop = scrollAreaRef.current.scrollTop;
    }
  }, []);

  function scrollToToday() {
    if (!scrollAreaRef.current) return;
    const todayOffset = getTodayX(timelineStart, pxPerDay);
    const containerWidth = scrollAreaRef.current.clientWidth;
    scrollAreaRef.current.scrollLeft = Math.max(
      0,
      todayOffset - containerWidth / 2,
    );
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = scrollAreaRef.current.scrollLeft;
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <ToggleGroup
          type="single"
          variant="outline"
          spacing={0}
          value={zoom}
          onValueChange={(value) => {
            if (!value) return;
            // Capture current center date so the zoom-change effect can restore scroll
            if (scrollAreaRef.current) {
              const centerX = scrollAreaRef.current.scrollLeft + scrollAreaRef.current.clientWidth / 2;
              const centerDays = centerX / pxPerDay;
              centerDateRef.current = new Date(timelineStart.getTime() + centerDays * 24 * 60 * 60 * 1000);
            }
            onZoomChange(value as ZoomLevel);
          }}
        >
          <ToggleGroupItem value="years">{t("fieldCalendar.timeline.years")}</ToggleGroupItem>
          <ToggleGroupItem value="months">{t("fieldCalendar.timeline.months")}</ToggleGroupItem>
          <ToggleGroupItem value="weeks">{t("fieldCalendar.timeline.weeks")}</ToggleGroupItem>
        </ToggleGroup>
        <Button variant="outline" size="sm" onClick={scrollToToday}>
          {t("fieldCalendar.timeline.today")}
        </Button>
      </div>

      {/* Timeline container */}
      <div className="rounded-md border overflow-hidden">
        {/* Header row: fixed label spacer + scrollable month/week labels */}
        <div className="flex border-b bg-muted/30">
          <div
            className="shrink-0 border-r"
            style={{ width: LEFT_COLUMN_WIDTH }}
          />
          {/* Header scroll area — controlled via JS, no visible scrollbar */}
          <div
            ref={headerScrollRef}
            className="flex-1 overflow-hidden"
            style={{ pointerEvents: "none" }}
          >
            <div
              className="relative"
              style={{ width: timelineData.totalWidth, height: 32 }}
            >
              {timelineData.gridLines
                .filter((line) => line.isMajor && line.label)
                .map((line, i) => (
                  <div
                    key={`header-${i}`}
                    className="absolute top-0 bottom-0 flex items-center border-l border-border px-1"
                    style={{ left: line.x }}
                  >
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {line.label}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Body: fixed plot names + scrollable bars */}
        <div className="flex overflow-hidden" style={{ maxHeight: "60vh" }}>
          {/* Fixed left column — plot names. overflow-hidden so it clips without
              its own scrollbar; scrollTop is driven by handleBodyScroll. */}
          <div
            ref={leftColumnRef}
            className="shrink-0 border-r bg-background overflow-hidden"
            style={{ width: LEFT_COLUMN_WIDTH }}
          >
            {timelineData.plots.map((plotData) => (
              <div
                key={plotData.plotId}
                className="flex items-center gap-1.5 px-2 border-b"
                style={{ height: ROW_HEIGHT }}
              >
                {onPlotSelect && (
                  <Checkbox
                    checked={selectedPlotIds?.includes(plotData.plotId) ?? false}
                    onCheckedChange={(checked) => onPlotSelect(plotData.plotId, !!checked)}
                  />
                )}
                {onPlotClick ? (
                  <button
                    className="text-xs font-medium truncate hover:underline text-left flex-1 min-w-0"
                    onClick={() => onPlotClick(plotData.plotId)}
                  >
                    {plotData.plotName}
                  </button>
                ) : (
                  <Link
                    to="/field-calendar/plots/$plotId/crop-rotations"
                    params={{ plotId: plotData.plotId }}
                    className="text-xs font-medium truncate hover:underline flex-1 min-w-0"
                  >
                    {plotData.plotName}
                  </Link>
                )}
              </div>
            ))}
          </div>

          {/* Scrollable body */}
          <div
            ref={scrollAreaRef}
            className="flex-1 min-w-0 overflow-x-auto overflow-y-auto"
            onScroll={handleBodyScroll}
          >
            <div
              className="relative"
              style={{
                width: timelineData.totalWidth,
                minHeight: timelineData.plots.length * ROW_HEIGHT,
              }}
            >
              {/* Grid lines */}
              {timelineData.gridLines.map((line, i) => (
                <div
                  key={`gridline-${i}`}
                  className={`absolute top-0 bottom-0 border-l ${line.isMajor ? "border-border" : "border-border/30"}`}
                  style={{ left: line.x }}
                />
              ))}

              {/* Today line */}
              <div
                className="absolute top-0 bottom-0 border-l-2 border-destructive z-10"
                style={{ left: todayX }}
              />

              {/* Plot rows */}
              {timelineData.plots.map((plotData, rowIndex) => (
                <div
                  key={plotData.plotId}
                  className="absolute left-0 right-0 border-b"
                  style={{
                    top: rowIndex * ROW_HEIGHT,
                    height: ROW_HEIGHT,
                  }}
                >
                  {plotData.bars.map((bar) => (
                    <button
                      key={`${bar.rotationId}-${bar.fromDate}`}
                      className="absolute top-1.5 bottom-1.5 rounded-sm flex items-center px-1 cursor-pointer transition-opacity overflow-hidden hover:opacity-90"
                      style={{
                        left: bar.left,
                        width: Math.max(bar.width, 4),
                        backgroundColor: hexToRgba(stringToColor(bar.cropName), 0.82),
                        borderLeft: `3px solid ${stringToColor(bar.cropName)}`,
                      }}
                      title={`${bar.cropName}: ${new Date(bar.fromDate).toLocaleDateString()} – ${new Date(bar.toDate).toLocaleDateString()}`}
                      onClick={() => onBarClick?.(bar.rotationId)}
                    >
                      {bar.width > 30 && (
                        <span className="text-white text-xs font-medium truncate leading-none">
                          {bar.cropName}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
