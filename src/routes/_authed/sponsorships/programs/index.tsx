import { useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useFeatureAccess } from "@/lib/useFeatureAccess";
import { sponsorshipProgramsQueryOptions } from "@/api/sponsorshipPrograms.queries";
import type { SponsorshipProgram } from "@/api/types";
import { PageContent } from "@/components/PageContent";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { type ColumnDef } from "@tanstack/react-table";

export const Route = createFileRoute("/_authed/sponsorships/programs/")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(sponsorshipProgramsQueryOptions());
  },
  component: SponsorshipPrograms,
});

function SponsorshipPrograms() {
  const { t } = useTranslation();
  const { canWrite: canWriteSponsorships } = useFeatureAccess("commerce");
  const navigate = useNavigate();
  const programsQuery = useQuery(sponsorshipProgramsQueryOptions());

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("de-CH", {
      style: "currency",
      currency: "CHF",
    }).format(amount);
  }

  const columns = useMemo<ColumnDef<SponsorshipProgram>[]>(
    () => [
      {
        accessorKey: "name",
        header: t("sponsorshipPrograms.name"),
        cell: ({ row }) => (
          <span className="font-medium">{row.getValue("name")}</span>
        ),
      },
      {
        accessorKey: "yearlyCost",
        header: t("sponsorshipPrograms.yearlyCost"),
        cell: ({ row }) => formatCurrency(row.getValue("yearlyCost")),
      },
    ],
    [t],
  );

  const data = programsQuery.data?.result ?? [];

  return (
    <PageContent
      title={t("sponsorshipPrograms.title")}
      showBackButton={false}
      actions={
        canWriteSponsorships && (
          <Button
            onClick={() => navigate({ to: "/sponsorships/programs/create" })}
          >
            {t("common.create")}
          </Button>
        )
      }
    >
      <DataTable
        data={data}
        columns={columns}
        onRowClick={(program) =>
          navigate({
            to: "/sponsorships/programs/$programId",
            params: { programId: program.id },
          })
        }
        globalFilterFn={(row, _columnId, filterValue) => {
          const program = row.original;
          const searchValue = filterValue.toLowerCase();
          return program.name.toLowerCase().includes(searchValue);
        }}
      />
    </PageContent>
  );
}
