import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { parasiteCheckQueryOptions } from "@/api/parasiteChecks.queries";
import { PARASITE_TYPES } from "@/api/types";
import { useFeatureAccess } from "@/lib/useFeatureAccess";
import { cn, formatDateOnly } from "@/lib/utils";
import { PageContent } from "@/components/PageContent";
import { ChartCarouselCard } from "@/components/parasites/ChartCarouselCard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  animalDisplayName,
  FamachaBadge,
  FamachaDistributionChart,
  formatCountChange,
  formatResultValue,
  parasiteCountUnitKey,
  TimelineChart,
} from "@/components/parasites/ParasiteCharts";

export const Route = createFileRoute("/_authed/parasite-checks/$checkId/")({
  loader: ({ params, context: { queryClient } }) => {
    return queryClient.ensureQueryData(
      parasiteCheckQueryOptions(params.checkId),
    );
  },
  component: ParasiteCheckDetailPage,
});

// Only the direction: count went down (green) or up (red), no efficacy judgement
function reductionClass(reductionPercent: number | null) {
  // Same rounding as the shown value, so "0%" is never colored
  const roundedReduction =
    reductionPercent === null ? 0 : Math.round(reductionPercent);
  if (roundedReduction === 0) return "text-muted-foreground";
  return roundedReduction > 0 ? "text-green-600" : "text-destructive";
}

// Lower FAMACHA is better, so a falling average is an improvement
function famachaChangeClass(change: number) {
  if (change < 0) return "text-green-600";
  if (change > 0) return "text-destructive";
  return "text-muted-foreground";
}

function ParasiteCheckDetailPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { canWrite } = useFeatureAccess("animals");
  const { checkId } = Route.useParams();
  const checkQuery = useQuery(parasiteCheckQueryOptions(checkId));

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.DELETE(
        "/v1/parasiteChecks/byId/{checkId}",
        {
          params: { path: { checkId } },
        },
      );
      if (response.error) {
        throw new Error("Failed to delete parasite check");
      }
    },
    onSuccess: () => {
      // The deleted check must not be refetched
      queryClient.removeQueries({
        queryKey: ["parasiteChecks", "byId", checkId],
      });
      queryClient.invalidateQueries({ queryKey: ["parasiteChecks"] });
      navigate({
        to: "/animals/parasite-checks",
        search: { animalType: checkQuery.data?.animalType ?? undefined },
      });
    },
  });

  if (!checkQuery.data) {
    return (
      <PageContent title={t("common.loading")}>
        <div className="py-8 text-center text-muted-foreground">
          {t("common.loading")}
        </div>
      </PageContent>
    );
  }

  const check = checkQuery.data;
  const isRecheck = check.comparisonToPrevious !== null;
  const methodAndDate = `${t(`parasiteChecks.methods.${check.method}`)} · ${formatDateOnly(check.date, locale)}`;
  // An own name replaces method and date as title, which then move below it
  const title = check.name || methodAndDate;

  const treatmentDates = [
    ...(check.treatment ? [check.treatment.startDate] : []),
    ...check.rechecks.flatMap((recheck) =>
      recheck.treatment ? [recheck.treatment.startDate] : [],
    ),
  ];

  // Charts of the base check and its re-checks; re-check values come from the
  // comparison against this check
  // Change in % against the base check (0%), the same values as in the re-check
  // rows. Each re-check is compared on its own matching samples, so absolute
  // averages wouldn't be comparable; re-checks without a percent are left out.
  const fecCharts =
    isRecheck || check.method !== "fecal_egg_count"
      ? []
      : PARASITE_TYPES.flatMap((parasiteType) => {
          const recheckPoints = check.rechecks.flatMap((recheck) => {
            const reduction = recheck.fecReduction.find(
              (entry) => entry.parasiteType === parasiteType,
            );
            return reduction && reduction.reductionPercent !== null
              ? [
                  {
                    date: recheck.date,
                    value: -reduction.reductionPercent,
                    coverage: reduction.afterSampleCount,
                  },
                ]
              : [];
          });
          if (recheckPoints.length === 0) return [];
          return [
            {
              parasiteType,
              points: [{ date: check.date, value: 0 }, ...recheckPoints],
            },
          ];
        });
  const famachaChartChecks =
    isRecheck || check.method !== "famacha"
      ? []
      : [
          { id: check.id, date: check.date, animals: check.animals },
          ...check.rechecks.map((recheck) => ({
            id: recheck.id,
            date: recheck.date,
            animals: recheck.animals,
          })),
        ];

  const pooledSample = check.fecSamples.find((sample) => sample.pooled);
  const individualResultsByAnimal = new Map(
    check.fecSamples
      .filter((sample) => !sample.pooled)
      .map((sample) => [sample.animalIds[0], sample.results]),
  );

  return (
    <PageContent
      title={title}
      showBackButton
      // A re-check goes back to its base check, a base check to the previous page
      description={
        (check.name || check.comparisonToPrevious) && (
          <span className="flex flex-wrap gap-x-2">
            {check.name && <span>{methodAndDate}</span>}
            {check.comparisonToPrevious && (
              <Link
                to="/parasite-checks/$checkId"
                params={{ checkId: check.comparisonToPrevious.previousCheckId }}
                className="text-primary hover:underline"
              >
                {t("parasiteChecks.recheckOf", {
                  date: formatDateOnly(
                    check.comparisonToPrevious.previousDate,
                    locale,
                  ),
                })}
              </Link>
            )}
          </span>
        )
      }
      actions={
        canWrite && (
          <>
            <Button variant="outline" asChild>
              <Link to="/parasite-checks/$checkId/edit" params={{ checkId }}>
                {t("common.edit")}
              </Link>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">{t("common.delete")}</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("common.confirm")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {/* Re-checks are deleted together with their base check */}
                    {check.rechecks.length > 0
                      ? t("parasiteChecks.deleteWithRechecksConfirm", {
                          count: check.rechecks.length,
                        })
                      : t("parasiteChecks.deleteConfirm")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteMutation.mutate()}
                    disabled={deleteMutation.isPending}
                    className="bg-destructive text-white hover:bg-destructive/90"
                  >
                    {t("common.delete")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )
      }
    >
      <div className="space-y-6">
        {/* Details */}
        <Card>
          <CardContent>
            <dl className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <DetailItem
                label={t("parasiteChecks.treatment")}
                value={
                  check.treatment ? (
                    <Link
                      to="/treatments/$treatmentId"
                      params={{ treatmentId: check.treatment.id }}
                      className="text-primary hover:underline"
                    >
                      {check.treatment.name} ·{" "}
                      {formatDateOnly(check.treatment.startDate, locale)}
                    </Link>
                  ) : (
                    "-"
                  )
                }
              />
              {check.method === "fecal_egg_count" && (
                <DetailItem
                  label={t("parasiteChecks.labName")}
                  value={check.labName || "-"}
                />
              )}
              {check.followUpTasks.map((task) => (
                <DetailItem
                  key={task.id}
                  label={t("parasiteChecks.followUpTask")}
                  value={`${task.name}${task.dueDate ? ` · ${formatDateOnly(task.dueDate, locale)}` : ""}`}
                />
              ))}
              {check.notes && (
                <DetailItem
                  label={t("parasiteChecks.notes")}
                  value={check.notes}
                />
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Charts of the base check and its re-checks */}
        {(fecCharts.length > 0 || famachaChartChecks.length > 0) && (
          <div className="grid grid-cols-1 gap-6">
            {fecCharts.length > 0 && (
              <ChartCarouselCard
                pages={fecCharts.map(({ parasiteType, points }) => ({
                  key: parasiteType,
                  title: `${t(`parasiteChecks.parasiteTypes.${parasiteType}`)}: ${t("parasiteChecks.changePercent")}`,
                  content: (
                    <TimelineChart
                      points={points}
                      treatmentDates={treatmentDates}
                      seriesName={t("parasiteChecks.changeToBase")}
                      unitLabel="%"
                      percentScale
                    />
                  ),
                }))}
              />
            )}
            {famachaChartChecks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {t("parasiteChecks.famachaDistribution")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FamachaDistributionChart checks={famachaChartChecks} />
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle>{t("parasiteChecks.summary")}</CardTitle>
          </CardHeader>
          <CardContent>
            {check.method === "famacha" ? (
              <p className="text-sm">
                {check.summary.famachaAverage === null
                  ? t("parasiteChecks.nAnimals", {
                      count: check.summary.animalCount,
                    })
                  : t("parasiteChecks.famachaSummary", {
                      count: check.summary.animalCount,
                      average: check.summary.famachaAverage.toFixed(1),
                    })}
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {pooledSample
                    ? [
                        t("parasiteChecks.pooledSample", {
                          count: pooledSample.animalIds.length,
                        }),
                        pooledSample.label,
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    : individualResultsByAnimal.size > 0
                      ? t("parasiteChecks.resultsStatusIndividual", {
                          recorded: individualResultsByAnimal.size,
                          total: check.animals.length,
                        })
                      : t("parasiteChecks.resultsStatusNone")}
                </p>
                {(check.summary.fecByParasite.length > 0 ||
                  check.summary.gradesByParasite.length > 0) && (
                  <Table>
                    <TableBody>
                      {check.summary.fecByParasite.map((entry) => (
                        <TableRow key={entry.parasiteType}>
                          <TableCell>
                            {t(
                              `parasiteChecks.parasiteTypes.${entry.parasiteType}`,
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {entry.sampleCount > 1
                              ? `Ø ${Math.round(entry.avgCountPerGram)} (${Math.round(entry.minCountPerGram)}–${Math.round(entry.maxCountPerGram)})`
                              : Math.round(entry.avgCountPerGram)}{" "}
                            {t(parasiteCountUnitKey(entry.parasiteType))}
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Graded results (+/++/+++), highest grade per parasite */}
                      {check.summary.gradesByParasite.map((entry) => (
                        <TableRow key={`grade-${entry.parasiteType}`}>
                          <TableCell>
                            {t(
                              `parasiteChecks.parasiteTypes.${entry.parasiteType}`,
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {t(
                              `parasiteChecks.gradesShort.${entry.highestGrade}`,
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Re-checks of this base check */}
        {!isRecheck && (
          <Card>
            <CardHeader>
              <CardTitle>{t("parasiteChecks.rechecks")}</CardTitle>
              {canWrite && (
                <CardAction>
                  <Button
                    size="sm"
                    onClick={() =>
                      navigate({
                        to: "/parasite-checks/create",
                        search: { previousCheckId: check.id },
                      })
                    }
                  >
                    {t("parasiteChecks.addRecheck")}
                  </Button>
                </CardAction>
              )}
            </CardHeader>
            <CardContent>
              {check.rechecks.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("parasiteChecks.noRechecks")}
                </p>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("common.date")}</TableHead>
                        <TableHead>{t("parasiteChecks.treatment")}</TableHead>
                        <TableHead>{t("parasiteChecks.result")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {check.rechecks.map((recheck) => (
                        <TableRow
                          key={recheck.id}
                          className="cursor-pointer"
                          onClick={() =>
                            navigate({
                              to: "/parasite-checks/$checkId",
                              params: { checkId: recheck.id },
                            })
                          }
                        >
                          <TableCell className="align-top font-medium">
                            {formatDateOnly(recheck.date, locale)}
                            {recheck.name && (
                              <div className="text-xs font-normal text-muted-foreground">
                                {recheck.name}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="align-top text-muted-foreground">
                            {recheck.treatment?.name ?? "-"}
                          </TableCell>
                          <TableCell className="space-y-0.5">
                            {recheck.famachaBeforeAverage !== null &&
                              recheck.famachaAfterAverage !== null &&
                              recheck.famachaAverageChange !== null && (
                                <div className="flex justify-between gap-4 text-sm">
                                  <span className="text-muted-foreground">
                                    {t("parasiteChecks.famachaScore")} (Ø{" "}
                                    {recheck.famachaBeforeAverage.toFixed(1)} →{" "}
                                    {recheck.famachaAfterAverage.toFixed(1)})
                                  </span>
                                  <span
                                    className={cn(
                                      "font-semibold",
                                      famachaChangeClass(
                                        recheck.famachaAverageChange,
                                      ),
                                    )}
                                  >
                                    {recheck.famachaAverageChange > 0
                                      ? "+"
                                      : ""}
                                    {recheck.famachaAverageChange.toFixed(1)}
                                  </span>
                                </div>
                              )}
                            {recheck.fecReduction.map((entry) => (
                              <div
                                key={entry.parasiteType}
                                className="flex justify-between gap-4 text-sm"
                              >
                                <span className="text-muted-foreground">
                                  {t(
                                    `parasiteChecks.parasiteTypes.${entry.parasiteType}`,
                                  )}{" "}
                                  ({entry.afterSampleCount > 1 ? "Ø " : ""}
                                  {Math.round(entry.afterAvgCountPerGram)}{" "}
                                  {t(parasiteCountUnitKey(entry.parasiteType))})
                                </span>
                                <span
                                  className={cn(
                                    "font-semibold",
                                    reductionClass(entry.reductionPercent),
                                  )}
                                >
                                  {formatCountChange(entry.reductionPercent)}
                                </span>
                              </div>
                            ))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Animals with their scores / individual results */}
        <Card>
          <CardHeader>
            <CardTitle>{t("parasiteChecks.animals")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                {check.animals.map((checkAnimal) => (
                  <TableRow
                    key={checkAnimal.animalId}
                    className="cursor-pointer"
                    onClick={() =>
                      navigate({
                        to: "/animals/$animalId/parasite-history",
                        params: { animalId: checkAnimal.animalId },
                      })
                    }
                  >
                    <TableCell className="font-medium">
                      {animalDisplayName(
                        checkAnimal.name,
                        checkAnimal.earTagNumber,
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {(
                        individualResultsByAnimal.get(checkAnimal.animalId) ??
                        []
                      )
                        .map(
                          (result) =>
                            `${t(`parasiteChecks.parasiteTypes.${result.parasiteType}`)} ${formatResultValue(result, t)}`,
                        )
                        .join(" · ")}
                    </TableCell>
                    <TableCell className="w-12">
                      {checkAnimal.famachaScore !== null && (
                        <FamachaBadge score={checkAnimal.famachaScore} />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PageContent>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm">{value}</dd>
    </div>
  );
}
