import { parasiteChecksQueryOptions } from "@/api/parasiteChecks.queries";
import {
  PARASITE_RESULT_GRADES,
  PARASITE_TYPES,
  type AnimalType,
  type ParasiteCheck,
  type ParasiteType,
} from "@/api/types";
import { DataTable } from "@/components/DataTable";
import { PageContent } from "@/components/PageContent";
import { ChartCarouselCard } from "@/components/parasites/ChartCarouselCard";
import {
  FamachaDistributionChart,
  parasiteCountUnitKey,
  TimelineChart,
} from "@/components/parasites/ParasiteCharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatDateOnly } from "@/lib/utils";
import { useFeatureAccess } from "@/lib/useFeatureAccess";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { type ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { z } from "zod";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_authed/animals/parasite-checks")({
  // Selected animal type, so e.g. saving a cow check returns to the cows
  validateSearch: z.object({
    animalType: z.string().optional(),
  }),
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(parasiteChecksQueryOptions());
  },
  component: ParasiteChecksPage,
});

// Number of animals a check's value for this parasite is based on
function fecCoverage(check: ParasiteCheck, parasiteType: ParasiteType) {
  return check.fecSamples
    .filter((sample) =>
      sample.results.some((result) => result.parasiteType === parasiteType),
    )
    .reduce((sum, sample) => sum + sample.animalIds.length, 0);
}

// Average grade (index in PARASITE_RESULT_GRADES) over the graded samples of a
// check, each sample weighted by the number of animals it covers. Lies between
// the steps, e.g. 1.5 = between + and ++.
function averageGradeIndex(check: ParasiteCheck, parasiteType: ParasiteType) {
  let weightedSum = 0;
  let animalCount = 0;
  for (const sample of check.fecSamples) {
    const result = sample.results.find(
      (entry) => entry.parasiteType === parasiteType,
    );
    if (!result?.grade) continue;
    weightedSum +=
      PARASITE_RESULT_GRADES.indexOf(result.grade) * sample.animalIds.length;
    animalCount += sample.animalIds.length;
  }
  return animalCount > 0 ? weightedSum / animalCount : null;
}

function ParasiteChecksPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { canWrite } = useFeatureAccess("animals");
  const checksQuery = useQuery(parasiteChecksQueryOptions());
  const allChecks = useMemo(() => checksQuery.data ?? [], [checksQuery.data]);

  // A check only contains one animal type; offer the types that have checks,
  // sorted alphabetically so the tabs don't move when checks are added
  const animalTypes = useMemo(() => {
    const types = new Set<AnimalType>();
    for (const check of allChecks) {
      if (check.animalType) types.add(check.animalType);
    }
    return [...types].sort((a, b) =>
      t(`animals.typesPlural.${a}`).localeCompare(
        t(`animals.typesPlural.${b}`),
      ),
    );
  }, [allChecks, t]);
  const { animalType: animalTypeParam } = Route.useSearch();
  // Unknown or missing types fall back to the first tab
  const animalType =
    animalTypes.find((typeOption) => typeOption === animalTypeParam) ??
    animalTypes[0];

  // Charts include re-checks; every value shows how many animals it is based on
  // Checks whose animals were all deleted have no type; they stay listed so they
  // can still be opened and deleted
  const typeChecks = allChecks.filter(
    (check) => check.animalType === animalType || check.animalType === null,
  );
  const treatmentDates = typeChecks.flatMap((check) =>
    check.treatment ? [check.treatment.startDate] : [],
  );
  // Counts and grades can't share an axis: a parasite with any counts gets the
  // average count chart, one with only grades the average grade per check
  const fecCharts = PARASITE_TYPES.flatMap((parasiteType) => {
    const countPoints = typeChecks.flatMap((check) => {
      const entry = check.summary.fecByParasite.find(
        (fecEntry) => fecEntry.parasiteType === parasiteType,
      );
      return entry
        ? [
            {
              date: check.date,
              value: entry.avgCountPerGram,
              coverage: fecCoverage(check, parasiteType),
            },
          ]
        : [];
    });
    if (countPoints.length > 0)
      return [{ parasiteType, points: countPoints, graded: false }];
    const gradePoints = typeChecks.flatMap((check) => {
      const averageGrade = averageGradeIndex(check, parasiteType);
      return averageGrade !== null
        ? [
            {
              date: check.date,
              value: averageGrade,
              coverage: fecCoverage(check, parasiteType),
            },
          ]
        : [];
    });
    return gradePoints.length > 0
      ? [{ parasiteType, points: gradePoints, graded: true }]
      : [];
  });
  const famachaChecks = typeChecks.filter(
    (check) => check.method === "famacha",
  );

  // Re-checks are listed inside their base check
  const baseChecks = typeChecks.filter(
    (check) => check.previousCheckId === null,
  );

  const columns = useMemo<ColumnDef<ParasiteCheck>[]>(
    () => [
      {
        accessorKey: "date",
        header: t("common.date"),
        cell: ({ row }) => formatDateOnly(row.original.date, i18n.language),
      },
      {
        id: "name",
        header: t("parasiteChecks.name"),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name ?? "-"}</span>
        ),
      },
      {
        accessorKey: "method",
        header: t("parasiteChecks.method"),
        cell: ({ row }) => t(`parasiteChecks.methods.${row.original.method}`),
      },
      {
        id: "animals",
        header: t("parasiteChecks.animals"),
        cell: ({ row }) => row.original.animals.length,
      },
      {
        id: "rechecks",
        header: t("parasiteChecks.rechecks"),
        cell: ({ row }) => row.original.rechecks.length || "-",
      },
    ],
    [t, i18n.language],
  );

  return (
    <PageContent
      title={t("parasiteChecks.title")}
      actions={
        canWrite && (
          <Button onClick={() => navigate({ to: "/parasite-checks/create" })}>
            {t("parasiteChecks.newCheck")}
          </Button>
        )
      }
    >
      <div className="space-y-6">
        {/* Charts and list are always for one animal type */}
        {/* Hidden when there is nothing to choose */}
        {animalTypes.length > 1 && (
          <div className="inline-flex rounded-lg border p-1">
            {animalTypes.map((typeOption) => (
              <button
                key={typeOption}
                type="button"
                onClick={() =>
                  navigate({
                    to: "/animals/parasite-checks",
                    search: { animalType: typeOption },
                    replace: true,
                  })
                }
                className={cn(
                  "rounded-md px-4 py-1.5 text-sm font-medium",
                  animalType === typeOption
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground",
                )}
              >
                {t(`animals.typesPlural.${typeOption}`)}
              </button>
            ))}
          </div>
        )}

        {(fecCharts.length > 0 || famachaChecks.length > 0) && (
          <div className="space-y-2">
            {/* Full width, split 50/50 only when worms and FAMACHA are both shown */}
            <div
              className={
                fecCharts.length > 0 && famachaChecks.length > 0
                  ? "grid grid-cols-1 gap-6 lg:grid-cols-2"
                  : "grid grid-cols-1 gap-6"
              }
            >
              {famachaChecks.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {t("parasiteChecks.famachaDistribution")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FamachaDistributionChart checks={famachaChecks} />
                  </CardContent>
                </Card>
              )}
              {fecCharts.length > 0 && (
                <ChartCarouselCard
                  pages={fecCharts.map(({ parasiteType, points, graded }) => ({
                    key: parasiteType,
                    title: graded
                      ? `${t(`parasiteChecks.parasiteTypes.${parasiteType}`)} (${t("parasiteChecks.grade")})`
                      : `${t(`parasiteChecks.parasiteTypes.${parasiteType}`)} Ø (${t(parasiteCountUnitKey(parasiteType))})`,
                    content: (
                      <TimelineChart
                        points={points}
                        treatmentDates={treatmentDates}
                        seriesName={
                          graded
                            ? t("parasiteChecks.averageGradePerCheck")
                            : t("parasiteChecks.averagePerCheck")
                        }
                        unitLabel={
                          graded
                            ? undefined
                            : t(parasiteCountUnitKey(parasiteType))
                        }
                        gradeScale={graded}
                        averageValues
                      />
                    ),
                  }))}
                />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("parasiteChecks.chartCountsInfo")}
            </p>
          </div>
        )}

        <DataTable
          data={baseChecks}
          columns={columns}
          onRowClick={(check) =>
            navigate({
              to: "/parasite-checks/$checkId",
              params: { checkId: check.id },
            })
          }
          globalFilterFn={(row, _columnId, filterValue) => {
            const searchValue = String(filterValue).toLowerCase();
            return (
              (row.original.name?.toLowerCase().includes(searchValue) ??
                false) ||
              t(`parasiteChecks.methods.${row.original.method}`)
                .toLowerCase()
                .includes(searchValue)
            );
          }}
          defaultSorting={[{ id: "date", desc: true }]}
        />
      </div>
    </PageContent>
  );
}
