import { parasiteChecksQueryOptions } from "@/api/parasiteChecks.queries";
import type { ParasiteCheck } from "@/api/types";
import { DataTable } from "@/components/DataTable";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import { formatDateOnly } from "@/lib/utils";
import { useFeatureAccess } from "@/lib/useFeatureAccess";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { type ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_authed/animals/parasite-checks")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(parasiteChecksQueryOptions());
  },
  component: ParasiteChecksPage,
});

function ParasiteChecksPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { canWrite } = useFeatureAccess("animals");
  const checksQuery = useQuery(parasiteChecksQueryOptions());

  const columns = useMemo<ColumnDef<ParasiteCheck>[]>(
    () => [
      {
        accessorKey: "date",
        header: t("common.date"),
        cell: ({ row }) => formatDateOnly(row.original.date, i18n.language),
      },
      {
        accessorKey: "method",
        header: t("parasiteChecks.method"),
        cell: ({ row }) => t(`parasiteChecks.methods.${row.original.method}`),
      },
      {
        id: "herd",
        header: t("parasiteChecks.herd"),
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.herd?.name ?? "-"}</span>
        ),
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

  // Re-checks are shown inside their base check
  const baseChecks = (checksQuery.data ?? []).filter(
    (check) => check.previousCheckId === null,
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
      <DataTable
        data={baseChecks}
        columns={columns}
        onRowClick={(check) =>
          navigate({ to: "/parasite-checks/$checkId", params: { checkId: check.id } })
        }
        globalFilterFn={(row, _columnId, filterValue) => {
          const searchValue = String(filterValue).toLowerCase();
          return (
            (row.original.herd?.name.toLowerCase().includes(searchValue) ?? false) ||
            t(`parasiteChecks.methods.${row.original.method}`)
              .toLowerCase()
              .includes(searchValue)
          );
        }}
        defaultSorting={[{ id: "date", desc: true }]}
      />
    </PageContent>
  );
}
