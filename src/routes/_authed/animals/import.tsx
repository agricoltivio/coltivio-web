import { useState, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Pencil, Trash2 } from "lucide-react";
import type { components } from "@/api/schema";
import { apiClient } from "@/api/client";
import { ANIMAL_TYPES, ANIMAL_SEX_OPTIONS, type AnimalType } from "@/api/types";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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

const ONBOARDING_SEEN_KEY = "tvd_import_onboarding_seen";

function hasSeenOnboarding(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_SEEN_KEY) === "true";
  } catch {
    return true;
  }
}

function toLocalRow(row: PreviewRow): LocalPreviewRow {
  return {
    ...row,
    removed: false,
    mergeAnimalId: null,
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
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("upload");
  const [animalType, setAnimalType] = useState<AnimalType>("goat");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const skipHeaderRow = true;
  const [previewRows, setPreviewRows] = useState<LocalPreviewRow[]>([]);
  const [commitResult, setCommitResult] = useState<CommitResult | null>(null);

  // The full TVD instructions open automatically on the first visit, afterwards via "learn more"
  const [onboardingOpen, setOnboardingOpen] = useState(() => !hasSeenOnboarding());

  function handleOnboardingOpenChange(open: boolean) {
    setOnboardingOpen(open);
    if (!open) {
      try {
        localStorage.setItem(ONBOARDING_SEEN_KEY, "true");
      } catch {
        // Storage unavailable, the dialog will just show again next time
      }
    }
  }

  // Which row index is open in the edit sheet (null = closed)
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);

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
      if (response.error) {
        // A 400 carries a localized explanation, e.g. which TVD columns are missing.
        const serverMessage =
          response.response.status === 400 ? response.error.error : undefined;
        throw new Error(serverMessage || t("animals.importPreviewError"));
      }
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
            ? row.editedDateOfBirth
            : row.dateOfBirth!,
          usage: row.editedUsage!,
          dateOfDeath: row.editedDateOfDeath
            ? row.editedDateOfDeath
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

  // The ear tag identifies the existing animal, so a conflict can only be merged into its current holder.
  function mergeRow(index: number) {
    const row = previewRows[index];
    updateRow(index, { mergeAnimalId: row.assignedToAnimalId });
  }

  function mergeAllConflicts() {
    setPreviewRows((prev) =>
      prev.map((row) =>
        !row.removed && row.earTagAssigned && !row.mergeAnimalId
          ? { ...row, mergeAnimalId: row.assignedToAnimalId }
          : row,
      ),
    );
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
  const unmergedConflictCount = activeRows.filter(
    (row) => row.earTagAssigned && !row.mergeAnimalId && row.assignedToAnimalId,
  ).length;

  // TVD screenshots exist in de/fr/it, English users get the German TVD.
  const tvdLocale = i18n.language.slice(0, 2);
  const pedigreeImageSrc =
    tvdLocale === "fr" || tvdLocale === "it"
      ? `/tvd-pedigree-${tvdLocale}.jpg`
      : "/tvd-pedigree-de.jpg";

  // --- Upload step ---
  if (step === "upload") {
    return (
      <PageContent title={t("animals.importTitle")} showBackButton backTo={() => navigate({ to: "/animals" })}>
        <div className="max-w-xl space-y-8">
          <div className="space-y-4 rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
            <p>{t("animals.importOnboardingBody")}</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>{t("animals.importOnboardingStepSelectType")}</li>
              <li>{t("animals.importOnboardingStepExport")}</li>
            </ol>
            <img
              src="/tvd-export-small.jpg"
              alt={t("animals.importOnboardingStepExport")}
              className="w-full rounded-lg border"
            />
            <Button
              variant="link"
              className="h-auto p-0"
              onClick={() => setOnboardingOpen(true)}
            >
              {t("animals.importOnboardingLearnMore")}
            </Button>
          </div>

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
        </div>

        <Dialog open={onboardingOpen} onOpenChange={handleOnboardingOpenChange}>
          <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("animals.importTitle")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>{t("animals.importOnboardingBody")}</p>
              <ol className="list-decimal list-inside space-y-2">
                <li>{t("animals.importOnboardingStepSelectType")}</li>
                <li>{t("animals.importOnboardingStepExport")}</li>
              </ol>
              <img
                src="/tvd-export-small.jpg"
                alt={t("animals.importOnboardingStepExport")}
                className="w-full rounded-lg border"
              />
              <p>{t("animals.importOnboardingPedigree")}</p>
              <img
                src={pedigreeImageSrc}
                alt={t("animals.importOnboardingPedigree")}
                className="w-full rounded-lg border"
              />
              <p>{t("animals.importOnboardingSync")}</p>
              <p>{t("animals.importOnboardingSyncMergeHint")}</p>
            </div>
          </DialogContent>
        </Dialog>
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

        {unmergedConflictCount > 0 && (
          <div className="flex items-center justify-between gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
            <span>{t("animals.importConflictsFound", { count: unmergedConflictCount })}</span>
            <Button variant="outline" size="sm" onClick={mergeAllConflicts}>
              {t("animals.importMergeAll")}
            </Button>
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
                        onMerge={() => mergeRow(index)}
                        onClearMerge={() => updateRow(index, { mergeAnimalId: null })}
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
              onMerge={() => mergeRow(editingRowIndex)}
              onClearMerge={() => updateRow(editingRowIndex, { mergeAnimalId: null })}
            />
          )}
        </SheetContent>
      </Sheet>
    </PageContent>
  );
}

// ---- Sub-components ----

function RowStatusCell({
  row,
  onMerge,
  onClearMerge,
}: {
  row: LocalPreviewRow;
  onMerge: () => void;
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

  // Conflict rows get an "update" checkbox, the ear tag already identifies the animal to update.
  if (row.earTagAssigned && row.assignedToAnimalId) {
    const willMerge = !!row.mergeAnimalId;
    return (
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm cursor-pointer">
          <Checkbox
            checked={willMerge}
            onCheckedChange={(checked) => (checked === true ? onMerge() : onClearMerge())}
          />
          {t("animals.importUpdateCheckbox")}
        </label>
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
  onMerge,
  onClearMerge,
}: {
  row: LocalPreviewRow;
  onSave: (updates: RowEditUpdates) => void;
  onCancel: () => void;
  onMerge: () => void;
  onClearMerge: () => void;
}) {
  const { t } = useTranslation();
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
      {row.earTagAssigned && row.assignedToAnimalId && (
        <div className="space-y-2 rounded-md border border-l-4 border-l-amber-400 p-3 text-sm">
          <p>{t("animals.importEarTagAssignedWarning")}</p>
          {row.mergeAnimalId ? (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {t("animals.importMergedWith", { name: row.assignedToAnimalName })}
              </Badge>
              <Button variant="ghost" size="sm" onClick={onClearMerge}>
                {t("animals.importClearMerge")}
              </Button>
            </div>
          ) : (
            <Button variant="outline" className="w-full" onClick={onMerge}>
              {t("animals.importMergeWith", { name: row.assignedToAnimalName })}
            </Button>
          )}
        </div>
      )}

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="edit-earTag">{t("animals.earTag")}</FieldLabel>
          {/* Read-only: ear tag conflicts are resolved by the server on upload, an edited number would not be re-checked. */}
          <Input id="edit-earTag" value={row.editedEarTagNumber ?? ""} disabled />
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

      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>{t("common.cancel")}</Button>
        <Button onClick={handleSave}>{t("common.save")}</Button>
      </div>
    </div>
  );
}
