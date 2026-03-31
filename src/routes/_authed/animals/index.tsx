import { useMemo } from "react";
import { animalsQueryOptions } from "@/api/animals.queries";
import { ANIMAL_TYPES, type AnimalType, type Animal } from "@/api/types";
import { PageContent } from "@/components/PageContent";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowUp, Upload } from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";
import z from "zod";

const animalSearchSchema = z.object({
  page: fallback(z.number(), 1).default(1),
  filter: fallback(z.string(), "").default(""),
  onlyLiving: fallback(z.boolean(), true).default(true),
});

export const Route = createFileRoute("/_authed/animals/")({
  loaderDeps: ({ search: { onlyLiving } }) => ({ onlyLiving }),
  loader: ({ deps, context: { queryClient } }) => {
    queryClient.ensureQueryData(animalsQueryOptions(deps.onlyLiving));
  },
  validateSearch: zodValidator(animalSearchSchema),
  component: Animals,
});

function Animals() {
  const { t } = useTranslation();
  const { onlyLiving } = Route.useSearch();
  const navigate = useNavigate();
  const animalsQuery = useQuery(animalsQueryOptions(onlyLiving));

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString();
  }

  const columns = useMemo<ColumnDef<Animal>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="p-0 has-[>svg]:px-0 hover:bg-transparent justify-start"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("animals.name")}
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
        accessorKey: "type",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="cursor-pointer"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("animals.type")}
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ArrowDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => t(`animals.types.${row.getValue("type")}`),
        sortingFn: (rowA, rowB) => {
          const typeA = rowA.getValue("type") as string;
          const typeB = rowB.getValue("type") as string;
          return (
            ANIMAL_TYPES.indexOf(typeA as AnimalType) -
            ANIMAL_TYPES.indexOf(typeB as AnimalType)
          );
        },
      },
      {
        accessorKey: "earTag.number",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="p-0 has-[>svg]:px-0 hover:bg-transparent justify-start"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("animals.earTag")}
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ArrowDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => row.original.earTag?.number || "-",
      },
      {
        accessorKey: "dateOfBirth",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="p-0 has-[>svg]:px-0 hover:bg-transparent justify-start"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("animals.dateOfBirth")}
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ArrowDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => {
          const dateOfBirth = row.getValue("dateOfBirth") as string | null;
          return dateOfBirth ? formatDate(dateOfBirth) : "-";
        },
      },
    ],
    [t],
  );

  const data = animalsQuery.data?.result ?? [];

  return (
    <PageContent title="Tiere">
      <div className="flex justify-between gap-2 mb-4">
        <Button
          variant={onlyLiving ? "outline" : "secondary"}
          onClick={() =>
            navigate({ to: "/animals", search: { onlyLiving: !onlyLiving } })
          }
        >
          {onlyLiving ? t("animals.showAll") : t("animals.showLivingOnly")}
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate({ to: "/animals/import" })}>
            <Upload className="h-4 w-4 mr-2" />
            {t("animals.import")}
          </Button>
          <Button onClick={() => navigate({ to: "/animals/create" })}>
            {t("common.create")}
          </Button>
        </div>
      </div>
      <DataTable
        data={data}
        columns={columns}
        onRowClick={(animal) =>
          navigate({
            to: "/animals/$animalId",
            params: { animalId: animal.id },
          })
        }
        globalFilterFn={(row, _columnId, filterValue) => {
          const animal = row.original;
          const searchValue = filterValue.toLowerCase();
          return (
            animal.name.toLowerCase().includes(searchValue) ||
            (animal.earTag?.number?.toLowerCase().includes(searchValue) ??
              false)
          );
        }}
        defaultSorting={[{ id: "type", desc: false }]}
      />
    </PageContent>
  );
}

