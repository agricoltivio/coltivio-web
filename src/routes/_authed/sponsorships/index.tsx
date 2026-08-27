import { useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { sponsorshipsQueryOptions } from "@/api/sponsorships.queries";
import type { Sponsorship } from "@/api/types";
import { PageContent } from "@/components/PageContent";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFeatureAccess } from "@/lib/useFeatureAccess";
import { type ColumnDef } from "@tanstack/react-table";

export const Route = createFileRoute("/_authed/sponsorships/")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(sponsorshipsQueryOptions());
  },
  component: Sponsorships,
});

function Sponsorships() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { canWrite: canWriteSponsorships } = useFeatureAccess("commerce");
  const sponsorshipsQuery = useQuery(sponsorshipsQueryOptions());

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString();
  }

  function isActive(sponsorship: { endDate: string | null }) {
    if (!sponsorship.endDate) return true;
    return new Date(sponsorship.endDate) > new Date();
  }

  const columns = useMemo<ColumnDef<Sponsorship>[]>(
    () => [
      {
        accessorKey: "contact.firstName",
        header: t("sponsorships.contact"),
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.contact.firstName} {row.original.contact.lastName}
          </span>
        ),
      },
      {
        accessorKey: "sponsorshipProgram.name",
        header: t("sponsorships.program"),
        cell: ({ row }) => row.original.sponsorshipProgram.name,
      },
      {
        accessorKey: "animal.name",
        header: t("sponsorships.animal"),
        cell: ({ row }) => row.original.animal.name,
      },
      {
        accessorKey: "startDate",
        header: t("sponsorships.startDate"),
        cell: ({ row }) => formatDate(row.getValue("startDate")),
      },
      {
        accessorKey: "endDate",
        header: t("sponsorships.endDate"),
        cell: ({ row }) => {
          const endDate = row.getValue("endDate") as string | null;
          return endDate ? formatDate(endDate) : "-";
        },
      },
      {
        id: "paidThisYear",
        header: t("sponsorships.paidThisYear"),
        cell: ({ row }) => (
          <Badge variant={row.original.paidThisYear ? "default" : "destructive"}>
            {row.original.paidThisYear ? t("common.yes") : t("common.no")}
          </Badge>
        ),
        enableSorting: false,
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const active = isActive(row.original);
          return (
            <Badge variant={active ? "default" : "secondary"}>
              {active ? t("sponsorships.active") : t("sponsorships.ended")}
            </Badge>
          );
        },
        enableSorting: false,
      },
    ],
    [t],
  );

  const data = sponsorshipsQuery.data?.result ?? [];

  return (
    <PageContent
      title={t("sponsorships.title")}
      showBackButton={false}
      actions={
        canWriteSponsorships && (
          <Button onClick={() => navigate({ to: "/sponsorships/create" })}>
            {t("common.create")}
          </Button>
        )
      }
    >
      <DataTable
        data={data}
        columns={columns}
        onRowClick={(sponsorship) =>
          navigate({
            to: "/sponsorships/$sponsorshipId",
            params: { sponsorshipId: sponsorship.id },
          })
        }
        globalFilterFn={(row, _columnId, filterValue) => {
          const sponsorship = row.original;
          const searchValue = filterValue.toLowerCase();
          return (
            sponsorship.contact.firstName.toLowerCase().includes(searchValue) ||
            sponsorship.contact.lastName.toLowerCase().includes(searchValue) ||
            sponsorship.animal.name.toLowerCase().includes(searchValue)
          );
        }}
        defaultSorting={[{ id: "startDate", desc: true }]}
      />
    </PageContent>
  );
}
