import React, { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { outdoorJournalQueryOptions } from "@/api/outdoorJournal.queries";
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
import { ChevronLeft, ChevronRight, Download } from "lucide-react";

export const Route = createFileRoute("/_authed/animals/turnout-journal")({
  loader: ({ context: { queryClient } }) => {
    const year = new Date().getFullYear();
    const fromDate = new Date(year, 0, 1).toISOString();
    const toDate = new Date(year, 11, 31, 23, 59, 59).toISOString();
    queryClient.ensureQueryData(outdoorJournalQueryOptions(fromDate, toDate));
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

function TurnoutJournal() {
  const { t } = useTranslation();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [exportOpen, setExportOpen] = useState(false);
  const [exportFromDate, setExportFromDate] = useState(`${selectedYear}-01-01`);
  const [exportToDate, setExportToDate] = useState(`${selectedYear}-12-31`);
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const response = await apiClient.POST("/v1/reports/outdoorjournal/download", {
        body: {
          fromDate: new Date(exportFromDate).toISOString(),
          toDate: new Date(`${exportToDate}T23:59:59`).toISOString(),
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

  const fromDate = new Date(selectedYear, 0, 1).toISOString();
  const toDate = new Date(selectedYear, 11, 31, 23, 59, 59).toISOString();

  const journalQuery = useQuery(outdoorJournalQueryOptions(fromDate, toDate));
  const data = journalQuery.data;

  const yearStart = new Date(selectedYear, 0, 1);
  const isLeapYear = new Date(selectedYear, 1, 29).getDate() === 29;
  const totalDays = isLeapYear ? 366 : 365;
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

  // Filter entries to only those with data
  const entries = data?.entries ?? [];
  const presentCategories = CATEGORIES.filter((cat) =>
    entries.some((e) => e.category === cat),
  );
  const displayCategories = presentCategories.length > 0 ? presentCategories : CATEGORIES;

  function getBarStyle(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const startDay = Math.max(
      0,
      Math.floor((start.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24)),
    );
    const endDay = Math.min(
      totalDays,
      Math.floor((end.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24)) + 1,
    );
    const widthDays = Math.max(0, endDay - startDay);
    return {
      left: startDay * dayWidth,
      width: widthDays * dayWidth,
    };
  }

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
          <Button variant="outline" onClick={() => {
            setExportFromDate(`${selectedYear}-01-01`);
            setExportToDate(`${selectedYear}-12-31`);
            setExportOpen(true);
          }}>
            <Download className="h-4 w-4 mr-2" />
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
              <Download className="h-4 w-4 mr-2" />
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
            {/* Category labels */}
            {displayCategories.map((cat) => (
              <div
                key={cat}
                className="h-8 flex items-center px-2 border-b text-sm font-medium"
              >
                {cat}
              </div>
            ))}
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

              {/* Category rows */}
              {displayCategories.map((cat) => {
                const catEntries = entries.filter((e) => e.category === cat);
                return (
                  <div key={cat} className="h-8 border-b relative">
                    {catEntries.map((entry, i) => {
                      const bar = getBarStyle(entry.startDate, entry.endDate);
                      if (bar.width === 0) return null;

                      // How far into the bar today falls (clamped to bar bounds)
                      const todayPx = (Math.floor(
                        (new Date().getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24),
                      ) + 1) * dayWidth;
                      const splitOffset = Math.min(
                        Math.max(todayPx - bar.left, 0),
                        bar.width,
                      );

                      const color = getCategoryColor(cat);
                      const title = `${cat}: ${entry.animalCount} ${t("turnoutJournal.animals")}`;
                      return (
                        <div
                          key={i}
                          className={`absolute top-1 bottom-1 rounded-sm ${color} opacity-80 flex items-center justify-center overflow-hidden`}
                          style={{ left: bar.left, width: bar.width }}
                          title={title}
                        >
                          {bar.width > 20 && (
                            <span className="text-white text-xs font-medium">{entry.animalCount}</span>
                          )}
                          {/* Overlay on the future portion: whitens + dashed border */}
                          {splitOffset < bar.width && (
                            <div
                              className="absolute top-0 bottom-0 bg-white/55 border-l-0 border-2 border-dashed border-white/80"
                              style={{ left: splitOffset, right: 0 }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
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
