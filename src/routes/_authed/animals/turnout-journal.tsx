import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { outdoorJournalQueryOptions } from "@/api/outdoorJournal.queries";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
        <Button variant="outline" asChild>
          <Link to="/animals/herds">{t("turnoutJournal.manageHerds")} →</Link>
        </Button>
      </div>

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
                      const barStyle = getBarStyle(entry.startDate, entry.endDate);
                      if (barStyle.width === 0) return null;
                      return (
                        <div
                          key={i}
                          className={`absolute top-1 bottom-1 rounded-sm ${getCategoryColor(cat)} opacity-80 flex items-center justify-center`}
                          style={{ left: barStyle.left, width: barStyle.width }}
                          title={`${cat}: ${entry.animalCount} ${t("turnoutJournal.animals")}`}
                        >
                          {barStyle.width > 20 && (
                            <span className="text-white text-xs font-medium">
                              {entry.animalCount}
                            </span>
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
