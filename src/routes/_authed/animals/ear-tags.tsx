import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { earTagsQueryOptions } from "@/api/earTags.queries";
import { apiClient } from "@/api/client";
import type { EarTag } from "@/api/types";
import { PageContent } from "@/components/PageContent";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2 } from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";
import { useFeatureAccess } from "@/lib/useFeatureAccess";
import {
  buildEarTagRange,
  EAR_TAG_RANGE_DIGITS_PATTERN,
  type EarTagRange,
  MAX_EAR_TAG_RANGE_SIZE,
} from "@/lib/earTagRange";

export const Route = createFileRoute("/_authed/animals/ear-tags")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(earTagsQueryOptions());
  },
  component: EarTags,
});

function EarTags() {
  const { t } = useTranslation();
  const { canWrite: canWriteAnimals } = useFeatureAccess("animals");
  const queryClient = useQueryClient();
  const earTagsQuery = useQuery(earTagsQueryOptions());

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [earTagToDelete, setEarTagToDelete] = useState<EarTag | null>(null);
  // Ear tag whose number is being changed
  const [earTagToEdit, setEarTagToEdit] = useState<EarTag | null>(null);

  // Changes the number of one ear tag, also of an assigned one (the animal keeps it)
  const updateNumberMutation = useMutation({
    mutationFn: async ({ earTagId, number }: { earTagId: string; number: string }) => {
      const response = await apiClient.PATCH("/v1/earTags/byId/{earTagId}", {
        params: { path: { earTagId } },
        body: { number },
      });
      if (response.error) {
        throw new Error(
          response.error.code === "ear_tag_number_taken"
            ? t("earTags.numberTaken")
            : t("common.error"),
        );
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["earTags"] });
      queryClient.invalidateQueries({ queryKey: ["animals"] });
      setEarTagToEdit(null);
    },
  });

  // Create range mutation
  const createRangeMutation = useMutation({
    // Digits of the range with the prefix separate
    mutationFn: async (range: EarTagRange) => {
      const response = await apiClient.POST("/v1/earTags/range", {
        body: {
          fromNumber: range.fromDigits,
          toNumber: range.toDigits,
          prefix: range.prefix || undefined,
        },
      });
      if (response.error) {
        // Conflicts are checked in the dialog; the API still rejects them if tags were
        // created in the meantime (e.g. in the app)
        throw new Error(
          response.error.code === "ear_tag_range_conflict"
            ? t("earTags.rangeConflictServer")
            : t("common.error"),
        );
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["earTags"] });
      setCreateDialogOpen(false);
    },
    onError: () => {
      // Existing tags may have changed, so the dialog's own conflict check sees them
      queryClient.invalidateQueries({ queryKey: ["earTags"] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    // By id, so any number format works (imported numbers don't follow the range format)
    mutationFn: async (earTagId: string) => {
      const response = await apiClient.DELETE("/v1/earTags/byId/{earTagId}", {
        params: { path: { earTagId } },
      });
      if (response.error) {
        // ear_tag_assigned: the tag was assigned to an animal in the meantime (e.g. in the app)
        throw new Error(
          response.error.code === "ear_tag_assigned"
            ? t("earTags.deleteAssignedServer")
            : t("earTags.deleteFailed"),
        );
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["earTags"] });
      setDeleteDialogOpen(false);
      setEarTagToDelete(null);
    },
    // The list may be stale, reload it so the tag no longer shows as available
    onError: () => queryClient.invalidateQueries({ queryKey: ["earTags"] }),
  });

  function handleDeleteClick(
    earTag: EarTag,
    event: React.MouseEvent<HTMLButtonElement>,
  ) {
    event.stopPropagation();
    setEarTagToDelete(earTag);
    setDeleteDialogOpen(true);
  }

  function handleConfirmDelete() {
    if (earTagToDelete) {
      deleteMutation.mutate(earTagToDelete.id);
    }
  }

  // Delete range mutation; the API skips tags that are assigned to an animal
  const deleteRangeMutation = useMutation({
    mutationFn: async (range: EarTagRange) => {
      const response = await apiClient.DELETE("/v1/earTags/range", {
        params: {
          query: {
            fromNumber: range.fromDigits,
            toNumber: range.toDigits,
            prefix: range.prefix || undefined,
          },
        },
      });
      if (response.error) throw new Error(t("common.error"));
      return response.data.data;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["earTags"] }),
  });

  const columns = useMemo<ColumnDef<EarTag>[]>(
    () => [
      {
        accessorKey: "number",
        header: t("earTags.number"),
        cell: ({ row }) => (
          <span className="font-medium">{row.getValue("number")}</span>
        ),
      },
      {
        accessorKey: "animal",
        header: t("earTags.status"),
        cell: ({ row }) => {
          const animal = row.original.animal;
          if (animal) {
            return (
              <span className="text-muted-foreground">
                {t("earTags.assigned")} - {animal.name}
              </span>
            );
          }
          return (
            <span className="text-green-600">{t("earTags.available")}</span>
          );
        },
        sortingFn: (rowA, rowB) => {
          const animalA = rowA.original.animal;
          const animalB = rowB.original.animal;
          if (!animalA && animalB) return -1;
          if (animalA && !animalB) return 1;
          return 0;
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const earTag = row.original;
          const isAssigned = !!earTag.animal;

          return (
            <div className="flex justify-end">
              {canWriteAnimals && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    updateNumberMutation.reset();
                    setEarTagToEdit(earTag);
                  }}
                  title={t("earTags.editEarTag")}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
              {canWriteAnimals && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => handleDeleteClick(earTag, e)}
                  disabled={isAssigned}
                  title={
                    isAssigned ? t("earTags.deleteWarning") : t("common.delete")
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [t, canWriteAnimals],
  );

  const data = earTagsQuery.data?.result ?? [];

  return (
    <PageContent
      title={t("earTags.title")}
      showBackButton={false}
      actions={
        canWriteAnimals && (
          <div className="flex gap-2">
          <DeleteRangeDialog
            earTags={earTagsQuery.data?.result}
            onSubmit={(range) => deleteRangeMutation.mutate(range)}
            onClose={() => deleteRangeMutation.reset()}
            isPending={deleteRangeMutation.isPending}
            submitError={deleteRangeMutation.error?.message ?? null}
            result={deleteRangeMutation.data ?? null}
          />
          <CreateRangeDialog
            open={createDialogOpen}
            onOpenChange={(isOpen) => {
              setCreateDialogOpen(isOpen);
              if (!isOpen) createRangeMutation.reset();
            }}
            existingNumbers={earTagsQuery.data?.result.map(
              (earTag) => earTag.number,
            )}
            submitError={createRangeMutation.error?.message ?? null}
            onSubmit={(range) => createRangeMutation.mutate(range)}
            isPending={createRangeMutation.isPending}
          />
          </div>
        )
      }
    >
      <DataTable
        data={data}
        columns={columns}
        globalFilterFn={(row, _columnId, filterValue) => {
          const earTag = row.original;
          const searchValue = filterValue.toLowerCase();
          return (
            earTag.number.toLowerCase().includes(searchValue) ||
            (earTag.animal?.name?.toLowerCase().includes(searchValue) ?? false)
          );
        }}
        defaultSorting={[{ id: "number", desc: false }]}
      />
      {/* The confirmation dialog closes on click, so a failed delete is reported here */}
      {deleteMutation.isError && (
        <p className="mt-2 text-sm text-destructive">{deleteMutation.error.message}</p>
      )}

      {earTagToEdit && (
        <EditEarTagDialog
          earTag={earTagToEdit}
          onClose={() => setEarTagToEdit(null)}
          onSubmit={(number) =>
            updateNumberMutation.mutate({ earTagId: earTagToEdit.id, number })
          }
          isPending={updateNumberMutation.isPending}
          submitError={updateNumberMutation.error?.message ?? null}
        />
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.confirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("earTags.deleteConfirm")}
              {earTagToDelete && (
                <span className="font-medium block mt-2">
                  {earTagToDelete.number}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteMutation.isPending
                ? t("common.loading")
                : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContent>
  );
}

// Conflicting numbers listed in the preview; the rest is summarized as a count
const MAX_LISTED_CONFLICTS = 10;

type EarTagRangePreview = EarTagRange & {
  // Existing tags inside the range, sorted
  conflictingNumbers: string[];
};

// The range of `amount` tags starting at the first number, and the existing tags in it.
// Null while the input is incomplete or invalid.
function buildRangePreview(
  prefixInput: string,
  fromNumberInput: string,
  amountInput: string,
  existingNumbers: string[],
): EarTagRangePreview | null {
  const range = buildEarTagRange(prefixInput, fromNumberInput, amountInput);
  if (!range) return null;
  return {
    ...range,
    conflictingNumbers: existingNumbers
      .filter(range.contains)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
  };
}

// Create range dialog component
function CreateRangeDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  existingNumbers,
  submitError,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (range: EarTagRange) => void;
  isPending: boolean;
  // Numbers of the farm's ear tags; undefined while loading
  existingNumbers: string[] | undefined;
  submitError: string | null;
}) {
  const { t } = useTranslation();
  const [prefix, setPrefix] = useState("");
  const [fromNumber, setFromNumber] = useState("");
  const [amount, setAmount] = useState("");
  // Creating a wrong range produces many tags that are tedious to clean up, so the
  // dialog asks for confirmation of the computed range before creating it
  const [confirming, setConfirming] = useState(false);

  const trimmedFromNumber = fromNumber.trim();
  const fromNumberInvalid =
    trimmedFromNumber.length > 0 &&
    !EAR_TAG_RANGE_DIGITS_PATTERN.test(trimmedFromNumber);
  // Live preview of the range below the inputs, including overlaps with existing tags
  const preview = existingNumbers
    ? buildRangePreview(prefix, fromNumber, amount, existingNumbers)
    : null;
  const listedConflicts =
    preview?.conflictingNumbers.slice(0, MAX_LISTED_CONFLICTS) ?? [];
  const remainingConflictCount =
    (preview?.conflictingNumbers.length ?? 0) - listedConflicts.length;
  // The API creates at most this many tags at once
  const isTooLarge = !!preview && preview.amount > MAX_EAR_TAG_RANGE_SIZE;
  // Overlapping existing tags isn't possible: the API would reject the whole range
  const canCreate = !!preview && preview.conflictingNumbers.length === 0 && !isTooLarge;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!preview || !canCreate) return;
    if (!confirming) {
      setConfirming(true);
      return;
    }
    onSubmit(preview);
  }

  // Reset whenever the dialog closes, also when the parent closes it after creating
  useEffect(() => {
    if (open) return;
    setPrefix("");
    setFromNumber("");
    setAmount("");
    setConfirming(false);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>{t("earTags.addRange")}</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {confirming
                ? t("earTags.confirmCreateTitle")
                : t("earTags.addRange")}
            </DialogTitle>
            {confirming && preview && (
              <DialogDescription className="whitespace-pre-line">
                {t("earTags.confirmCreateMessage", {
                  from: preview.fromNumber,
                  to: preview.toNumber,
                  total: preview.amount,
                })}
              </DialogDescription>
            )}
          </DialogHeader>

          {!confirming && (
            <div className="grid grid-cols-2 gap-4 py-4">
              {/* Text in front of the numbers, e.g. "CH" or "CH 120." */}
              <FieldGroup className="col-span-2">
                <Field>
                  <FieldLabel htmlFor="prefix">{t("earTags.prefix")}</FieldLabel>
                  <Input
                    id="prefix"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    placeholder={t("earTags.prefixPlaceholder")}
                  />
                </Field>
              </FieldGroup>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="fromNumber">
                    {t("earTags.firstNumber")} *
                  </FieldLabel>
                  <Input
                    id="fromNumber"
                    value={fromNumber}
                    onChange={(e) => setFromNumber(e.target.value)}
                    placeholder="001"
                    inputMode="numeric"
                    aria-invalid={fromNumberInvalid}
                  />
                  {fromNumberInvalid && (
                    <p className="text-sm text-destructive">
                      {t("earTags.invalidDigits")}
                    </p>
                  )}
                </Field>
              </FieldGroup>

              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="amount">
                    {t("earTags.amount")} *
                  </FieldLabel>
                  <Input
                    id="amount"
                    type="number"
                    min={1}
                    max={MAX_EAR_TAG_RANGE_SIZE}
                    step={1}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="50"
                  />
                </Field>
              </FieldGroup>
              {preview && (
                <div
                  className={cn(
                    "col-span-2 rounded-md border bg-muted/40 p-4",
                    listedConflicts.length > 0 && "border-destructive/50",
                  )}
                >
                  <p className="text-sm text-muted-foreground">
                    {t("earTags.rangePreviewTitle")}
                  </p>
                  <p className="mt-1 text-lg font-semibold">
                    {t("earTags.rangePreviewRange", {
                      from: preview.fromNumber,
                      to: preview.toNumber,
                    })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("earTags.rangePreviewTotal", { total: preview.amount })}
                  </p>
                  {isTooLarge && (
                    <p className="mt-2 text-sm text-destructive">
                      {t("earTags.rangeTooLarge", { max: MAX_EAR_TAG_RANGE_SIZE })}
                    </p>
                  )}
                  {listedConflicts.length > 0 && (
                    <p className="mt-2 text-sm text-destructive">
                      {remainingConflictCount > 0
                        ? t("earTags.rangeConflictMore", {
                            numbers: listedConflicts.join(", "),
                            remaining: remainingConflictCount,
                          })
                        : t("earTags.rangeConflict", {
                            numbers: listedConflicts.join(", "),
                          })}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Only on the confirm step: after going back the preview shows the conflicts */}
          {confirming && submitError && (
            <p className="mt-4 text-sm text-destructive">{submitError}</p>
          )}

          <DialogFooter className={confirming ? "mt-4" : undefined}>
            {confirming ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirming(false)}
              >
                {t("common.back")}
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t("common.cancel")}
              </Button>
            )}
            <Button type="submit" disabled={!canCreate || isPending}>
              {isPending
                ? t("common.loading")
                : confirming
                  ? t("common.confirm")
                  : t("common.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Kept (assigned) numbers listed in the delete preview; the rest is summarized as a count
const MAX_LISTED_ASSIGNED = 10;

// Existing tags in the range: unassigned ones get deleted, assigned ones are kept. Null while the
// input is incomplete or invalid.
function buildDeletePreview(
  prefixInput: string,
  fromNumberInput: string,
  amountInput: string,
  earTags: EarTag[],
) {
  const range = buildEarTagRange(prefixInput, fromNumberInput, amountInput);
  if (!range) return null;
  const tagsInRange = earTags
    .filter((earTag) => range.contains(earTag.number))
    .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
  return {
    ...range,
    deletableCount: tagsInRange.filter((earTag) => !earTag.animal).length,
    assignedNumbers: tagsInRange.filter((earTag) => earTag.animal).map((earTag) => earTag.number),
  };
}

function DeleteRangeDialog({
  earTags,
  onSubmit,
  onClose,
  isPending,
  submitError,
  result,
}: {
  // The farm's ear tags; undefined while loading
  earTags: EarTag[] | undefined;
  onSubmit: (range: EarTagRange) => void;
  onClose: () => void;
  isPending: boolean;
  submitError: string | null;
  result: { deletedCount: number; skippedAssigned: string[] } | null;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [prefix, setPrefix] = useState("");
  const [fromNumber, setFromNumber] = useState("");
  const [amount, setAmount] = useState("");
  // Deleting is confirmed with the computed range first
  const [confirming, setConfirming] = useState(false);

  const trimmedFromNumber = fromNumber.trim();
  const fromNumberInvalid = trimmedFromNumber.length > 0 && !EAR_TAG_RANGE_DIGITS_PATTERN.test(trimmedFromNumber);
  const preview = earTags ? buildDeletePreview(prefix, fromNumber, amount, earTags) : null;
  const isTooLarge = !!preview && preview.amount > MAX_EAR_TAG_RANGE_SIZE;
  const canDelete = !!preview && preview.deletableCount > 0 && !isTooLarge;
  const listedAssigned = preview?.assignedNumbers.slice(0, MAX_LISTED_ASSIGNED) ?? [];
  const remainingAssignedCount = (preview?.assignedNumbers.length ?? 0) - listedAssigned.length;

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen);
    if (isOpen) return;
    setPrefix("");
    setFromNumber("");
    setAmount("");
    setConfirming(false);
    onClose();
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!preview || !canDelete) return;
    if (!confirming) {
      setConfirming(true);
      return;
    }
    onSubmit(preview);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">{t("earTags.deleteRange")}</Button>
      </DialogTrigger>
      <DialogContent>
        {result ? (
          <>
            <DialogHeader>
              <DialogTitle>{t("earTags.deleteRangeDoneTitle")}</DialogTitle>
              <DialogDescription>
                {result.skippedAssigned.length > 0
                  ? t("earTags.deleteRangeDoneSkipped", {
                      count: result.deletedCount,
                      skipped: result.skippedAssigned.length,
                    })
                  : t("earTags.deleteRangeDone", { count: result.deletedCount })}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>{t("common.close")}</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{confirming ? t("earTags.confirmDeleteRangeTitle") : t("earTags.deleteRange")}</DialogTitle>
              {confirming && preview && (
                <DialogDescription>
                  {t("earTags.confirmDeleteRangeMessage", {
                    from: preview.fromNumber,
                    to: preview.toNumber,
                    count: preview.deletableCount,
                  })}
                </DialogDescription>
              )}
            </DialogHeader>

            {!confirming && (
              <div className="grid grid-cols-2 gap-4 py-4">
                <FieldGroup className="col-span-2">
                  <Field>
                    <FieldLabel htmlFor="deletePrefix">{t("earTags.prefix")}</FieldLabel>
                    <Input
                      id="deletePrefix"
                      value={prefix}
                      onChange={(event) => setPrefix(event.target.value)}
                      placeholder={t("earTags.prefixPlaceholder")}
                    />
                  </Field>
                </FieldGroup>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="deleteFromNumber">{t("earTags.firstNumber")} *</FieldLabel>
                    <Input
                      id="deleteFromNumber"
                      value={fromNumber}
                      onChange={(event) => setFromNumber(event.target.value)}
                      placeholder="001"
                      inputMode="numeric"
                      aria-invalid={fromNumberInvalid}
                    />
                    {fromNumberInvalid && <p className="text-sm text-destructive">{t("earTags.invalidDigits")}</p>}
                  </Field>
                </FieldGroup>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="deleteAmount">{t("earTags.amount")} *</FieldLabel>
                    <Input
                      id="deleteAmount"
                      type="number"
                      min={1}
                      max={MAX_EAR_TAG_RANGE_SIZE}
                      step={1}
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      placeholder="50"
                    />
                  </Field>
                </FieldGroup>
                {preview && (
                  <div className="col-span-2 rounded-md border bg-muted/40 p-4">
                    <p className="text-sm text-muted-foreground">{t("earTags.rangePreviewTitle")}</p>
                    <p className="mt-1 text-lg font-semibold">
                      {t("earTags.rangePreviewRange", { from: preview.fromNumber, to: preview.toNumber })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {preview.deletableCount > 0
                        ? t("earTags.deleteRangePreviewCount", { count: preview.deletableCount })
                        : t("earTags.deleteRangePreviewNone")}
                    </p>
                    {isTooLarge && (
                      <p className="mt-2 text-sm text-destructive">
                        {t("earTags.rangeTooLarge", { max: MAX_EAR_TAG_RANGE_SIZE })}
                      </p>
                    )}
                    {listedAssigned.length > 0 && (
                      <p className="mt-2 text-sm text-amber-700">
                        {remainingAssignedCount > 0
                          ? t("earTags.deleteRangeKeptMore", {
                              numbers: listedAssigned.join(", "),
                              remaining: remainingAssignedCount,
                            })
                          : t("earTags.deleteRangeKept", { numbers: listedAssigned.join(", ") })}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {confirming && submitError && <p className="mt-4 text-sm text-destructive">{submitError}</p>}

            <DialogFooter className={confirming ? "mt-4" : undefined}>
              {confirming ? (
                <Button type="button" variant="outline" onClick={() => setConfirming(false)}>
                  {t("common.back")}
                </Button>
              ) : (
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                  {t("common.cancel")}
                </Button>
              )}
              <Button type="submit" variant="destructive" disabled={!canDelete || isPending}>
                {isPending ? t("common.loading") : t("common.delete")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Changes the number of one ear tag, e.g. a typo or a format the range didn't cover
function EditEarTagDialog({
  earTag,
  onClose,
  onSubmit,
  isPending,
  submitError,
}: {
  earTag: EarTag;
  onClose: () => void;
  onSubmit: (number: string) => void;
  isPending: boolean;
  submitError: string | null;
}) {
  const { t } = useTranslation();
  const [number, setNumber] = useState(earTag.number);
  const trimmedNumber = number.trim();
  const canSave = trimmedNumber.length > 0 && trimmedNumber !== earTag.number;

  return (
    <Dialog
      open={true}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (canSave) onSubmit(trimmedNumber);
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("earTags.editEarTag")}</DialogTitle>
            {earTag.animal && (
              <DialogDescription>
                {t("earTags.assignedTo", { name: earTag.animal.name })}
              </DialogDescription>
            )}
          </DialogHeader>
          <FieldGroup className="py-4">
            <Field>
              <FieldLabel htmlFor="editEarTagNumber">{t("earTags.number")} *</FieldLabel>
              <Input
                id="editEarTagNumber"
                value={number}
                onChange={(event) => setNumber(event.target.value)}
                autoFocus
              />
            </Field>
          </FieldGroup>
          {submitError && <p className="mb-4 text-sm text-destructive">{submitError}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={!canSave || isPending}>
              {isPending ? t("common.loading") : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
