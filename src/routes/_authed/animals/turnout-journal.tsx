import React, { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { outdoorJournalQueryOptions } from "@/api/outdoorJournal.queries";
import {
  buildCategoryRows,
  buildMeadowRows,
  daysInYear,
} from "@/lib/turnoutJournalTimeline";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authed/animals/turnout-journal")({
  loader: ({ context: { queryClient } }) => {
    const year = new Date().getFullYear();
    queryClient.ensureQueryData(
      outdoorJournalQueryOptions(`${year}-01-01`, `${year}-12-31`),
    );
  },
  component: TurnoutJournal,
});

// Swiss livestock categories in display order
const CATEGORIES = [
  "A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9",
  "B1", "B2", "B3",
  "C1", "C2",
  "D1", "D2", "D3",
  "E1", "E2", "E3", "E4",
  "F1", "F2",
] as const;

type Category = typeof CATEGORIES[number];

// Color by category group
function getCategoryColor(category: Category): string {
  const prefix = category[0];
  const colors: Record<string, string> = {
    A: "bg-green-500",
    B: "bg-blue-500",
    C: "bg-orange-500",
    D: "bg-purple-500",
    E: "bg-red-500",
    F: "bg-teal-500",
  };
  return colors[prefix] ?? "bg-gray-500";
}

function getCategoryColorForRow(rowKey: string): string {
  const category = CATEGORIES.find((cat) => cat === rowKey);
  return category ? getCategoryColor(category) : "bg-gray-500";
}

type JournalView = "categories" | "meadows";
const JOURNAL_VIEWS: JournalView[] = ["categories", "meadows"];

// Height of one timeline line; meadow rows have one per overlapping herd
const LANE_HEIGHT = 32;

function TurnoutJournal() {
  const { t } = useTranslation();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [view, setView] = useState<JournalView>("categories");

  const [exportOpen, setExportOpen] = useState(false);
  const [exportFromDate, setExportFromDate] = useState(`${selectedYear}-01-01`);
  const [exportToDate, setExportToDate] = useState(`${selectedYear}-12-31`);
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const response = await apiClient.POST("/v1/reports/outdoorjournal/download", {
        body: {
          fromDate: exportFromDate,
          toDate: exportToDate,
        },
      });
      if (response.error || !response.data) throw new Error("Export failed");
      const { base64, fileName } = response.data.data;
      const byteCharacters = atob(base64);
      const byteNumbers = Array.from({ length: byteCharacters.length }, (_, i) =>
        byteCharacters.charCodeAt(i),
      );
      const blob = new Blob([new Uint8Array(byteNumbers)], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);
      setExportOpen(false);
    } finally {
      setExporting(false);
    }
  }

  const journalQuery = useQuery(
    outdoorJournalQueryOptions(`${selectedYear}-01-01`, `${selectedYear}-12-31`),
  );
  const data = journalQuery.data;

  const yearStart = new Date(selectedYear, 0, 1);
  const totalDays = daysInYear(selectedYear);
  // 4px per day
  const dayWidth = 4;
  const timelineWidth = totalDays * dayWidth;

  // Generate month labels for header
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(selectedYear, i, 1);
    const dayOffset = Math.floor(
      (d.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24),
    );
    const daysInMonth = new Date(selectedYear, i + 1, 0).getDate();
    return {
      name: d.toLocaleString("default", { month: "short" }),
      left: dayOffset * dayWidth,
      width: daysInMonth * dayWidth,
    };
  });

  // Category rows (only categories with data, or all as placeholders) or one
  // row per meadow with lanes for herds there at the same time
  const entries = data?.entries ?? [];
  const presentCategories = CATEGORIES.filter((cat) =>
    entries.some((e) => e.category === cat),
  );
  const rows =
    view === "meadows"
      ? buildMeadowRows(data?.meadowEntries ?? [], selectedYear)
      : buildCategoryRows(
          entries,
          presentCategories.length > 0 ? presentCategories : CATEGORIES,
          selectedYear,
        );
  const todayDay =
    new Date().getFullYear() === selectedYear
      ? Math.floor(
          (new Date().getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24),
        ) + 1
      : new Date().getFullYear() > selectedYear
        ? totalDays
        : 0;

  return (
    <PageContent title={t("turnoutJournal.title")} showBackButton={false}>
      <div className="flex items-center justify-between mb-4">
        {/* Year navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSelectedYear((y) => y - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-lg font-semibold w-16 text-center">{selectedYear}</span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSelectedYear((y) => y + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {/* Category or meadow rows */}
          <div className="flex rounded-md border overflow-hidden">
            {JOURNAL_VIEWS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setView(option)}
                className={`px-3 py-1.5 text-sm ${
                  view === option
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                {option === "meadows"
                  ? t("turnoutJournal.viewMeadows")
                  : t("turnoutJournal.viewCategories")}
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={() => {
            setExportFromDate(`${selectedYear}-01-01`);
            setExportToDate(`${selectedYear}-12-31`);
            setExportOpen(true);
          }}>
            {t("common.export")}
          </Button>
          <Button variant="outline" asChild>
            <Link to="/animals/herds">{t("turnoutJournal.manageHerds")} →</Link>
          </Button>
        </div>
      </div>

      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("turnoutJournal.exportDialog.title")}</DialogTitle>
            <DialogDescription>{t("turnoutJournal.exportDialog.description")}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1">
              <Label>{t("common.fromDate")}</Label>
              <Input
                type="date"
                value={exportFromDate}
                onChange={(e) => setExportFromDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("common.toDate")}</Label>
              <Input
                type="date"
                value={exportToDate}
                onChange={(e) => setExportToDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleExport} disabled={exporting || !exportFromDate || !exportToDate}>
              {exporting ? t("common.exporting") : t("common.download")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Timeline */}
      <div className="rounded-md border overflow-hidden">
        <div className="flex">
          {/* Fixed left column */}
          <div className="w-24 shrink-0 border-r bg-muted/30 z-10">
            {/* Header spacer */}
            <div className="h-8 border-b" />
            {/* Row labels, centered across all lanes of a row */}
            {rows.map((row) => (
              <div
                key={row.key}
                className="flex items-center px-2 border-b text-sm font-medium"
                style={{ height: row.laneCount * LANE_HEIGHT }}
                title={row.label}
              >
                <span className="truncate">{row.label}</span>
              </div>
            ))}
            {rows.length === 0 && (
              <div className="h-8 flex items-center px-2 border-b text-sm text-muted-foreground">
                –
              </div>
            )}
          </div>

          {/* Scrollable timeline area */}
          <div className="overflow-x-auto flex-1 min-w-0">
            <div style={{ width: timelineWidth }} className="relative">
              {/* Month headers */}
              <div className="flex h-8 border-b relative">
                {months.map((month) => (
                  <div
                    key={month.name}
                    className="absolute h-full flex items-center border-r text-xs text-muted-foreground px-1"
                    style={{ left: month.left, width: month.width }}
                  >
                    {month.name}
                  </div>
                ))}
              </div>

              {/* Rows; meadow rows grow by one lane per overlapping herd */}
              {rows.map((row) => (
                <div
                  key={row.key}
                  className="border-b relative"
                  style={{ height: row.laneCount * LANE_HEIGHT }}
                >
                  {row.bars.map((bar, index) => {
                    const left = bar.startDay * dayWidth;
                    const width = (bar.endDay - bar.startDay) * dayWidth;
                    // How far into the bar today falls (clamped to bar bounds)
                    const splitOffset = Math.min(
                      Math.max(todayDay * dayWidth - left, 0),
                      width,
                    );
                    const color =
                      view === "meadows"
                        ? bar.scheduleType === "exercise_yard"
                          ? "bg-amber-500"
                          : "bg-green-600"
                        : getCategoryColorForRow(row.key);
                    const title =
                      view === "meadows"
                        ? `${bar.herdName}: ${bar.animalCount} ${t("turnoutJournal.animals")}`
                        : `${row.label}: ${bar.animalCount} ${t("turnoutJournal.animals")}`;
                    const label =
                      view === "meadows"
                        ? `${bar.herdName} (${bar.animalCount})`
                        : String(bar.animalCount);
                    return (
                      <div
                        key={index}
                        className={`absolute rounded-sm ${color} opacity-80 flex items-center justify-center overflow-hidden`}
                        style={{
                          left,
                          width,
                          top: bar.lane * LANE_HEIGHT + 4,
                          height: LANE_HEIGHT - 8,
                        }}
                        title={title}
                      >
                        {width > 20 && (
                          <span className="text-white text-xs font-medium truncate px-1">
                            {label}
                          </span>
                        )}
                        {/* Overlay on the future portion: whitens + dashed border */}
                        {splitOffset < width && (
                          <div
                            className="absolute top-0 bottom-0 bg-white/55 border-l-0 border-2 border-dashed border-white/80"
                            style={{ left: splitOffset, right: 0 }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Uncategorized animals note */}
      {(data?.uncategorizedAnimals.length ?? 0) > 0 && (
        <p className="mt-3 text-sm text-muted-foreground">
          {t("turnoutJournal.uncategorizedCount", {
            count: data!.uncategorizedAnimals.length,
          })}
        </p>
      )}
    </PageContent>
  );
}
