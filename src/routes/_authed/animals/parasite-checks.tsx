import { parasiteChecksQueryOptions } from "@/api/parasiteChecks.queries";
import {
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
import { Label } from "@/components/ui/label";
import { formatDateOnly } from "@/lib/utils";
import { useFeatureAccess } from "@/lib/useFeatureAccess";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { type ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_authed/animals/parasite-checks")({
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

function ParasiteChecksPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { canWrite } = useFeatureAccess("animals");
  const checksQuery = useQuery(parasiteChecksQueryOptions());
  const allChecks = useMemo(() => checksQuery.data ?? [], [checksQuery.data]);

  // A check only contains one animal type; offer the types that have checks,
  // the most common one first
  const animalTypes = useMemo(() => {
    const countsByType = new Map<AnimalType, number>();
    for (const check of allChecks) {
      if (check.animalType) {
        countsByType.set(
          check.animalType,
          (countsByType.get(check.animalType) ?? 0) + 1,
        );
      }
    }
    return [...countsByType.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([animalType]) => animalType);
  }, [allChecks]);
  const [selectedAnimalType, setSelectedAnimalType] = useState<
    AnimalType | undefined
  >();
  const animalType =
    selectedAnimalType && animalTypes.includes(selectedAnimalType)
      ? selectedAnimalType
      : animalTypes[0];

  // Charts include re-checks; every value shows how many animals it is based on
  // Checks whose animals were all deleted have no type; they stay listed so they
  // can still be opened and deleted
  const typeChecks = allChecks.filter(
    (check) => check.animalType === animalType || check.animalType === null,
  );
  const treatmentDates = typeChecks.flatMap((check) =>
    check.treatment ? [check.treatment.startDate] : [],
  );
  const fecCharts = PARASITE_TYPES.flatMap((parasiteType) => {
    const points = typeChecks.flatMap((check) => {
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
    return points.length > 0 ? [{ parasiteType, points }] : [];
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
        {animalTypes.length > 0 && (
          <div className="flex items-center gap-3">
            <Label htmlFor="animalType">{t("parasiteChecks.animalType")}</Label>
            <select
              id="animalType"
              className="rounded-md border bg-background px-3 py-2 text-sm"
              value={animalType}
              onChange={(event) =>
                setSelectedAnimalType(
                  animalTypes.find(
                    (typeOption) => typeOption === event.target.value,
                  ),
                )
              }
            >
              {animalTypes.map((typeOption) => (
                <option key={typeOption} value={typeOption}>
                  {t(`animals.typesPlural.${typeOption}`)}
                </option>
              ))}
            </select>
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
                  pages={fecCharts.map(({ parasiteType, points }) => ({
                    key: parasiteType,
                    title: `${t(`parasiteChecks.parasiteTypes.${parasiteType}`)} Ø (${t(parasiteCountUnitKey(parasiteType))})`,
                    content: (
                      <TimelineChart
                        points={points}
                        treatmentDates={treatmentDates}
                        seriesName={t("parasiteChecks.averagePerCheck")}
                        unitLabel={t(parasiteCountUnitKey(parasiteType))}
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
