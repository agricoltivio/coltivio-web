import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { herdQueryOptions } from "@/api/herds.queries";
import { herdParasiteOverviewQueryOptions } from "@/api/parasiteChecks.queries";
import { PARASITE_TYPES } from "@/api/types";
import { useFeatureAccess } from "@/lib/useFeatureAccess";
import { formatDateOnly } from "@/lib/utils";
import { PageContent } from "@/components/PageContent";
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
import {
  FamachaDistributionChart,
  parasiteCountUnitKey,
  TimelineChart,
} from "@/components/parasites/ParasiteCharts";

export const Route = createFileRoute("/_authed/animals/herds_/$herdId_/parasite-overview")({
  loader: ({ params, context: { queryClient } }) => {
    queryClient.ensureQueryData(herdQueryOptions(params.herdId));
    queryClient.ensureQueryData(herdParasiteOverviewQueryOptions(params.herdId));
  },
  component: HerdParasiteOverviewPage,
});

function HerdParasiteOverviewPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const navigate = useNavigate();
  const { canWrite } = useFeatureAccess("animals");
  const { herdId } = Route.useParams();
  const herdQuery = useQuery(herdQueryOptions(herdId));
  const checksQuery = useQuery(herdParasiteOverviewQueryOptions(herdId));

  const checks = checksQuery.data ?? [];
  // Charts use all checks incl. re-checks, the list only base checks
  const baseChecks = checks.filter((check) => check.previousCheckId === null);
  const treatmentDates = checks.flatMap((check) =>
    check.treatment ? [check.treatment.startDate] : [],
  );

  // Herd average per check, one chart per parasite type found in the results
  const fecCharts = PARASITE_TYPES.flatMap((parasiteType) => {
    const points = checks.flatMap((check) => {
      const entry = check.summary.fecByParasite.find(
        (fecEntry) => fecEntry.parasiteType === parasiteType,
      );
      return entry ? [{ date: check.date, value: entry.avgCountPerGram }] : [];
    });
    return points.length > 0 ? [{ parasiteType, points }] : [];
  });
  const famachaChecks = checks.filter((check) => check.method === "famacha");

  return (
    <PageContent
      title={t("parasiteChecks.title")}
      description={herdQuery.data?.name}
      showBackButton
      backTo={() => navigate({ to: "/animals/herds/$herdId", params: { herdId } })}
      actions={
        canWrite && (
          <Button
            onClick={() => navigate({ to: "/parasite-checks/create", search: { herdId } })}
          >
            {t("parasiteChecks.newCheck")}
          </Button>
        )
      }
    >
      <div className="space-y-6">
        {!checksQuery.isLoading && checks.length === 0 && (
          <p className="text-sm text-muted-foreground">{t("parasiteChecks.noChecks")}</p>
        )}

        {(fecCharts.length > 0 || famachaChecks.length > 0) && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {fecCharts.map(({ parasiteType, points }) => (
              <Card key={parasiteType}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {t(`parasiteChecks.parasiteTypes.${parasiteType}`)} Ø (
                    {t(parasiteCountUnitKey(parasiteType))})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TimelineChart
                    points={points}
                    treatmentDates={treatmentDates}
                    seriesName={t("parasiteChecks.herdAverage")}
                    unitLabel={t(parasiteCountUnitKey(parasiteType))}
                  />
                </CardContent>
              </Card>
            ))}
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
          </div>
        )}

        {baseChecks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t("parasiteChecks.checks")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("common.date")}</TableHead>
                    <TableHead>{t("parasiteChecks.method")}</TableHead>
                    <TableHead>{t("parasiteChecks.rechecks")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {baseChecks.map((check) => (
                    <TableRow
                      key={check.id}
                      className="cursor-pointer"
                      onClick={() =>
                        navigate({
                          to: "/parasite-checks/$checkId",
                          params: { checkId: check.id },
                        })
                      }
                    >
                      <TableCell>{formatDateOnly(check.date, locale)}</TableCell>
                      <TableCell>{t(`parasiteChecks.methods.${check.method}`)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {check.rechecks.length || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </PageContent>
  );
}
