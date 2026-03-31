import { useState, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Pencil, Trash2, X } from "lucide-react";
import type { components } from "@/api/schema";
import { apiClient } from "@/api/client";
import { animalsQueryOptions } from "@/api/animals.queries";
import { ANIMAL_TYPES, ANIMAL_SEX_OPTIONS, type AnimalType } from "@/api/types";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authed/animals/import")({
  component: ImportAnimals,
});

type PreviewRow =
  components["schemas"]["PostV1AnimalsImportPreviewPositiveResponse"]["data"]["rows"][number];

type CommitResult =
  components["schemas"]["PostV1AnimalsImportCommitPositiveResponse"]["data"];

// Extends the server preview row with UI-only fields
type LocalPreviewRow = PreviewRow & {
  removed: boolean;
  mergeAnimalId: string | null;
  mergeAnimalName: string | null;
  editedEarTagNumber: string | null;
  editedName: string | null;
  editedSex: "male" | "female" | null;
  editedDateOfBirth: string | null;
  editedUsage: "milk" | "other" | null;
  editedDateOfDeath: string | null;
  editedDeathReason: "died" | "slaughtered";
  editedMotherEarTagNumber: string | null;
  editedFatherEarTagNumber: string | null;
};

type Step = "upload" | "preview" | "result";

function toLocalRow(row: PreviewRow): LocalPreviewRow {
  return {
    ...row,
    removed: false,
    mergeAnimalId: null,
    mergeAnimalName: null,
    editedEarTagNumber: row.earTagNumber,
    editedName: row.name,
    editedSex: row.sex,
    editedDateOfBirth: row.dateOfBirth
      ? row.dateOfBirth.slice(0, 10) // keep only YYYY-MM-DD for date inputs
      : null,
    editedUsage: row.usage,
    editedDateOfDeath: row.dateOfDeath ? row.dateOfDeath.slice(0, 10) : null,
    editedDeathReason: row.deathReason ?? "died",
    editedMotherEarTagNumber: row.motherEarTagNumber,
    editedFatherEarTagNumber: row.fatherEarTagNumber,
  };
}

function ImportAnimals() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("upload");
  const [animalType, setAnimalType] = useState<AnimalType>("goat");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const skipHeaderRow = true;
  const [previewRows, setPreviewRows] = useState<LocalPreviewRow[]>([]);
  const [commitResult, setCommitResult] = useState<CommitResult | null>(null);

  // Which row index is open in the edit sheet (null = closed)
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  // Which row index is open in the merge dialog (null = closed)
  const [mergingRowIndex, setMergingRowIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error("No file selected");
      const response = await apiClient.POST("/v1/animals/import/preview", {
        body: {
          file: selectedFile as unknown as string,
          skipHeaderRow: skipHeaderRow ? "true" : "false",
        },
        bodySerializer: (body) => {
          const formData = new FormData();
          formData.append("file", body.file as unknown as File);
          formData.append("skipHeaderRow", body.skipHeaderRow ?? "false");
          return formData;
        },
      });
      if (response.error) throw new Error(t("animals.importPreviewError"));
      return response.data.data.rows;
    },
    onSuccess: (rows) => {
      setPreviewRows(rows.map(toLocalRow));
      setStep("preview");
    },
  });

  const commitMutation = useMutation({
    mutationFn: async () => {
      const rows = previewRows
        // Skip removed rows and conflict rows the user didn't resolve
        .filter((row) => !row.removed && !(row.earTagAssigned && !row.mergeAnimalId))
        .map((row) => ({
          earTagNumber: row.editedEarTagNumber ?? undefined,
          earTagId: row.earTagId ?? undefined,
          // These fields are required by the schema — if still null after editing,
          // the commit button is disabled so we can safely assert non-null here
          name: row.editedName!,
          sex: row.editedSex!,
          dateOfBirth: row.editedDateOfBirth
            ? new Date(row.editedDateOfBirth).toISOString()
            : row.dateOfBirth!,
          usage: row.editedUsage!,
          dateOfDeath: row.editedDateOfDeath
            ? new Date(row.editedDateOfDeath).toISOString()
            : row.dateOfDeath ?? undefined,
          deathReason: row.editedDateOfDeath || row.dateOfDeath ? row.editedDeathReason : undefined,
          motherEarTagNumber: row.editedMotherEarTagNumber ?? undefined,
          fatherEarTagNumber: row.editedFatherEarTagNumber ?? undefined,
          mergeAnimalId: row.mergeAnimalId ?? undefined,
        }));

      const response = await apiClient.POST("/v1/animals/import/commit", {
        body: { type: animalType, rows },
      });
      if (response.error) throw new Error(t("animals.importCommitError"));
      return response.data.data;
    },
    onSuccess: (data) => {
      setCommitResult(data);
      setStep("result");
    },
  });

  function updateRow(index: number, updates: Partial<LocalPreviewRow>) {
    setPreviewRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...updates } : row)),
    );
  }

  function removeRow(index: number) {
    updateRow(index, { removed: true });
  }

  // Rows that are not removed and still have parse errors block the commit
  const hasBlockingErrors = previewRows.some(
    (row) => !row.removed && row.parseErrors.length > 0,
  );

  const activeRows = previewRows.filter((row) => !row.removed);
  // Rows that will actually be committed (conflicts without merge are silently skipped)
  const committableRows = activeRows.filter(
    (row) => !(row.earTagAssigned && !row.mergeAnimalId),
  );

  // --- Upload step ---
  if (step === "upload") {
    return (
      <PageContent title={t("animals.importTitle")} showBackButton backTo={() => navigate({ to: "/animals" })}>
        <div className="max-w-md space-y-6">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="animalType">{t("animals.type")} *</FieldLabel>
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
              <FieldLabel htmlFor="file">{t("animals.importFile")} *</FieldLabel>
              <Input
                ref={fileInputRef}
                id="file"
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              />
            </Field>
          </FieldGroup>

          {previewMutation.error && (
            <p className="text-destructive text-sm">{previewMutation.error.message}</p>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate({ to: "/animals" })}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => previewMutation.mutate()}
              disabled={!selectedFile || previewMutation.isPending}
            >
              {previewMutation.isPending ? t("common.loading") : t("animals.importPreview")}
            </Button>
          </div>
        </div>
      </PageContent>
    );
  }

  // --- Result step ---
  if (step === "result" && commitResult) {
    return (
      <PageContent title={t("animals.importResultTitle")} showBackButton backTo={() => navigate({ to: "/animals" })}>
        <div className="space-y-6 max-w-lg">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{commitResult.created}</div>
              <div className="text-sm text-muted-foreground">{t("animals.importCreated")}</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{commitResult.merged}</div>
              <div className="text-sm text-muted-foreground">{t("animals.importMerged")}</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{commitResult.skipped.length}</div>
              <div className="text-sm text-muted-foreground">{t("animals.importSkipped")}</div>
            </div>
          </div>

          {commitResult.skipped.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">{t("animals.importSkippedRows")}</h4>
              <div className="max-h-64 overflow-y-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">{t("animals.importRow")}</TableHead>
                      <TableHead>{t("animals.earTag")}</TableHead>
                      <TableHead>{t("animals.name")}</TableHead>
                      <TableHead>{t("animals.importReason")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commitResult.skipped.map((skipped) => {
                      // Map 0-based index back to the submitted row
                      const submittedRows = previewRows.filter((r) => !r.removed);
                      const matchedRow = submittedRows[skipped.index];
                      return (
                        <TableRow key={skipped.index}>
                          <TableCell>{matchedRow?.rowNumber ?? skipped.index + 1}</TableCell>
                          <TableCell>{matchedRow?.editedEarTagNumber ?? "-"}</TableCell>
                          <TableCell>{matchedRow?.editedName ?? "-"}</TableCell>
                          <TableCell className="text-muted-foreground">{skipped.reason}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <Button onClick={() => navigate({ to: "/animals" })}>{t("common.close")}</Button>
        </div>
      </PageContent>
    );
  }

  // --- Preview step ---
  return (
    <PageContent title={t("animals.importPreviewTitle")} showBackButton>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{t("animals.importPreviewDesc")}</p>

        {hasBlockingErrors && (
          <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md p-3">
            {t("animals.importPreviewHasErrors")}
          </div>
        )}

        <div className="border rounded-md overflow-auto">
          <Table className="table-auto">
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">{t("animals.importRow")}</TableHead>
                <TableHead>{t("animals.earTag")}</TableHead>
                <TableHead>{t("animals.name")}</TableHead>
                <TableHead>{t("animals.sex")}</TableHead>
                <TableHead>{t("animals.dateOfBirth")}</TableHead>
                <TableHead>{t("animals.usage")}</TableHead>
                <TableHead>{t("animals.dateOfDeath")}</TableHead>
                <TableHead>{t("animals.motherEarTagNumber")}</TableHead>
                <TableHead>{t("animals.fatherEarTagNumber")}</TableHead>
                <TableHead className="min-w-52">{t("animals.importStatus")}</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewRows.map((row, index) => {
                if (row.removed) return null;
                return (
                  <TableRow key={row.rowNumber}>
                    <TableCell className="text-muted-foreground">{row.rowNumber}</TableCell>
                    <TableCell>{row.editedEarTagNumber ?? "-"}</TableCell>
                    <TableCell>{row.editedName ?? "-"}</TableCell>
                    <TableCell>
                      {row.editedSex ? t(`animals.sexOptions.${row.editedSex}`) : "-"}
                    </TableCell>
                    <TableCell>
                      {row.editedDateOfBirth
                        ? new Date(row.editedDateOfBirth).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {row.editedUsage ? t(`animals.usageOptions.${row.editedUsage}`) : "-"}
                    </TableCell>
                    <TableCell>
                      {row.editedDateOfDeath
                        ? new Date(row.editedDateOfDeath).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell>{row.editedMotherEarTagNumber ?? "-"}</TableCell>
                    <TableCell>{row.editedFatherEarTagNumber ?? "-"}</TableCell>
                    <TableCell className="overflow-visible">
                      <RowStatusCell
                        row={row}
                        onMergeClick={() => setMergingRowIndex(index)}
                        onClearMerge={() =>
                          updateRow(index, { mergeAnimalId: null, mergeAnimalName: null })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setEditingRowIndex(index)}
                          title={t("animals.importEditRow")}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => removeRow(index)}
                          title={t("animals.importDeleteRow")}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {activeRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-muted-foreground py-6">
                    {t("animals.importNoRows")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {commitMutation.error && (
          <p className="text-destructive text-sm">{commitMutation.error.message}</p>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setStep("upload");
              setPreviewRows([]);
              previewMutation.reset();
            }}
          >
            {t("animals.importBack")}
          </Button>
          <Button
            onClick={() => commitMutation.mutate()}
            disabled={
              committableRows.length === 0 ||
              hasBlockingErrors ||
              commitMutation.isPending
            }
          >
            {commitMutation.isPending
              ? t("common.loading")
              : t("animals.importCommit", { count: committableRows.length })}
          </Button>
        </div>
      </div>

      {/* Row edit sheet */}
      <Sheet
        open={editingRowIndex !== null}
        onOpenChange={(open) => {
          if (!open) setEditingRowIndex(null);
        }}
      >
        <SheetContent className="px-6">
          <SheetHeader>
            <SheetTitle>{t("animals.importEditRow")}</SheetTitle>
          </SheetHeader>
          {editingRowIndex !== null && (
            <RowEditForm
              row={previewRows[editingRowIndex]}
              onSave={(updates) => {
                updateRow(editingRowIndex, updates);
                setEditingRowIndex(null);
              }}
              onCancel={() => setEditingRowIndex(null)}
              onMergeClick={() => setMergingRowIndex(editingRowIndex)}
              onClearMerge={() =>
                updateRow(editingRowIndex, { mergeAnimalId: null, mergeAnimalName: null })
              }
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Merge animal dialog */}
      <MergeAnimalDialog
        open={mergingRowIndex !== null}
        onOpenChange={(open) => {
          if (!open) setMergingRowIndex(null);
        }}
        onSelect={(animalId, animalName) => {
          if (mergingRowIndex !== null) {
            updateRow(mergingRowIndex, {
              mergeAnimalId: animalId,
              mergeAnimalName: animalName,
            });
          }
          setMergingRowIndex(null);
        }}
      />
    </PageContent>
  );
}

// ---- Sub-components ----

function RowStatusCell({
  row,
  onMergeClick,
  onClearMerge,
}: {
  row: LocalPreviewRow;
  onMergeClick: () => void;
  onClearMerge: () => void;
}) {
  const { t } = useTranslation();

  if (row.parseErrors.length > 0) {
    return (
      <div className="space-y-1">
        <Badge variant="destructive">{t("animals.importParseError")}</Badge>
        <ul className="text-xs text-destructive list-disc list-inside">
          {row.parseErrors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      </div>
    );
  }

  if (row.mergeAnimalId) {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
          {t("animals.importMergedWith", { name: row.mergeAnimalName })}
        </Badge>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={onClearMerge}
          title={t("animals.importClearMerge")}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  if (row.earTagAssigned) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="border-amber-400 text-amber-700">
            {t("animals.importConflict")}
          </Badge>
          <Button variant="outline" size="sm" className="h-6 text-xs" onClick={onMergeClick}>
            {t("animals.importMergeWith")}
          </Button>
        </div>
        <p className="text-xs text-amber-600">{t("animals.importConflictWillSkip")}</p>
      </div>
    );
  }

  return (
    <Badge variant="outline" className="border-green-400 text-green-700">
      {t("animals.importReady")}
    </Badge>
  );
}

type RowEditUpdates = Pick<
  LocalPreviewRow,
  | "editedEarTagNumber"
  | "editedName"
  | "editedSex"
  | "editedDateOfBirth"
  | "editedUsage"
  | "editedDateOfDeath"
  | "editedDeathReason"
  | "editedMotherEarTagNumber"
  | "editedFatherEarTagNumber"
>;

function RowEditForm({
  row,
  onSave,
  onCancel,
  onMergeClick,
  onClearMerge,
}: {
  row: LocalPreviewRow;
  onSave: (updates: RowEditUpdates) => void;
  onCancel: () => void;
  onMergeClick: () => void;
  onClearMerge: () => void;
}) {
  const { t } = useTranslation();
  const [earTagNumber, setEarTagNumber] = useState(row.editedEarTagNumber ?? "");
  const [name, setName] = useState(row.editedName ?? "");
  const [sex, setSex] = useState<"male" | "female" | "">(row.editedSex ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(row.editedDateOfBirth ?? "");
  const [usage, setUsage] = useState<"milk" | "other" | "">(row.editedUsage ?? "");
  const [dateOfDeath, setDateOfDeath] = useState(row.editedDateOfDeath ?? "");
  const [deathReason, setDeathReason] = useState<"died" | "slaughtered">(row.editedDeathReason);
  const [motherEarTagNumber, setMotherEarTagNumber] = useState(row.editedMotherEarTagNumber ?? "");
  const [fatherEarTagNumber, setFatherEarTagNumber] = useState(row.editedFatherEarTagNumber ?? "");

  function handleSave() {
    onSave({
      editedEarTagNumber: earTagNumber || null,
      editedName: name || null,
      editedSex: (sex as "male" | "female") || null,
      editedDateOfBirth: dateOfBirth || null,
      editedUsage: (usage as "milk" | "other") || null,
      editedDateOfDeath: dateOfDeath || null,
      editedDeathReason: deathReason,
      editedMotherEarTagNumber: motherEarTagNumber || null,
      editedFatherEarTagNumber: fatherEarTagNumber || null,
    });
  }

  return (
    <div className="space-y-4 mt-4">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="edit-earTag">{t("animals.earTag")}</FieldLabel>
          <Input
            id="edit-earTag"
            value={earTagNumber}
            onChange={(e) => setEarTagNumber(e.target.value)}
          />
        </Field>
      </FieldGroup>

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="edit-name">{t("animals.name")} *</FieldLabel>
          <Input
            id="edit-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
      </FieldGroup>

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="edit-sex">{t("animals.sex")} *</FieldLabel>
          <Select value={sex} onValueChange={(v) => setSex(v as "male" | "female")}>
            <SelectTrigger id="edit-sex">
              <SelectValue placeholder="–" />
            </SelectTrigger>
            <SelectContent>
              {ANIMAL_SEX_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`animals.sexOptions.${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </FieldGroup>

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="edit-dob">{t("animals.dateOfBirth")} *</FieldLabel>
          <Input
            id="edit-dob"
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
          />
        </Field>
      </FieldGroup>

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="edit-usage">{t("animals.usage")} *</FieldLabel>
          <Select value={usage} onValueChange={(v) => setUsage(v as "milk" | "other")}>
            <SelectTrigger id="edit-usage">
              <SelectValue placeholder="–" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="milk">{t("animals.usageOptions.milk")}</SelectItem>
              <SelectItem value="other">{t("animals.usageOptions.other")}</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </FieldGroup>

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="edit-dateOfDeath">{t("animals.dateOfDeath")}</FieldLabel>
          <Input
            id="edit-dateOfDeath"
            type="date"
            value={dateOfDeath}
            onChange={(e) => setDateOfDeath(e.target.value)}
          />
        </Field>
      </FieldGroup>

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="edit-deathReason">{t("animals.deathReason")}</FieldLabel>
          <Select value={deathReason} onValueChange={(v) => setDeathReason(v as "died" | "slaughtered")}>
            <SelectTrigger id="edit-deathReason">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="died">{t("animals.deathReasons.died")}</SelectItem>
              <SelectItem value="slaughtered">{t("animals.deathReasons.slaughtered")}</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </FieldGroup>

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="edit-motherEarTag">{t("animals.motherEarTagNumber")}</FieldLabel>
          <Input
            id="edit-motherEarTag"
            value={motherEarTagNumber}
            onChange={(e) => setMotherEarTagNumber(e.target.value)}
          />
        </Field>
      </FieldGroup>

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="edit-fatherEarTag">{t("animals.fatherEarTagNumber")}</FieldLabel>
          <Input
            id="edit-fatherEarTag"
            value={fatherEarTagNumber}
            onChange={(e) => setFatherEarTagNumber(e.target.value)}
          />
        </Field>
      </FieldGroup>

      <FieldGroup>
        <Field>
          <FieldLabel>{t("animals.importMergeWith")}</FieldLabel>
          {row.mergeAnimalId ? (
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {row.mergeAnimalName}
              </Badge>
              <Button variant="ghost" size="sm" onClick={onClearMerge}>
                <X className="h-3 w-3 mr-1" />
                {t("animals.importClearMerge")}
              </Button>
            </div>
          ) : (
            <Button variant="outline" className="mt-1 w-full" onClick={onMergeClick}>
              {t("animals.importSelectMerge")}
            </Button>
          )}
        </Field>
      </FieldGroup>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>{t("common.cancel")}</Button>
        <Button onClick={handleSave}>{t("common.save")}</Button>
      </div>
    </div>
  );
}

function MergeAnimalDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (animalId: string, animalName: string) => void;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");

  // Only fetch when the dialog is open
  const animalsQuery = useQuery({ ...animalsQueryOptions(), enabled: open });

  const filteredAnimals = (animalsQuery.data?.result ?? []).filter((animal) => {
    const q = search.toLowerCase();
    return (
      animal.name.toLowerCase().includes(q) ||
      (animal.earTag?.number?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("animals.importSelectMerge")}</DialogTitle>
        </DialogHeader>
        <Input
          placeholder={t("animals.importSearchAnimal")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mt-2"
        />
        <div className="mt-2 h-80 overflow-y-auto border rounded-md divide-y">
          {animalsQuery.isPending && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {t("common.loading")}
            </div>
          )}
          {filteredAnimals.map((animal) => (
            <button
              key={animal.id}
              type="button"
              className="w-full text-left px-4 py-2.5 hover:bg-muted text-sm flex items-center justify-between"
              onClick={() => {
                onSelect(animal.id, animal.name);
                setSearch("");
              }}
            >
              <span className="font-medium">{animal.name}</span>
              {animal.earTag && (
                <span className="text-muted-foreground text-xs">{animal.earTag.number}</span>
              )}
            </button>
          ))}
          {!animalsQuery.isPending && filteredAnimals.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {t("common.noResults")}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
