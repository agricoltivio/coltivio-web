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
import { Trash2 } from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";
import { useFeatureAccess } from "@/lib/useFeatureAccess";

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

  // Create range mutation
  const createRangeMutation = useMutation({
    mutationFn: async ({
      fromNumber,
      toNumber,
    }: {
      fromNumber: string;
      toNumber: string;
    }) => {
      const response = await apiClient.POST("/v1/earTags/range", {
        body: { fromNumber, toNumber },
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
    mutationFn: async (earTagNumber: string) => {
      const response = await apiClient.DELETE("/v1/earTags/range", {
        params: {
          query: { fromNumber: earTagNumber, toNumber: earTagNumber },
        },
      });
      if (response.error) {
        throw new Error("Failed to delete ear tag");
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["earTags"] });
      setDeleteDialogOpen(false);
      setEarTagToDelete(null);
    },
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
      deleteMutation.mutate(earTagToDelete.number);
    }
  }

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
            onSubmit={(fromNumber, toNumber) =>
              createRangeMutation.mutate({ fromNumber, toNumber })
            }
            isPending={createRangeMutation.isPending}
          />
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

// Same format the API expects: optional letter prefix + number, e.g. "CH001" or "201231"
const EAR_TAG_NUMBER_PATTERN = /^([A-Za-z]*)(\d+)$/;

// Conflicting numbers listed in the preview; the rest is summarized as a count
const MAX_LISTED_CONFLICTS = 10;

type EarTagRangePreview = {
  fromNumber: string;
  toNumber: string;
  amount: number;
  // Existing tags inside the range, sorted
  conflictingNumbers: string[];
};

// The range of `amount` tags starting at `fromNumber`, numbered like the API does it:
// same prefix, zero padded to the start number's length, e.g. ("CH001", 50) -> CH001..CH050.
// Conflicts are found by checking each existing tag against the range, so a large
// amount doesn't build a large list. Null while the input is incomplete or invalid.
function buildRangePreview(
  fromNumberInput: string,
  amountInput: string,
  existingNumbers: string[],
): EarTagRangePreview | null {
  const fromNumber = fromNumberInput.trim();
  const match = fromNumber.match(EAR_TAG_NUMBER_PATTERN);
  const amount = /^\d+$/.test(amountInput.trim())
    ? parseInt(amountInput, 10)
    : 0;
  if (!match || amount < 1) return null;
  const [, prefix, digits] = match;
  const firstValue = parseInt(digits, 10);
  const lastValue = firstValue + amount - 1;
  const formatNumber = (value: number) =>
    `${prefix}${value.toString().padStart(digits.length, "0")}`;

  const conflictingNumbers = existingNumbers
    .filter((existingNumber) => {
      const existingMatch = existingNumber.match(EAR_TAG_NUMBER_PATTERN);
      if (!existingMatch || existingMatch[1] !== prefix) return false;
      const existingValue = parseInt(existingMatch[2], 10);
      // Only an exact match counts, e.g. "CH0105" isn't "CH105"
      return (
        existingValue >= firstValue &&
        existingValue <= lastValue &&
        formatNumber(existingValue) === existingNumber
      );
    })
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  return {
    fromNumber,
    toNumber: formatNumber(lastValue),
    amount,
    conflictingNumbers,
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
  onSubmit: (fromNumber: string, toNumber: string) => void;
  isPending: boolean;
  // Numbers of the farm's ear tags; undefined while loading
  existingNumbers: string[] | undefined;
  submitError: string | null;
}) {
  const { t } = useTranslation();
  const [fromNumber, setFromNumber] = useState("");
  const [amount, setAmount] = useState("");
  // Creating a wrong range produces many tags that are tedious to clean up, so the
  // dialog asks for confirmation of the computed range before creating it
  const [confirming, setConfirming] = useState(false);

  const trimmedFromNumber = fromNumber.trim();
  const fromNumberInvalid =
    trimmedFromNumber.length > 0 &&
    !EAR_TAG_NUMBER_PATTERN.test(trimmedFromNumber);
  // Live preview of the range below the inputs, including overlaps with existing tags
  const preview = existingNumbers
    ? buildRangePreview(fromNumber, amount, existingNumbers)
    : null;
  const listedConflicts =
    preview?.conflictingNumbers.slice(0, MAX_LISTED_CONFLICTS) ?? [];
  const remainingConflictCount =
    (preview?.conflictingNumbers.length ?? 0) - listedConflicts.length;
  // Overlapping existing tags isn't possible: the API would reject the whole range
  const canCreate = !!preview && preview.conflictingNumbers.length === 0;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!preview || !canCreate) return;
    if (!confirming) {
      setConfirming(true);
      return;
    }
    onSubmit(preview.fromNumber, preview.toNumber);
  }

  // Reset whenever the dialog closes, also when the parent closes it after creating
  useEffect(() => {
    if (open) return;
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
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="fromNumber">
                    {t("earTags.firstNumber")} *
                  </FieldLabel>
                  <Input
                    id="fromNumber"
                    value={fromNumber}
                    onChange={(e) => setFromNumber(e.target.value)}
                    placeholder="201231"
                    aria-invalid={fromNumberInvalid}
                  />
                  {fromNumberInvalid && (
                    <p className="text-sm text-destructive">
                      {t("earTags.invalidNumber")}
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
