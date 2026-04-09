import { useState, useMemo } from "react";
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
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
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
        throw new Error("Failed to create ear tags");
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["earTags"] });
      setCreateDialogOpen(false);
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
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="p-0 has-[>svg]:px-0 hover:bg-transparent justify-start"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("earTags.number")}
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ArrowDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.getValue("number")}</span>
        ),
      },
      {
        accessorKey: "animal",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="p-0 has-[>svg]:px-0 hover:bg-transparent justify-start"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("earTags.status")}
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ArrowDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
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
    <PageContent title={t("earTags.title")} showBackButton={false}>
      {canWriteAnimals && (
        <div className="flex justify-end mb-4">
          <CreateRangeDialog
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
            onSubmit={(fromNumber, toNumber) =>
              createRangeMutation.mutate({ fromNumber, toNumber })
            }
            isPending={createRangeMutation.isPending}
          />
        </div>
      )}
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

// Create range dialog component
function CreateRangeDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (fromNumber: string, toNumber: string) => void;
  isPending: boolean;
}) {
  const { t } = useTranslation();
  const [prefix, setPrefix] = useState("");
  const [fromNumber, setFromNumber] = useState("");
  const [toNumber, setToNumber] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fullFromNumber = prefix + fromNumber;
    const fullToNumber = prefix + toNumber;
    onSubmit(fullFromNumber, fullToNumber);
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      setPrefix("");
      setFromNumber("");
      setToNumber("");
    }
    onOpenChange(isOpen);
  }

  const isValid =
    prefix.length > 0 && fromNumber.length > 0 && toNumber.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>{t("earTags.addRange")}</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("earTags.addRange")}</DialogTitle>
            <DialogDescription>
              {t("earTags.number")}: {prefix}
              {fromNumber} - {prefix}
              {toNumber}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="prefix">
                  {t("earTags.prefix")} *
                </FieldLabel>
                <Input
                  id="prefix"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  placeholder="CH 123."
                />
              </Field>
            </FieldGroup>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="fromNumber">
                    {t("earTags.fromNumber")} *
                  </FieldLabel>
                  <Input
                    id="fromNumber"
                    value={fromNumber}
                    onChange={(e) => setFromNumber(e.target.value)}
                    placeholder="0001"
                  />
                </Field>
              </FieldGroup>

              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="toNumber">
                    {t("earTags.toNumber")} *
                  </FieldLabel>
                  <Input
                    id="toNumber"
                    value={toNumber}
                    onChange={(e) => setToNumber(e.target.value)}
                    placeholder="0100"
                  />
                </Field>
              </FieldGroup>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={!isValid || isPending}>
              {isPending ? t("common.loading") : t("common.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
