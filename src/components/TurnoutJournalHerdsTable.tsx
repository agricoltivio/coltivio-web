import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { herdsQueryOptions } from "@/api/herds.queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { herdBarOnDay, type HerdTimelineType } from "@/lib/herdTimeline";

const TYPE_COLORS: Record<HerdTimelineType, string> = {
  pasture: "bg-green-600",
  exercise_yard: "bg-amber-500",
  stable: "bg-slate-500",
};

// Herds below the turnout journal with what each one does today (schedules with the
// exceptions applied). Herds with something planned today come first; a row opens the herd.
export function TurnoutJournalHerdsTable() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const herdsQuery = useQuery(herdsQueryOptions());
  const today = new Date();

  const rows = (herdsQuery.data?.result ?? [])
    .map((herd) => {
      const overrides = herd.outdoorScheduleOverrides ?? [];
      const bar = herdBarOnDay(herd.outdoorSchedules, overrides, today);
      const source = bar
        ? bar.isOverride
          ? overrides.find((override) => override.id === bar.id)
          : herd.outdoorSchedules.find((schedule) => schedule.id === bar.id)
        : undefined;
      return { herd, bar, meadowName: source?.meadow?.name ?? null };
    })
    .sort(
      (a, b) =>
        Number(b.bar !== null) - Number(a.bar !== null) ||
        a.herd.name.localeCompare(b.herd.name),
    );

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>{t("herds.title")}</CardTitle>
        <div className="flex justify-end">
          <Button variant="outline" size="sm" asChild>
            <Link to="/animals/herds">{t("turnoutJournal.manageHerds")}</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="py-4 text-center text-muted-foreground">{t("herds.noHerds")}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("herds.name")}</TableHead>
                <TableHead>{t("herds.animalCount")}</TableHead>
                <TableHead>{t("fieldCalendar.timeline.today")}</TableHead>
                <TableHead>{t("herds.meadow")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ herd, bar, meadowName }) => (
                <TableRow
                  key={herd.id}
                  className="cursor-pointer"
                  onClick={() =>
                    navigate({ to: "/animals/herds/$herdId", params: { herdId: herd.id } })
                  }
                >
                  <TableCell className="font-medium">{herd.name}</TableCell>
                  <TableCell className="text-muted-foreground">{herd.animals.length}</TableCell>
                  <TableCell>
                    {bar ? (
                      <span className="flex items-center gap-2">
                        <span
                          className={`inline-block h-3 w-3 rounded-sm ${TYPE_COLORS[bar.type]} ${
                            bar.isOverride ? "ring-2 ring-foreground" : ""
                          }`}
                        />
                        {t(`herds.scheduleTypes.${bar.type}`)}
                        {bar.isOverride && (
                          <span className="text-muted-foreground">
                            ({t("herds.overrides.single")})
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{meadowName ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
