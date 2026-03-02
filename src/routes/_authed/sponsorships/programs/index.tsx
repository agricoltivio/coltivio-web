import { useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { sponsorshipProgramsQueryOptions } from "@/api/sponsorshipPrograms.queries";
import type { SponsorshipProgram } from "@/api/types";
import { PageContent } from "@/components/PageContent";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp } from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";

export const Route = createFileRoute("/_authed/sponsorships/programs/")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(sponsorshipProgramsQueryOptions());
  },
  component: SponsorshipPrograms,
});

function SponsorshipPrograms() {
  const { t } = useTranslation();
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
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="p-0 has-[>svg]:px-0 hover:bg-transparent justify-start"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("sponsorshipPrograms.name")}
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ArrowDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.getValue("name")}</span>
        ),
      },
      {
        accessorKey: "yearlyCost",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="p-0 has-[>svg]:px-0 hover:bg-transparent justify-start"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("sponsorshipPrograms.yearlyCost")}
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ArrowDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => formatCurrency(row.getValue("yearlyCost")),
      },
    ],
    [t],
  );

  const data = programsQuery.data?.result ?? [];

  return (
    <PageContent title={t("sponsorshipPrograms.title")} showBackButton={false}>
      <div className="flex justify-end mb-4">
        <Button
          onClick={() => navigate({ to: "/sponsorships/programs/create" })}
        >
          Erfassen
        </Button>
      </div>
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
