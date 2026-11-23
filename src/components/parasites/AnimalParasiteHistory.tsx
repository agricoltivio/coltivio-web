import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { animalParasiteHistoryQueryOptions } from "@/api/parasiteChecks.queries";
import { PARASITE_RESULT_GRADES, PARASITE_TYPES } from "@/api/types";
import { formatDateOnly, parseDateOnly } from "@/lib/utils";
import { ChartCarouselCard } from "@/components/parasites/ChartCarouselCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import {
  FamachaBadge,
  formatResultValue,
  parasiteCountUnitKey,
  TimelineChart,
} from "@/components/parasites/ParasiteCharts";

type TimelineEntry = {
  key: string;
  date: string;
  title: string;
  subtitle: string;
  famachaScore: number | null;
  onOpen: () => void;
};

// An animal's parasite history: one chart per parasite (and FAMACHA) in a carousel, then a
// timeline of checks, samples and treatments. embedded: inside the animal page's card (no
// cards of its own); otherwise as on the history page.
export function AnimalParasiteHistory({
  animalId,
  embedded = false,
}: {
  animalId: string;
  embedded?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const navigate = useNavigate();
  const historyQuery = useQuery(animalParasiteHistoryQueryOptions(animalId));

  const history = historyQuery.data;
  const treatmentDates = (history?.treatments ?? []).map(
    (treatment) => treatment.startDate,
  );

  // One chart per parasite type this animal has results for, then FAMACHA.
  // Counts and grades can't share an axis: a parasite with any counts gets a
  // count chart, one with only grades a grade chart (– / + / ++ / +++).
  const fecCharts = PARASITE_TYPES.flatMap((parasiteType) => {
    const results = (history?.fecResults ?? []).flatMap((fecResult) => {
      const result = fecResult.results.find(
        (entry) => entry.parasiteType === parasiteType,
      );
      return result ? [{ date: fecResult.date, result }] : [];
    });
    const countPoints = results.flatMap(({ date, result }) =>
      result.countPerGram !== null
        ? [{ date, value: result.countPerGram }]
        : [],
    );
    if (countPoints.length > 0)
      return [{ parasiteType, points: countPoints, graded: false }];
    const gradePoints = results.flatMap(({ date, result }) =>
      result.grade !== null
        ? [{ date, value: PARASITE_RESULT_GRADES.indexOf(result.grade) }]
        : [],
    );
    return gradePoints.length > 0
      ? [{ parasiteType, points: gradePoints, graded: true }]
      : [];
  });
  const famachaPoints = (history?.checks ?? []).flatMap((entry) =>
    entry.famachaScore === null
      ? []
      : [{ date: entry.date, value: entry.famachaScore }],
  );

  function openCheck(checkId: string) {
    navigate({ to: "/parasite-checks/$checkId", params: { checkId } });
  }

  const timelineEntries: TimelineEntry[] = history
    ? [
        ...history.checks.flatMap((entry) =>
          entry.famachaScore === null
            ? []
            : [
                {
                  key: `famacha-${entry.checkId}`,
                  date: entry.date,
                  title: t("parasiteChecks.methods.famacha"),
                  subtitle: "",
                  famachaScore: entry.famachaScore,
                  onOpen: () => openCheck(entry.checkId),
                },
              ],
        ),
        ...history.fecResults.map((fecResult) => ({
          key: `fec-${fecResult.sampleId}`,
          date: fecResult.date,
          title: fecResult.results
            .map(
              (result) =>
                `${t(`parasiteChecks.parasiteTypes.${result.parasiteType}`)} ${formatResultValue(result, t)}`,
            )
            .join(" · "),
          subtitle: fecResult.pooled
            ? t("parasiteChecks.pooledSample", { count: fecResult.poolSize })
            : t("parasiteChecks.individualSample"),
          famachaScore: null,
          onOpen: () => openCheck(fecResult.checkId),
        })),
        ...history.treatments.map((treatment) => ({
          key: `treatment-${treatment.id}`,
          date: treatment.startDate,
          title: treatment.drugName
            ? `${treatment.name} (${treatment.drugName})`
            : treatment.name,
          subtitle: t("parasiteChecks.treatment"),
          famachaScore: null,
          onOpen: () =>
            navigate({
              to: "/treatments/$treatmentId",
              params: { treatmentId: treatment.id },
            }),
        })),
      ].sort(
        (a, b) =>
          parseDateOnly(b.date).getTime() - parseDateOnly(a.date).getTime(),
      )
    : [];

  const timelineTable = (
    <Table>
      <TableBody>
        {timelineEntries.map((entry) => (
          <TableRow key={entry.key} className="cursor-pointer" onClick={entry.onOpen}>
            {/* Embedded: flush with the card's title and charts, without the cell's left padding */}
            <TableCell className={`w-32 text-muted-foreground${embedded ? " pl-0" : ""}`}>
              {formatDateOnly(entry.date, locale)}
            </TableCell>
            <TableCell>
              <div className="font-medium">{entry.title}</div>
              {entry.subtitle && (
                <div className="text-xs text-muted-foreground">{entry.subtitle}</div>
              )}
            </TableCell>
            <TableCell className="w-12">
              {entry.famachaScore !== null && <FamachaBadge score={entry.famachaScore} />}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      {!historyQuery.isLoading && timelineEntries.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {t("parasiteChecks.noChecks")}
        </p>
      )}

      {/* All charts in one carousel: FAMACHA first, then one per parasite */}
      {(fecCharts.length > 0 || famachaPoints.length > 0) && (
        <ChartCarouselCard
          // Embedded: no frame and no inner padding, the animal card already has both
          className={
            embedded
              ? "border-0 py-0 shadow-none [&>[data-slot=card-content]]:px-0 [&>[data-slot=card-header]]:px-0"
              : undefined
          }
          pages={[
            ...(famachaPoints.length > 0
              ? [
                  {
                    key: "famacha",
                    title: t("parasiteChecks.methods.famacha"),
                    content: (
                      <TimelineChart
                        points={famachaPoints}
                        treatmentDates={treatmentDates}
                        seriesName={t("parasiteChecks.famachaScore")}
                        famachaScale
                      />
                    ),
                  },
                ]
              : []),
            ...fecCharts.map(({ parasiteType, points, graded }) => ({
              key: parasiteType,
              title: `${t(`parasiteChecks.parasiteTypes.${parasiteType}`)} (${graded ? t("parasiteChecks.grade") : t(parasiteCountUnitKey(parasiteType))})`,
              content: (
                <TimelineChart
                  points={points}
                  treatmentDates={treatmentDates}
                  seriesName={t(
                    `parasiteChecks.parasiteTypes.${parasiteType}`,
                  )}
                  unitLabel={
                    graded ? undefined : t(parasiteCountUnitKey(parasiteType))
                  }
                  gradeScale={graded}
                />
              ),
            })),
          ]}
        />
      )}

      {timelineEntries.length > 0 &&
        (embedded ? (
          <div>
            <h3 className="mb-2 text-sm font-medium">{t("parasiteChecks.timeline")}</h3>
            {timelineTable}
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{t("parasiteChecks.timeline")}</CardTitle>
            </CardHeader>
            <CardContent>{timelineTable}</CardContent>
          </Card>
        ))}
    </div>
  );
}
