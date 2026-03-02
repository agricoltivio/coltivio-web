import { useState, useRef, useMemo } from "react";
import { animalsQueryOptions } from "@/api/animals.queries";
import { apiClient } from "@/api/client";
import { ANIMAL_TYPES, type AnimalType, type Animal } from "@/api/types";
import { PageContent } from "@/components/PageContent";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

interface ImportResult {
  skipped: {
    row: number;
    earTagNumber: string | null;
    name: string | null;
    reason: string;
  }[];
  summary: {
    totalRows: number;
    imported: number;
    skipped: number;
  };
}

function Animals() {
  const { t } = useTranslation();
  const { onlyLiving } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const animalsQuery = useQuery(animalsQueryOptions(onlyLiving));

  const [importDialogOpen, setImportDialogOpen] = useState(false);

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
      <div className="flex justify-end gap-2 mb-4">
        <ImportDialog
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["animals"] });
          }}
        />
        <Button onClick={() => navigate({ to: "/animals/create" })}>
          Erfassen
        </Button>
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

// Import dialog component (not exported)
function ImportDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [animalType, setAnimalType] = useState<AnimalType>("goat");
  const [skipHeaderRow, setSkipHeaderRow] = useState(true);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error("No file selected");

      const response = await apiClient.POST("/v1/animals/import", {
        body: {
          file: selectedFile as unknown as string,
          type: animalType,
          skipHeaderRow: skipHeaderRow ? "true" : undefined,
        },
        bodySerializer: (body) => {
          const formData = new FormData();
          formData.append("file", body.file as unknown as File);
          formData.append("type", body.type);
          if (body.skipHeaderRow) {
            formData.append("skipHeaderRow", body.skipHeaderRow);
          }
          return formData;
        },
      });

      if (response.error) {
        throw new Error("Failed to import animals");
      }

      return response.data.data as ImportResult;
    },
    onSuccess: (data) => {
      setImportResult(data);
      onSuccess();
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setImportResult(null);
  }

  function handleImport() {
    importMutation.mutate();
  }

  function handleClose() {
    onOpenChange(false);
    setSelectedFile(null);
    setImportResult(null);
    importMutation.reset();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose();
        else onOpenChange(true);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          {t("animals.import")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("animals.importTitle")}</DialogTitle>
          <DialogDescription>
            {t("animals.importDescription")}
          </DialogDescription>
        </DialogHeader>

        {!importResult ? (
          <div className="space-y-4 py-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="animalType">
                  {t("animals.type")} *
                </FieldLabel>
                <Select
                  value={animalType}
                  onValueChange={(value) => setAnimalType(value as AnimalType)}
                >
                  <SelectTrigger id="animalType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ANIMAL_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(`animals.types.${type}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>

            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="file">
                  {t("animals.importFile")} *
                </FieldLabel>
                <Input
                  ref={fileInputRef}
                  id="file"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                />
              </Field>
            </FieldGroup>

            <FieldGroup>
              <Field className="flex flex-row items-center gap-2">
                <Checkbox
                  id="skipHeader"
                  checked={skipHeaderRow}
                  onCheckedChange={(checked) =>
                    setSkipHeaderRow(checked === true)
                  }
                />
                <Label htmlFor="skipHeader" className="font-normal">
                  {t("animals.skipHeaderRow")}
                </Label>
              </Field>
            </FieldGroup>

            {importMutation.error && (
              <div className="text-destructive text-sm">
                {importMutation.error.message}
              </div>
            )}
          </div>
        ) : (
          <div className="py-4">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">
                  {importResult.summary.totalRows}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("animals.importTotal")}
                </div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {importResult.summary.imported}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("animals.importImported")}
                </div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {importResult.summary.skipped}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("animals.importSkipped")}
                </div>
              </div>
            </div>

            {importResult.skipped.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">
                  {t("animals.importSkippedRows")}
                </h4>
                <div className="max-h-64 overflow-y-auto border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">
                          {t("animals.importRow")}
                        </TableHead>
                        <TableHead>{t("animals.earTag")}</TableHead>
                        <TableHead>{t("animals.name")}</TableHead>
                        <TableHead>{t("animals.importReason")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importResult.skipped.map((item) => (
                        <TableRow key={item.row}>
                          <TableCell>{item.row}</TableCell>
                          <TableCell>{item.earTagNumber || "-"}</TableCell>
                          <TableCell>{item.name || "-"}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {item.reason}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {!importResult ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                {t("common.cancel")}
              </Button>
              <Button
                onClick={handleImport}
                disabled={!selectedFile || importMutation.isPending}
              >
                {importMutation.isPending
                  ? t("common.loading")
                  : t("animals.import")}
              </Button>
            </>
          ) : (
            <Button onClick={handleClose}>{t("common.close")}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
