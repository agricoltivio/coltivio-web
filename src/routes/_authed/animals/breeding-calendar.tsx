import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Plus, Settings } from "lucide-react";
import { breedingCalendarQueryOptions } from "@/api/breeding.queries";
import type { BreedingCalendarEntry } from "@/api/types";
import { HeatEntryDialog } from "@/components/AnimalBreedingCards";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { inlineLink } from "@/lib/ui";
import { useFeatureAccess } from "@/lib/useFeatureAccess";
import { cn, parseDateOnly, toLocalDateString } from "@/lib/utils";

export const Route = createFileRoute("/_authed/animals/breeding-calendar")({
  component: BreedingCalendarPage,
});

type CalendarEvent = {
  key: string;
  kind: "birth" | "heat";
  date: Date;
  entry: BreedingCalendarEntry;
};

const WEEKDAY_COUNT = 7;

function isSameDay(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function BreedingCalendarPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  // Calendar entry whose heat is open in the dialog
  const [editedEntry, setEditedEntry] = useState<BreedingCalendarEntry | null>(null);
  // New heat for one or several animals, picked in the dialog
  const [addingHeat, setAddingHeat] = useState(false);
  const { canWrite: canWriteAnimals } = useFeatureAccess("animals");
  const monthEnd = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0);

  const calendarQuery = useQuery(
    breedingCalendarQueryOptions(toLocalDateString(visibleMonth), toLocalDateString(monthEnd)),
  );

  // Every entry can produce a heat event and (when mated) a birth event, keep those in the visible month
  const monthEvents = useMemo(() => {
    const events: CalendarEvent[] = [];
    const isInMonth = (date: Date) => date >= visibleMonth && date <= monthEnd;
    for (const entry of calendarQuery.data ?? []) {
      const heatDate = parseDateOnly(entry.date);
      if (isInMonth(heatDate)) events.push({ key: `${entry.id}-heat`, kind: "heat", date: heatDate, entry });
      if (entry.expectedBirthDate) {
        const birthDate = parseDateOnly(entry.expectedBirthDate);
        if (isInMonth(birthDate)) events.push({ key: `${entry.id}-birth`, kind: "birth", date: birthDate, entry });
      }
    }
    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
    // monthEnd is derived from visibleMonth
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarQuery.data, visibleMonth]);

  // Distinct colors (brand palette): heat orange, mated heat teal, expected birth green
  const HEAT_COLOR = "#db751d";
  const MATED_COLOR = "#2a5159";
  const BIRTH_COLOR = "#85a60f";
  function eventColor(event: CalendarEvent) {
    if (event.kind === "birth") return BIRTH_COLOR;
    return event.entry.mated ? MATED_COLOR : HEAT_COLOR;
  }

  // Legend only lists what this month contains; heats use the species words ("Bockig / Stierig")
  const heatLegendLabel = [
    ...new Set(
      monthEvents
        .filter((event) => event.kind === "heat" && !event.entry.mated)
        .map((event) => t(`breeding.heatByType.${event.entry.animal.type}`)),
    ),
  ].join(" / ");
  const legendItems = [
    ...(heatLegendLabel ? [{ color: HEAT_COLOR, label: heatLegendLabel }] : []),
    ...(monthEvents.some((event) => event.kind === "heat" && event.entry.mated)
      ? [{ color: MATED_COLOR, label: t("breeding.mated") }]
      : []),
    { color: BIRTH_COLOR, label: t("breeding.expectedBirth") },
  ];

  const shownEvents = selectedDay ? monthEvents.filter((event) => isSameDay(event.date, selectedDay)) : monthEvents;

  // Monday-first grid: leading blanks before the 1st, then the days of the month
  const leadingBlankDays = (visibleMonth.getDay() + 6) % WEEKDAY_COUNT;
  const dayCells: (Date | null)[] = [
    ...Array.from({ length: leadingBlankDays }, () => null),
    ...Array.from(
      { length: monthEnd.getDate() },
      (_, dayIndex) => new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), dayIndex + 1),
    ),
  ];
  // 2024-01-01 was a Monday
  const weekdayLabels = Array.from({ length: WEEKDAY_COUNT }, (_, dayIndex) =>
    new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(2024, 0, 1 + dayIndex)),
  );
  const today = new Date();

  function changeMonth(monthDelta: number) {
    setVisibleMonth((month) => new Date(month.getFullYear(), month.getMonth() + monthDelta, 1));
    setSelectedDay(null);
  }

  return (
    <PageContent
      title={t("breeding.calendarTitle")}
      actions={
        <Button variant="outline" asChild>
          <Link to="/animals/breeding-calendar/settings">
            <Settings className="h-4 w-4" />
            {t("breeding.settingsTitle")}
          </Link>
        </Button>
      }
    >
      <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="icon" onClick={() => changeMonth(-1)} aria-label={t("breeding.previousMonth")}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <CardTitle>
                  {new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(visibleMonth)}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => changeMonth(1)} aria-label={t("breeding.nextMonth")}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 text-center text-xs text-muted-foreground">
                {weekdayLabels.map((label) => (
                  <div key={label} className="py-1">
                    {label}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {dayCells.map((day, cellIndex) => {
                  if (!day) return <div key={`blank-${cellIndex}`} className="h-14" />;
                  const dayEvents = monthEvents.filter((event) => isSameDay(event.date, day));
                  const dayColors = [...new Set(dayEvents.map(eventColor))];
                  const isSelected = selectedDay != null && isSameDay(day, selectedDay);
                  return (
                    <button
                      type="button"
                      key={day.toISOString()}
                      onClick={() => setSelectedDay(isSelected ? null : day)}
                      className={cn(
                        "flex h-14 flex-col items-center justify-center gap-1 rounded-md text-sm hover:bg-muted/60",
                        isSelected && "bg-primary text-primary-foreground hover:bg-primary",
                        !isSelected && isSameDay(day, today) && "ring-1 ring-primary",
                      )}
                    >
                      <span>{day.getDate()}</span>
                      <span className="flex h-1.5 gap-0.5">
                        {dayColors.map((dotColor) => (
                          <span
                            key={dotColor}
                            className={cn("size-1.5 rounded-full", isSelected && "ring-1 ring-primary-foreground")}
                            style={{ backgroundColor: dotColor }}
                          />
                        ))}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {legendItems.map((legendItem) => (
                  <span key={legendItem.label} className="flex items-center gap-1">
                    <span className="size-2 rounded-full" style={{ backgroundColor: legendItem.color }} />{" "}
                    {legendItem.label}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {canWriteAnimals && (
            <div className="flex justify-end">
              <Button onClick={() => setAddingHeat(true)}>
                <Plus className="h-4 w-4" />
                {t("breeding.addHeat")}
              </Button>
            </div>
          )}
          <Card>
            <CardContent>
              {calendarQuery.isError ? (
                // Not "no entries": the calendar couldn't be loaded
                <div className="py-6 text-center text-destructive">{t("breeding.calendarLoadFailed")}</div>
              ) : shownEvents.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground">{t("breeding.noEntriesMonth")}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("common.date")}</TableHead>
                      <TableHead>{t("animals.name")}</TableHead>
                      <TableHead>{t("breeding.event")}</TableHead>
                      <TableHead>{t("breeding.sire")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shownEvents.map((event) => (
                      <TableRow
                        key={event.key}
                        // Births and heats both belong to the heat entry, open it to edit
                        className={canWriteAnimals ? "cursor-pointer" : undefined}
                        onClick={() => canWriteAnimals && setEditedEntry(event.entry)}
                      >
                        <TableCell>{event.date.toLocaleDateString(locale)}</TableCell>
                        <TableCell>
                          <Link
                            className={inlineLink}
                            to="/animals/$animalId"
                            params={{ animalId: event.entry.animal.id }}
                            search={{ returnTo: "/animals/breeding-calendar" }}
                            onClick={(clickEvent) => clickEvent.stopPropagation()}
                          >
                            {event.entry.animal.earTagNumber
                              ? `${event.entry.animal.earTagNumber} - ${event.entry.animal.name}`
                              : event.entry.animal.name}
                          </Link>
                        </TableCell>
                        <TableCell className={event.kind === "birth" ? "font-medium" : "text-muted-foreground"}>
                          <span className="flex items-center gap-2">
                            <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: eventColor(event) }} />
                            {event.kind === "birth"
                              ? t("breeding.expectedBirth")
                              : [
                                  t(`breeding.heatByType.${event.entry.animal.type}`),
                                  ...(event.entry.mated ? [t("breeding.mated")] : []),
                                  ...(event.entry.conceptionFailed ? [t("breeding.conceptionFailed")] : []),
                                ].join(" · ")}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {event.entry.sire?.name ?? event.entry.sireName ?? ""}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
      </div>
      {editedEntry && (
        <HeatEntryDialog
          animal={{ id: editedEntry.animal.id, type: editedEntry.animal.type }}
          heat={editedEntry}
          onClose={() => setEditedEntry(null)}
        />
      )}
      {/* On the selected day if there is one */}
      {addingHeat && (
        <HeatEntryDialog
          animal={null}
          heat={null}
          initialDate={selectedDay ? toLocalDateString(selectedDay) : undefined}
          onClose={() => setAddingHeat(false)}
        />
      )}
    </PageContent>
  );
}
