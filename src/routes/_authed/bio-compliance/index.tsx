import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { animalsQueryOptions } from "@/api/animals.queries";
import { cropRotationsQueryOptions } from "@/api/cropRotations.queries";
import { fertilizerApplicationsQueryOptions } from "@/api/fertilizerApplications.queries";
import { outdoorJournalQueryOptions } from "@/api/outdoorJournal.queries";
import { treatmentsQueryOptions } from "@/api/treatments.queries";
import { PageContent } from "@/components/PageContent";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFeatureAccess } from "@/lib/useFeatureAccess";
import {
  checkAntibioticCount,
  checkCriticalAntibiotic,
  checkMineralFertilizer,
  checkRausCoverage,
  checkRotationPause,
  checkWithdrawalStatus,
} from "@/lib/bioCompliance/rules";
import type {
  CheckResult,
  CheckStatus,
  FailingItem,
} from "@/lib/bioCompliance/types";
import { ChevronRight, Info } from "lucide-react";

const CURRENT_YEAR = new Date().getFullYear();
const ROTATIONS_FROM = new Date(CURRENT_YEAR - 15, 0, 1).toISOString();
const ROTATIONS_TO = new Date(CURRENT_YEAR + 1, 11, 31).toISOString();
const YEAR_FROM = new Date(CURRENT_YEAR, 0, 1).toISOString();
const YEAR_TO = new Date(CURRENT_YEAR, 11, 31, 23, 59, 59).toISOString();

export const Route = createFileRoute("/_authed/bio-compliance/")({
  loader: ({ context: { queryClient } }) => {
    void queryClient.ensureQueryData(
      cropRotationsQueryOptions(ROTATIONS_FROM, ROTATIONS_TO),
    );
    void queryClient.ensureQueryData(fertilizerApplicationsQueryOptions());
    void queryClient.ensureQueryData(treatmentsQueryOptions());
    void queryClient.ensureQueryData(animalsQueryOptions(false));
    void queryClient.ensureQueryData(outdoorJournalQueryOptions(YEAR_FROM, YEAR_TO));
  },
  component: BioCompliance,
});

const STATUS_BADGE: Record<CheckStatus, string> = {
  ok: "bg-green-100 text-green-800 border-green-200",
  warn: "bg-amber-100 text-amber-800 border-amber-200",
  fail: "bg-red-100 text-red-800 border-red-200",
  info: "bg-blue-100 text-blue-800 border-blue-200",
  no_data: "bg-gray-100 text-gray-600 border-gray-200",
};

const CAVEAT_BY_CHECK: Partial<Record<CheckResult["id"], string>> = {
  withdrawalStatus: "bioCompliance.caveats.withdrawal",
  rausCoverage: "bioCompliance.caveats.raus",
};

const ROW_CLS = "flex items-center justify-between gap-3 py-2 text-sm";
const LINK_CLS = `${ROW_CLS} -mx-2 px-2 rounded hover:bg-muted/50 transition-colors`;

function ItemRow({ item }: { item: FailingItem }) {
  const content = (
    <>
      <span className="font-medium">{item.label}</span>
      <span className="flex items-center gap-1 text-muted-foreground">
        {item.detail}
        {item.link && <ChevronRight className="h-4 w-4 shrink-0" />}
      </span>
    </>
  );

  const link = item.link;
  if (!link) return <div className={ROW_CLS}>{content}</div>;

  switch (link.kind) {
    case "rotationPlot":
      return (
        <Link
          className={LINK_CLS}
          to="/field-calendar/plots/$plotId/crop-rotations"
          params={{ plotId: link.plotId }}
        >
          {content}
        </Link>
      );
    case "fertilizerApplication":
      return (
        <Link
          className={LINK_CLS}
          to="/field-calendar/fertilizer-applications/$fertilizerApplicationId"
          params={{ fertilizerApplicationId: link.id }}
        >
          {content}
        </Link>
      );
    case "animal":
      return (
        <Link className={LINK_CLS} to="/animals/$animalId" params={{ animalId: link.id }}>
          {content}
        </Link>
      );
    case "treatment":
      return (
        <Link
          className={LINK_CLS}
          to="/treatments/$treatmentId"
          params={{ treatmentId: link.id }}
        >
          {content}
        </Link>
      );
  }
}

function BioCompliance() {
  const { t } = useTranslation();
  const animalsAccess = useFeatureAccess("animals");
  const fieldAccess = useFeatureAccess("field_calendar");

  const rotationsQuery = useQuery({
    ...cropRotationsQueryOptions(ROTATIONS_FROM, ROTATIONS_TO),
    enabled: fieldAccess.canRead,
  });
  const fertilizerQuery = useQuery({
    ...fertilizerApplicationsQueryOptions(),
    enabled: fieldAccess.canRead,
  });
  const treatmentsQuery = useQuery({
    ...treatmentsQueryOptions(),
    enabled: animalsAccess.canRead,
  });
  const animalsQuery = useQuery({
    ...animalsQueryOptions(false),
    enabled: animalsAccess.canRead,
  });
  const outdoorQuery = useQuery({
    ...outdoorJournalQueryOptions(YEAR_FROM, YEAR_TO),
    enabled: animalsAccess.canRead,
  });

  const results = useMemo<CheckResult[]>(() => {
    const out: CheckResult[] = [];

    if (fieldAccess.canRead) {
      const rotations = rotationsQuery.data?.result ?? [];
      const fertilizers = fertilizerQuery.data?.result ?? [];
      out.push(checkRotationPause(rotations));
      out.push(checkMineralFertilizer(fertilizers));
    }

    if (animalsAccess.canRead) {
      const treatments = treatmentsQuery.data?.result ?? [];
      const animals = animalsQuery.data?.result ?? [];
      const outdoorEntries = outdoorQuery.data?.entries ?? [];
      const hasCattle = animals.some((a) => a.type === "cow");
      out.push(checkAntibioticCount(treatments, animals));
      out.push(checkCriticalAntibiotic(treatments));
      out.push(
        checkWithdrawalStatus(treatments, {
          milk: t("bioCompliance.withdrawalKinds.milk"),
          meat: t("bioCompliance.withdrawalKinds.meat"),
          organs: t("bioCompliance.withdrawalKinds.organs"),
        }),
      );
      out.push(checkRausCoverage(outdoorEntries, CURRENT_YEAR, hasCattle));
    }

    return out;
  }, [
    t,
    fieldAccess.canRead,
    animalsAccess.canRead,
    rotationsQuery.data,
    fertilizerQuery.data,
    treatmentsQuery.data,
    animalsQuery.data,
    outdoorQuery.data,
  ]);

  return (
    <PageContent title={t("bioCompliance.title")} showBackButton={false}>
      <Alert className="mb-6">
        <Info />
        <AlertTitle>{t("bioCompliance.banner.title")}</AlertTitle>
        <AlertDescription>{t("bioCompliance.banner.description")}</AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2 items-start">
        {results.map((r) => (
          <Card key={r.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">
                    {t(`bioCompliance.checks.${r.id}.label`)}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t(`bioCompliance.checks.${r.id}.description`)}
                  </p>
                </div>
                <Badge variant="outline" className={STATUS_BADGE[r.status]}>
                  {t(`bioCompliance.status.${r.status}`)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {CAVEAT_BY_CHECK[r.id] && (
                <p className="text-xs text-muted-foreground mb-2">
                  {t(CAVEAT_BY_CHECK[r.id]!)}
                </p>
              )}
              {r.status === "no_data" ? (
                <p className="text-sm text-muted-foreground">
                  {t("bioCompliance.noData")}
                </p>
              ) : r.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("bioCompliance.noFindings")}
                </p>
              ) : (
                <Accordion type="single" collapsible>
                  <AccordionItem value="items">
                    <AccordionTrigger>
                      {t("bioCompliance.findingsCount", { count: r.failingCount })}
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="divide-y">
                        {r.items.map((item, i) => (
                          <ItemRow key={i} item={item} />
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </PageContent>
  );
}
