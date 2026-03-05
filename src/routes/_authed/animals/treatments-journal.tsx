import { apiClient } from "@/api/client";
import { treatmentsQueryOptions } from "@/api/treatments.queries";
import type { Treatment } from "@/api/types";
import { DataTable } from "@/components/DataTable";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { type ColumnDef } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, Download } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_authed/animals/treatments-journal")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(treatmentsQueryOptions());
  },
  component: TreatmentsJournal,
});

type AnimalType = "goat" | "sheep" | "cow" | "horse" | "donkey" | "pig" | "deer";
const ALL_ANIMAL_TYPES: AnimalType[] = ["goat", "sheep", "cow", "horse", "donkey", "pig", "deer"];

function TreatmentsJournal() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const treatmentsQuery = useQuery(treatmentsQueryOptions());

  const currentYear = new Date().getFullYear();
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFromDate, setExportFromDate] = useState(`${currentYear}-01-01`);
  const [exportToDate, setExportToDate] = useState(`${currentYear}-12-31`);
  const [selectedAnimalTypes, setSelectedAnimalTypes] = useState<AnimalType[]>([]);
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const response = await apiClient.POST("/v1/reports/treatments/download", {
        body: {
          fromDate: new Date(exportFromDate).toISOString(),
          toDate: new Date(`${exportToDate}T23:59:59`).toISOString(),
          animalTypes: selectedAnimalTypes.length > 0 ? selectedAnimalTypes : undefined,
        },
      });
      if (response.error || !response.data) throw new Error("Export failed");
      const { base64, fileName } = response.data.data;
      // Decode base64 and trigger a file download
      const byteCharacters = atob(base64);
      const byteNumbers = Array.from({ length: byteCharacters.length }, (_, i) =>
        byteCharacters.charCodeAt(i),
      );
      const blob = new Blob([new Uint8Array(byteNumbers)], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);
      setExportOpen(false);
    } finally {
      setExporting(false);
    }
  }

  function toggleAnimalType(type: AnimalType) {
    setSelectedAnimalTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString();
  }

  const columns = useMemo<ColumnDef<Treatment>[]>(
    () => [
      {
        accessorKey: "startDate",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="p-0 has-[>svg]:px-0 hover:bg-transparent justify-start"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("treatments.startDate")}
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ArrowDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => formatDate(row.getValue("startDate")),
      },
      {
        id: "animals",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="p-0 has-[>svg]:px-0 hover:bg-transparent justify-start"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("treatments.animals")}
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ArrowDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => {
          const animals = row.original.animals;
          const visible = animals.slice(0, 2);
          const overflow = animals.length - visible.length;
          return (
            <span className="font-medium">
              {visible.map((a) => a.name).join(", ")}
              {overflow > 0 && (
                <span className="ml-1 text-xs text-muted-foreground">+{overflow}</span>
              )}
            </span>
          );
        },
      },
      {
        accessorKey: "name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="p-0 has-[>svg]:px-0 hover:bg-transparent justify-start"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("treatments.name")}
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ArrowDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => (
          <span className="block max-w-48 truncate">{row.getValue("name")}</span>
        ),
      },
      {
        accessorKey: "drug.name",
        header: t("treatments.drug"),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.drug?.name || "-"}
          </span>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "milkUsableDate",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="p-0 has-[>svg]:px-0 hover:bg-transparent justify-start"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("treatments.milkUsableDate")}
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ArrowDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {formatDate(row.getValue("milkUsableDate"))}
          </span>
        ),
      },
      {
        accessorKey: "meatUsableDate",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="p-0 has-[>svg]:px-0 hover:bg-transparent justify-start"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("treatments.meatUsableDate")}
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ArrowDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {formatDate(row.getValue("meatUsableDate"))}
          </span>
        ),
      },
    ],
    [t],
  );

  const data = treatmentsQuery.data?.result ?? [];

  return (
    <PageContent title={t("treatments.title")} showBackButton={false}>
      <div className="flex justify-end gap-2 mb-4">
        <Button variant="outline" onClick={() => setExportOpen(true)}>
          <Download className="h-4 w-4 mr-2" />
          {t("common.export")}
        </Button>
        <Button onClick={() => navigate({ to: "/treatments/create" })}>
          {t("treatments.addTreatment")}
        </Button>
      </div>

      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("treatments.exportDialog.title")}</DialogTitle>
            <DialogDescription>{t("treatments.exportDialog.description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>{t("common.fromDate")}</Label>
                <Input
                  type="date"
                  value={exportFromDate}
                  onChange={(e) => setExportFromDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>{t("common.toDate")}</Label>
                <Input
                  type="date"
                  value={exportToDate}
                  onChange={(e) => setExportToDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("treatments.exportDialog.filterByAnimalType")}</Label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_ANIMAL_TYPES.map((animalType) => (
                  <div key={animalType} className="flex items-center gap-2">
                    <Checkbox
                      id={`animal-type-${animalType}`}
                      checked={selectedAnimalTypes.includes(animalType)}
                      onCheckedChange={() => toggleAnimalType(animalType)}
                    />
                    <label htmlFor={`animal-type-${animalType}`} className="text-sm cursor-pointer">
                      {t(`animals.typesPlural.${animalType}`)}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleExport} disabled={exporting || !exportFromDate || !exportToDate}>
              <Download className="h-4 w-4 mr-2" />
              {exporting ? t("common.exporting") : t("common.download")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <DataTable
        data={data}
        columns={columns}
        onRowClick={(treatment) =>
          navigate({
            to: "/treatments/$treatmentId",
            params: { treatmentId: treatment.id },
          })
        }
        globalFilterFn={(row, _columnId, filterValue) => {
          const treatment = row.original;
          const searchValue = filterValue.toLowerCase();
          return (
            treatment.animals.some((a) => a.name.toLowerCase().includes(searchValue)) ||
            treatment.name.toLowerCase().includes(searchValue) ||
            (treatment.drug?.name?.toLowerCase().includes(searchValue) ?? false)
          );
        }}
        defaultSorting={[{ id: "startDate", desc: true }]}
      />
    </PageContent>
  );
}
