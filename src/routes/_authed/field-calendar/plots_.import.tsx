import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Pencil } from "lucide-react";
import type { components } from "@/api/schema";
import { apiClient } from "@/api/client";
import { plotsQueryOptions } from "@/api/plots.queries";
import { PageContent } from "@/components/PageContent";
import {
  PlotImportMap,
  IMPORT_STATUS_COLORS,
  SKIPPED_ROW_COLOR,
  type ImportRowStatus,
  type PlotImportMapRow,
} from "@/components/PlotImportMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UsageCombobox } from "@/components/UsageCombobox";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authed/field-calendar/plots_/import")({
  component: ImportPlots,
});

type PreviewRow =
  components["schemas"]["PostV1PlotsImportPreviewPositiveResponse"]["data"]["rows"][number];

type CommitRow = components["schemas"]["PostV1PlotsImportCommitRequestBody"]["rows"][number];

// Extends the server preview row with UI-only fields
type LocalPreviewRow = PreviewRow & {
  // false = not imported; the row stays visible and can be re-checked
  selected: boolean;
  editedName: string;
  editedLocalId: string;
  editedUsage: number | null;
};

type RowWithGeometry = LocalPreviewRow & { geometry: NonNullable<PreviewRow["geometry"]> };

type Step = "upload" | "preview" | "summary";

type Completeness = components["schemas"]["PostV1PlotsImportPreviewPositiveResponse"]["data"]["completeness"];

// "Übrige Dauerwiesen" – used when the file has no usage attribute
const DEFAULT_USAGE_CODE = 613;

function toLocalRow(row: PreviewRow): LocalPreviewRow {
  return {
    ...row,
    selected:
      row.geometry !== null &&
      row.parseErrors.length === 0 &&
      row.overlappingPlotIds.length === 0,
    editedName: row.name,
    editedLocalId: row.localId ?? "",
    editedUsage: row.usage ?? DEFAULT_USAGE_CODE,
  };
}

function hasGeometry(row: LocalPreviewRow): row is RowWithGeometry {
  return row.geometry !== null;
}

function getRowStatus(row: LocalPreviewRow): ImportRowStatus {
  if (row.geometry === null) return "invalid";
  if (row.parseErrors.length > 0) return "error";
  if (row.overlappingPlotIds.length > 0) return "conflict";
  return "new";
}

// Rows with parse errors become importable once the user has entered a name
function isSelectable(row: LocalPreviewRow): boolean {
  return row.geometry !== null && row.editedName.trim().length > 0;
}

function formatHectares(squareMeters: number): string {
  return `${(squareMeters / 10000).toFixed(2)} ha`;
}

function ImportPlots() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<LocalPreviewRow[]>([]);
  const [completeness, setCompleteness] = useState<Completeness>("full");
  const [editingRowNumber, setEditingRowNumber] = useState<number | null>(null);
  // Hovered row (transient) and clicked row (sticky) both highlight on the map
  const [focusedRowNumber, setFocusedRowNumber] = useState<number | null>(null);
  const [activeRowNumber, setActiveRowNumber] = useState<number | null>(null);
  const [zoomRequest, setZoomRequest] = useState<{ rowNumber: number; nonce: number } | null>(null);
  // Conflict rows the user explicitly confirmed in the summary step
  const [confirmedConflictRowNumbers, setConfirmedConflictRowNumbers] = useState<Set<number>>(new Set());

  const existingPlotsData = useQuery(plotsQueryOptions()).data;
  // Stable reference so the map doesn't push new data on every render
  const existingPlots = useMemo(() => existingPlotsData?.result ?? [], [existingPlotsData]);
  const plotNameById = useMemo(
    () => new Map(existingPlots.map((plot) => [plot.id, plot.name])),
    [existingPlots],
  );

  const previewMutation = useMutation({
    mutationFn: async (file: File) => {
      const response = await apiClient.POST("/v1/plots/import/preview", {
        body: { file: "" },
        bodySerializer: () => {
          const formData = new FormData();
          formData.append("file", file, file.name);
          return formData;
        },
      });
      if (response.error) {
        throw new Error(response.error.error || t("fieldCalendar.plots.import.previewError"));
      }
      return response.data.data;
    },
    onSuccess: ({ rows, completeness }) => {
      setPreviewRows(rows.map(toLocalRow));
      setCompleteness(completeness);
      setConfirmedConflictRowNumbers(new Set());
      setStep("preview");
    },
  });

  const rowsToImport = previewRows.filter(
    (row): row is RowWithGeometry => row.selected && hasGeometry(row) && isSelectable(row),
  );
  const conflictRowsToImport = rowsToImport.filter((row) => row.overlappingPlotIds.length > 0);
  const allConflictsConfirmed = conflictRowsToImport.every((row) =>
    confirmedConflictRowNumbers.has(row.rowNumber),
  );
  const totalImportSize = rowsToImport.reduce((sum, row) => sum + row.size, 0);

  const commitMutation = useMutation({
    mutationFn: async () => {
      const rows: CommitRow[] = rowsToImport.map((row) => ({
        name: row.editedName.trim(),
        size: row.size,
        geometry: row.geometry,
        // Optional but not nullable: omit instead of sending null
        ...(row.editedLocalId.trim() !== "" && { localId: row.editedLocalId.trim() }),
        ...(row.editedUsage !== null && { usage: row.editedUsage }),
      }));
      const response = await apiClient.POST("/v1/plots/import/commit", { body: { rows } });
      if (response.error) {
        throw new Error(response.error.error || t("fieldCalendar.plots.import.commitError"));
      }
      return response.data.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["plots"] });
      navigate({ to: "/field-calendar/plots" });
    },
  });

  function updateRow(rowNumber: number, updates: Partial<LocalPreviewRow>) {
    setPreviewRows((prev) =>
      prev.map((row) => (row.rowNumber === rowNumber ? { ...row, ...updates } : row)),
    );
  }

  function setAllSelected(selected: boolean) {
    setPreviewRows((prev) =>
      prev.map((row) => (isSelectable(row) ? { ...row, selected } : row)),
    );
  }

  // Prefer the name from the file; fall back to our translations once the user changed the code
  function usageLabel(row: LocalPreviewRow): string {
    if (row.editedUsage === null) return "-";
    const name =
      row.editedUsage === row.usage && row.usageName
        ? row.usageName
        : t(`fieldCalendar.plots.usageCodes.${row.editedUsage}`, { defaultValue: "" });
    return name ? `${row.editedUsage} – ${name}` : String(row.editedUsage);
  }

  function overlappingPlotNames(row: LocalPreviewRow): string {
    return row.overlappingPlotIds.map((id) => plotNameById.get(id) ?? id).join(", ");
  }

  const mapRows: PlotImportMapRow[] = previewRows.filter(hasGeometry).map((row) => ({
    rowNumber: row.rowNumber,
    name: row.editedName,
    status: getRowStatus(row),
    selected: row.selected && isSelectable(row),
    geometry: row.geometry,
  }));

  // Existing plots that will actually be cut by an imported row
  const overlappedPlotIds = useMemo(
    () =>
      new Set(
        previewRows
          .filter((row) => row.selected && isSelectable(row))
          .flatMap((row) => row.overlappingPlotIds),
      ),
    [previewRows],
  );

  const editingRow = previewRows.find((row) => row.rowNumber === editingRowNumber) ?? null;

  // --- Upload step ---
  if (step === "upload") {
    return (
      <PageContent
        title={t("fieldCalendar.plots.import.title")}
        showBackButton
        backTo={() => navigate({ to: "/field-calendar/plots" })}
      >
        <div className="max-w-xl space-y-8">
          <div className="space-y-3 rounded-xl border bg-muted/40 p-4">
            <h2 className="text-sm font-semibold">{t("fieldCalendar.plots.import.onboardingHeading")}</h2>
            <p className="text-sm text-muted-foreground">{t("fieldCalendar.plots.import.onboardingBody")}</p>
            <img
              src="/lawis_export.png"
              alt={t("fieldCalendar.plots.import.onboardingHeading")}
              className="w-full rounded-lg border"
            />
            <p className="text-sm text-muted-foreground">{t("fieldCalendar.plots.import.onboardingFilesHint")}</p>
          </div>

          <div className="max-w-md space-y-6">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="file">{t("fieldCalendar.plots.import.file")} *</FieldLabel>
                <Input
                  id="file"
                  type="file"
                  accept=".zip,application/zip"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                />
              </Field>
            </FieldGroup>

            {previewMutation.error && (
              <p className="text-destructive text-sm">{previewMutation.error.message}</p>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate({ to: "/field-calendar/plots" })}>
                {t("common.cancel")}
              </Button>
              <Button
                onClick={() => selectedFile && previewMutation.mutate(selectedFile)}
                disabled={!selectedFile || previewMutation.isPending}
              >
                {previewMutation.isPending ? t("common.loading") : t("fieldCalendar.plots.import.preview")}
              </Button>
            </div>
          </div>
        </div>
      </PageContent>
    );
  }

  // --- Summary step ---
  if (step === "summary") {
    return (
      <PageContent
        title={t("fieldCalendar.plots.import.summaryTitle")}
        showBackButton
        backTo={() => setStep("preview")}
        actions={
          <Button
            size="sm"
            onClick={() => commitMutation.mutate()}
            disabled={rowsToImport.length === 0 || !allConflictsConfirmed || commitMutation.isPending}
          >
            {commitMutation.isPending
              ? t("common.loading")
              : t("fieldCalendar.plots.import.commit", { count: rowsToImport.length })}
          </Button>
        }
      >
        <div className="flex h-[calc(100vh-180px)] min-h-[400px] max-w-3xl flex-col gap-4">
          <p className="shrink-0 text-sm text-muted-foreground">
            {t("fieldCalendar.plots.import.summaryDesc", {
              count: rowsToImport.length,
              size: formatHectares(totalImportSize),
            })}
          </p>

          {conflictRowsToImport.length > 0 && (
            <div className="max-h-48 shrink-0 space-y-3 overflow-y-auto rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40">
              <div className="flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-400">
                <AlertTriangle className="size-4" />
                {t("fieldCalendar.plots.import.conflictsNeedApproval")}
              </div>
              {conflictRowsToImport.map((row) => (
                <label key={row.rowNumber} className="flex items-start gap-3 text-sm cursor-pointer">
                  <Checkbox
                    className="mt-0.5"
                    checked={confirmedConflictRowNumbers.has(row.rowNumber)}
                    onCheckedChange={(checked) =>
                      setConfirmedConflictRowNumbers((prev) => {
                        const next = new Set(prev);
                        if (checked === true) next.add(row.rowNumber);
                        else next.delete(row.rowNumber);
                        return next;
                      })
                    }
                  />
                  <span>
                    {t("fieldCalendar.plots.import.confirmConflict", {
                      name: row.editedName,
                      plots: overlappingPlotNames(row),
                    })}
                  </span>
                </label>
              ))}
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("fieldCalendar.plots.import.name")}</TableHead>
                  <TableHead>{t("fieldCalendar.plots.localId")}</TableHead>
                  <TableHead>{t("fieldCalendar.plots.usage")}</TableHead>
                  <TableHead className="text-right">{t("fieldCalendar.plots.size")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rowsToImport.map((row) => (
                  <TableRow key={row.rowNumber}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {row.editedName}
                        {row.overlappingPlotIds.length > 0 && (
                          <Badge variant="outline" className="border-red-400 text-red-700">
                            {t("fieldCalendar.plots.import.status.conflict")}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{row.editedLocalId || "-"}</TableCell>
                    <TableCell>
                      {usageLabel(row)}
                    </TableCell>
                    <TableCell className="text-right">{formatHectares(row.size)}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={3} className="font-medium">{t("fieldCalendar.plots.import.total")}</TableCell>
                  <TableCell className="text-right font-medium">{formatHectares(totalImportSize)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <p className="shrink-0 text-xs text-muted-foreground">{t("fieldCalendar.plots.import.cuttingDateHint")}</p>

          {commitMutation.error && (
            <p className="shrink-0 text-destructive text-sm">{commitMutation.error.message}</p>
          )}
        </div>
      </PageContent>
    );
  }

  // --- Preview step ---
  const selectableRowCount = previewRows.filter(isSelectable).length;

  return (
    <PageContent
      title={t("fieldCalendar.plots.import.previewTitle")}
      showBackButton
      backTo={() => setStep("upload")}
      actions={
        <Button size="sm" onClick={() => setStep("summary")} disabled={rowsToImport.length === 0}>
          {t("common.next")}
        </Button>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{t("fieldCalendar.plots.import.previewDesc")}</p>
        {completeness !== "full" && (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>
              {t(`fieldCalendar.plots.import.completeness.${completeness}`)}{" "}
              {t("fieldCalendar.plots.import.completeness.defaultUsage")}
            </span>
          </div>
        )}

        <PlotImportMap
            rows={mapRows}
            existingPlots={existingPlots}
            overlappedPlotIds={overlappedPlotIds}
            focusedRowNumber={focusedRowNumber ?? activeRowNumber}
            zoomRequest={zoomRequest}
            onPick={(rowNumber) => {
              setActiveRowNumber(rowNumber);
              setEditingRowNumber(rowNumber);
              document.getElementById(`import-row-${rowNumber}`)?.scrollIntoView({ block: "nearest" });
            }}
            overlay={
              <div className="flex h-full flex-col overflow-hidden rounded-lg border bg-background/95 shadow-lg backdrop-blur">
                <div className="space-y-1 border-b p-2 text-xs">
                  <div className="font-medium">
                    {t("fieldCalendar.plots.import.selectedCount", {
                      selected: rowsToImport.length,
                      total: previewRows.length,
                    })}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setAllSelected(true)} disabled={selectableRowCount === 0}>
                      {t("fieldCalendar.plots.import.selectAll")}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setAllSelected(false)} disabled={selectableRowCount === 0}>
                      {t("fieldCalendar.plots.import.deselectAll")}
                    </Button>
                  </div>
                </div>

                <ul className="min-h-0 flex-1 divide-y overflow-y-auto">
                  {previewRows.map((row) => {
                    const status = getRowStatus(row);
                    const selectable = isSelectable(row);
                    const skipped = !(row.selected && selectable);
                    return (
                      <li
                        key={row.rowNumber}
                        id={`import-row-${row.rowNumber}`}
                        className={`flex cursor-pointer gap-2 p-2 text-sm hover:bg-muted ${
                          activeRowNumber === row.rowNumber ? "bg-muted ring-2 ring-inset ring-primary" : ""
                        }`}
                        onClick={() => {
                          setActiveRowNumber(row.rowNumber);
                          if (row.geometry !== null) {
                            setZoomRequest((prev) => ({ rowNumber: row.rowNumber, nonce: (prev?.nonce ?? 0) + 1 }));
                          }
                        }}
                        onMouseEnter={() => setFocusedRowNumber(row.rowNumber)}
                        onMouseLeave={() => setFocusedRowNumber(null)}
                      >
                        <Checkbox
                          className="mt-0.5"
                          checked={!skipped}
                          disabled={!selectable}
                          // Don't trigger the row's zoom-to-plot click
                          onClick={(event) => event.stopPropagation()}
                          onCheckedChange={(checked) => updateRow(row.rowNumber, { selected: checked === true })}
                        />
                        <div className={`min-w-0 flex-1 space-y-0.5 ${skipped ? "opacity-60" : ""}`}>
                          <div className="flex items-center gap-1.5">
                            <span
                              className="inline-block size-2.5 shrink-0 rounded-full"
                              style={{ background: skipped ? SKIPPED_ROW_COLOR : IMPORT_STATUS_COLORS[status] }}
                            />
                            <span className="truncate font-medium">
                              {row.editedName || t("fieldCalendar.plots.import.unnamed")}
                            </span>
                            <span className="ml-auto shrink-0 text-xs text-muted-foreground">{formatHectares(row.size)}</span>
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {[
                              row.editedLocalId && `${t("fieldCalendar.plots.localId")}: ${row.editedLocalId}`,
                              row.editedUsage !== null && usageLabel(row),
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </div>
                          <RowStatusNotice row={row} status={status} overlappingPlotNames={overlappingPlotNames(row)} />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => setEditingRowNumber(row.rowNumber)}
                          title={t("fieldCalendar.plots.import.editRow")}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </li>
                    );
                  })}
                  {previewRows.length === 0 && (
                    <li className="p-6 text-center text-sm text-muted-foreground">
                      {t("fieldCalendar.plots.import.noRows")}
                    </li>
                  )}
                </ul>
              </div>
            }
          />

      </div>

      <Sheet
        open={editingRow !== null}
        onOpenChange={(open) => {
          if (!open) setEditingRowNumber(null);
        }}
      >
        <SheetContent className="px-6">
          <SheetHeader>
            <SheetTitle>{t("fieldCalendar.plots.import.editRow")}</SheetTitle>
          </SheetHeader>
          {editingRow && (
            <RowEditForm
              key={editingRow.rowNumber}
              row={editingRow}
              overlappingPlotNames={overlappingPlotNames(editingRow)}
              onSave={(updates) => {
                updateRow(editingRow.rowNumber, updates);
                setEditingRowNumber(null);
              }}
              onCancel={() => setEditingRowNumber(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </PageContent>
  );
}

// ---- Sub-components ----

function RowStatusNotice({
  row,
  status,
  overlappingPlotNames,
}: {
  row: LocalPreviewRow;
  status: ImportRowStatus;
  overlappingPlotNames: string;
}) {
  const { t } = useTranslation();

  if (status === "invalid") {
    return (
      <p className="text-xs text-muted-foreground">{t("fieldCalendar.plots.import.noGeometry")}</p>
    );
  }
  if (status === "error") {
    return (
      <ul className="list-inside list-disc text-xs text-amber-700 dark:text-amber-400">
        {row.parseErrors.map((error) => (
          <li key={error}>{error}</li>
        ))}
      </ul>
    );
  }
  if (status === "conflict") {
    return (
      <p className="text-xs text-red-700 dark:text-red-400">
        {t("fieldCalendar.plots.import.conflictWarning", { plots: overlappingPlotNames })}
      </p>
    );
  }
  return null;
}

function RowEditForm({
  row,
  overlappingPlotNames,
  onSave,
  onCancel,
}: {
  row: LocalPreviewRow;
  overlappingPlotNames: string;
  onSave: (updates: Pick<LocalPreviewRow, "editedName" | "editedLocalId" | "editedUsage" | "selected">) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(row.editedName);
  const [localId, setLocalId] = useState(row.editedLocalId);
  // UsageCombobox works with string values, "" = no usage
  const [usage, setUsage] = useState(row.editedUsage !== null ? String(row.editedUsage) : "");
  const [selected, setSelected] = useState(row.selected);
  const canSelect = row.geometry !== null && name.trim().length > 0;
  const status = getRowStatus(row);

  function save() {
    onSave({
      editedName: name.trim(),
      editedLocalId: localId.trim(),
      editedUsage: usage ? Number(usage) : null,
      selected,
    });
  }

  return (
    <div className="mt-4 space-y-4">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="import-edit-name">{t("fieldCalendar.plots.import.name")} *</FieldLabel>
          <Input id="import-edit-name" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field>
          <FieldLabel htmlFor="import-edit-local-id">{t("fieldCalendar.plots.localId")}</FieldLabel>
          <Input id="import-edit-local-id" value={localId} onChange={(e) => setLocalId(e.target.value)} />
        </Field>
      </FieldGroup>

      <UsageCombobox value={usage} onChange={setUsage} />

      <div className="flex justify-between gap-4 text-sm">
        <span className="text-muted-foreground">{t("fieldCalendar.plots.size")}</span>
        <span>{formatHectares(row.size)} ({row.size} m²)</span>
      </div>

      <RowStatusNotice row={row} status={status} overlappingPlotNames={overlappingPlotNames} />

      {status === "conflict" && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          {t("fieldCalendar.plots.import.conflictExplanation")}
        </div>
      )}

      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={selected && canSelect}
          disabled={!canSelect}
          onCheckedChange={(checked) => setSelected(checked === true)}
        />
        {t("fieldCalendar.plots.import.includeInImport")}
      </label>

      <div className="flex flex-wrap gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>{t("common.cancel")}</Button>
        <Button onClick={save}>{t("common.save")}</Button>
      </div>
    </div>
  );
}
