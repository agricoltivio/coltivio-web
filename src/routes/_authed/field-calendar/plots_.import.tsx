import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trans, useTranslation } from "react-i18next";
import { AlertTriangle, Check, ChevronDown, Pencil } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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

type Preview = components["schemas"]["PostV1PlotsImportPreviewPositiveResponse"]["data"];
type PreviewRow = Preview["rows"][number];
type OverlayRow = Preview["overlays"][number];
type ImportFormat = Preview["format"];
type Completeness = Preview["completeness"];

type CommitBody = components["schemas"]["PostV1PlotsImportCommitRequestBody"];
type CommitRow = CommitBody["rows"][number];
type CommitOverlay = NonNullable<CommitBody["overlays"]>[number];

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

// Cantonal systems with a supported export. Add an entry per system once its format is known to the API.
const IMPORT_SYSTEMS = [{ key: "lawis", image: "/lawis_export.png" }] as const;
type ImportSystemKey = (typeof IMPORT_SYSTEMS)[number]["key"];

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

// Rows with parse errors become importable once the user has entered a name.
// Rows overlapping existing plots can never be imported.
function isSelectable(row: LocalPreviewRow): boolean {
  return row.geometry !== null && row.overlappingPlotIds.length === 0 && row.editedName.trim().length > 0;
}

function formatHectares(squareMeters: number): string {
  return `${(squareMeters / 10000).toFixed(2)} ha`;
}

function ImportPlots() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>("upload");
  const [system, setSystem] = useState<ImportSystemKey>("lawis");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<LocalPreviewRow[]>([]);
  const [overlays, setOverlays] = useState<OverlayRow[]>([]);
  const [format, setFormat] = useState<ImportFormat>({ name: "", label: "", geometryOnly: false });
  const [completeness, setCompleteness] = useState<Completeness>("full");
  const [overlaysOpen, setOverlaysOpen] = useState(false);
  const [editingRowNumber, setEditingRowNumber] = useState<number | null>(null);
  // Hovered row (transient) and clicked row (sticky) both highlight on the map
  const [focusedRowNumber, setFocusedRowNumber] = useState<number | null>(null);
  const [activeRowNumber, setActiveRowNumber] = useState<number | null>(null);
  const [zoomRequest, setZoomRequest] = useState<{ rowNumber: number; nonce: number } | null>(null);

  const existingPlotsData = useQuery(plotsQueryOptions()).data;
  // Stable reference so the map doesn't push new data on every render
  const existingPlots = useMemo(() => existingPlotsData?.result ?? [], [existingPlotsData]);
  // Existing plots are referred to by parcel number, falling back to the name
  const plotNameById = useMemo(
    () => new Map(existingPlots.map((plot) => [plot.id, plot.localId || plot.name])),
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
        throw new Error(t("fieldCalendar.plots.import.previewError"));
      }
      return response.data.data;
    },
    onSuccess: (preview) => {
      setPreviewRows(preview.rows.map(toLocalRow));
      setOverlays(preview.overlays);
      setFormat(preview.format);
      setCompleteness(preview.completeness);
      setOverlaysOpen(false);
      setStep("preview");
    },
  });

  const rowsToImport = previewRows.filter(
    (row): row is RowWithGeometry => row.selected && hasGeometry(row) && isSelectable(row),
  );
  const overlaysToImport = overlays.filter((overlay) => !overlay.alreadyPresent);
  const overlaysPresent = overlays.length - overlaysToImport.length;
  const totalImportSize = rowsToImport.reduce((sum, row) => sum + row.size, 0);
  const nothingToImport = rowsToImport.length === 0 && overlaysToImport.length === 0;

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
      const overlayRows: CommitOverlay[] = overlaysToImport.map((overlay) => ({
        externalId: overlay.externalId,
        name: overlay.name,
        localId: overlay.localId,
        usage: overlay.usage,
        usageName: overlay.usageName,
        size: overlay.size,
        geometry: overlay.geometry,
      }));
      const response = await apiClient.POST("/v1/plots/import/commit", {
        body: { format: format.name, rows, overlays: overlayRows },
      });
      if (response.error) {
        throw new Error(t("fieldCalendar.plots.import.commitError"));
      }
      // Parcel numbers for plots the file did not name, same as after farm creation in the app
      if (rows.length > 0) {
        await apiClient.POST("/v1/plots/syncMissingLocalIds", { body: {} });
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

  const mapRows: PlotImportMapRow[] = [
    ...previewRows.filter(hasGeometry).map((row) => ({
      rowNumber: row.rowNumber,
      name: row.editedName,
      status: getRowStatus(row),
      selected: row.selected && isSelectable(row),
      geometry: row.geometry,
    })),
    ...overlays.map((overlay) => ({
      rowNumber: overlay.rowNumber,
      name: overlay.name,
      status: "overlay" as const,
      selected: false,
      geometry: overlay.geometry,
    })),
  ];

  // Existing plots that block a row from being imported
  const overlappedPlotIds = useMemo(
    () => new Set(previewRows.flatMap((row) => row.overlappingPlotIds)),
    [previewRows],
  );

  const editingRow = previewRows.find((row) => row.rowNumber === editingRowNumber) ?? null;

  // --- Upload step ---
  if (step === "upload") {
    const activeSystem = IMPORT_SYSTEMS.find((candidate) => candidate.key === system) ?? IMPORT_SYSTEMS[0];
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
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{t("fieldCalendar.plots.import.systems.heading")}</p>
              <div className="flex flex-wrap gap-2">
                {/* Styled as selectable chips, not as action buttons */}
                {IMPORT_SYSTEMS.map((candidate) => {
                  const active = candidate.key === system;
                  return (
                    <button
                      key={candidate.key}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSystem(candidate.key)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors ${
                        active
                          ? "border-primary bg-primary/10 font-medium text-primary"
                          : "bg-background text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {active && <Check className="size-3.5" />}
                      {t(`fieldCalendar.plots.import.systems.${candidate.key}.label`)}
                    </button>
                  );
                })}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {t(`fieldCalendar.plots.import.systems.${activeSystem.key}.instructions`)}
            </p>
            <img
              src={activeSystem.image}
              alt={t(`fieldCalendar.plots.import.systems.${activeSystem.key}.label`)}
              className="w-full rounded-lg border"
            />
            <p className="text-sm text-muted-foreground">{t("fieldCalendar.plots.import.onboardingFilesHint")}</p>
            <p className="text-sm text-muted-foreground">
              <Trans
                i18nKey="fieldCalendar.plots.import.supportHint"
                components={{ mail: <a href="mailto:support@coltivio.ch" className="font-medium underline underline-offset-2" /> }}
              />
            </p>
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
              <div className="space-y-1 text-sm">
                <p className="text-destructive">{previewMutation.error.message}</p>
                <p className="text-muted-foreground">
                  <Trans
                    i18nKey="fieldCalendar.plots.import.supportHint"
                    components={{ mail: <a href="mailto:support@coltivio.ch" className="font-medium underline underline-offset-2" /> }}
                  />
                </p>
              </div>
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
            disabled={nothingToImport || commitMutation.isPending}
          >
            {commitMutation.isPending
              ? t("common.loading")
              : t("fieldCalendar.plots.import.commit", { count: rowsToImport.length })}
          </Button>
        }
      >
        <div className="flex h-[calc(100vh-180px)] min-h-[400px] max-w-3xl flex-col gap-4">
          <div className="shrink-0 space-y-1 text-sm text-muted-foreground">
            <p>
              {t("fieldCalendar.plots.import.summaryDesc", {
                count: rowsToImport.length,
                size: formatHectares(totalImportSize),
              })}
            </p>
            {overlays.length > 0 && (
              <p>
                {t("fieldCalendar.plots.import.summaryOverlays", {
                  count: overlaysToImport.length,
                  present: overlaysPresent,
                })}
              </p>
            )}
          </div>

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
                    <TableCell className="font-medium">{row.editedName}</TableCell>
                    <TableCell>{row.editedLocalId || "-"}</TableCell>
                    <TableCell>{usageLabel(row)}</TableCell>
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
        <Button size="sm" onClick={() => setStep("summary")} disabled={nothingToImport}>
          {t("common.next")}
        </Button>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{t("fieldCalendar.plots.import.previewDesc")}</p>
        {format.geometryOnly || completeness === "partial" ? (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>
              {t(`fieldCalendar.plots.import.completeness.${format.geometryOnly ? "geometries_only" : "partial"}`)}{" "}
              {t("fieldCalendar.plots.import.completeness.defaultUsage")}
            </span>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {t("fieldCalendar.plots.import.formatDetected", { label: format.label })}
          </p>
        )}
        {overlays.length > 0 && (
          <Collapsible open={overlaysOpen} onOpenChange={setOverlaysOpen} className="rounded-md border bg-muted/40 text-sm">
            <CollapsibleTrigger className="flex w-full items-start gap-2 p-3 text-left">
              <ChevronDown className={`mt-0.5 size-4 shrink-0 transition-transform ${overlaysOpen ? "rotate-180" : ""}`} />
              <span>
                {t("fieldCalendar.plots.import.overlays.summary", { count: overlays.length })}
                {overlaysPresent > 0 && (
                  <> {t("fieldCalendar.plots.import.overlays.alreadyPresent", { count: overlaysPresent })}</>
                )}
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ul className="max-h-40 space-y-0.5 overflow-y-auto border-t px-3 py-2 text-xs text-muted-foreground">
                {overlays.map((overlay) => (
                  <li key={overlay.rowNumber} className="flex justify-between gap-2">
                    <span className="truncate">
                      {overlay.name}
                      {overlay.usageName ? ` · ${overlay.usage} – ${overlay.usageName}` : ` · ${overlay.usage}`}
                      {overlay.alreadyPresent && ` · ${t("fieldCalendar.plots.import.overlays.present")}`}
                    </span>
                    <span className="shrink-0">{formatHectares(overlay.size)}</span>
                  </li>
                ))}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        )}

        <PlotImportMap
            rows={mapRows}
            existingPlots={existingPlots}
            overlappedPlotIds={overlappedPlotIds}
            focusedRowNumber={focusedRowNumber ?? activeRowNumber}
            zoomRequest={zoomRequest}
            onPick={(rowNumber) => {
              // overlays are shown on the map but not editable
              const pickedRow = previewRows.find((row) => row.rowNumber === rowNumber);
              if (!pickedRow) return;
              setActiveRowNumber(rowNumber);
              // Overlapping rows can't be imported, so there is nothing to edit
              if (pickedRow.overlappingPlotIds.length === 0) setEditingRowNumber(rowNumber);
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
                    // Overlapping rows can't be imported: no checkbox and no edit button
                    const overlapping = row.overlappingPlotIds.length > 0;
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
                        {overlapping ? (
                          // Keeps the row content aligned with the rows that have a checkbox
                          <span className="size-4 shrink-0" />
                        ) : (
                          <Checkbox
                            className="mt-0.5"
                            checked={!skipped}
                            disabled={!selectable}
                            // Don't trigger the row's zoom-to-plot click
                            onClick={(event) => event.stopPropagation()}
                            onCheckedChange={(checked) => updateRow(row.rowNumber, { selected: checked === true })}
                          />
                        )}
                        <div className={`min-w-0 flex-1 space-y-0.5 ${skipped ? "opacity-60" : ""}`}>
                          <div className="flex items-center gap-1.5">
                            <span
                              className="inline-block size-2.5 shrink-0 rounded-full"
                              style={{ background: skipped && !overlapping ? SKIPPED_ROW_COLOR : IMPORT_STATUS_COLORS[status] }}
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
                        {!overlapping && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={() => setEditingRowNumber(row.rowNumber)}
                            title={t("fieldCalendar.plots.import.editRow")}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
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
          <li key={`${error.code}-${error.value ?? ""}`}>
            {t(`fieldCalendar.plots.import.errors.${error.code}`, { value: error.value ?? "", defaultValue: error.code })}
          </li>
        ))}
      </ul>
    );
  }
  if (status === "conflict") {
    return (
      <p className="text-xs text-red-700 dark:text-red-400">
        <Trans
          i18nKey="fieldCalendar.plots.import.conflictWarning"
          values={{ plots: overlappingPlotNames }}
          components={{ bold: <strong className="font-semibold" /> }}
        />
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
