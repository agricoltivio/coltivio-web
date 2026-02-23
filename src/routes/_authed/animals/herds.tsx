import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { herdsQueryOptions } from "@/api/herds.queries";
import { animalsQueryOptions } from "@/api/animals.queries";
import { apiClient } from "@/api/client";
import type { Herd } from "@/api/types";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Trash2, Plus } from "lucide-react";

export const Route = createFileRoute("/_authed/animals/herds")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(herdsQueryOptions());
    queryClient.ensureQueryData(animalsQueryOptions());
  },
  component: HerdsPage,
});

function HerdsPage() {
  const { t } = useTranslation();
  const herdsQuery = useQuery(herdsQueryOptions());
  const herds = herdsQuery.data?.result ?? [];

  const [createOpen, setCreateOpen] = useState(false);
  const [editHerd, setEditHerd] = useState<Herd | null>(null);
  const [deleteHerd, setDeleteHerd] = useState<Herd | null>(null);

  return (
    <PageContent title={t("herds.title")} showBackButton={false}>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t("herds.addHerd")}
        </Button>
      </div>

      {herds.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground border border-dashed rounded-md">
          {t("herds.noHerds")}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("herds.name")}</TableHead>
                <TableHead>{t("herds.animalCount")}</TableHead>
                <TableHead className="w-32"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {herds.map((herd) => (
                <TableRow key={herd.id}>
                  <TableCell className="font-medium">
                    <Link
                      to="/animals/herds/$herdId"
                      params={{ herdId: herd.id }}
                      className="hover:underline text-blue-600 hover:text-blue-800"
                    >
                      {herd.name}
                    </Link>
                  </TableCell>
                  <TableCell>{herd.animals.length}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditHerd(herd)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteHerd(herd)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <HerdFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        herd={null}
      />

      <HerdFormDialog
        open={!!editHerd}
        onOpenChange={(open) => !open && setEditHerd(null)}
        herd={editHerd}
      />

      <DeleteHerdDialog
        herd={deleteHerd}
        onOpenChange={(open) => !open && setDeleteHerd(null)}
      />
    </PageContent>
  );
}

function HerdFormDialog({
  open,
  onOpenChange,
  herd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  herd: Herd | null;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const animalsQuery = useQuery(animalsQueryOptions());
  const allAnimals = animalsQuery.data?.result ?? [];

  const [name, setName] = useState("");
  const [selectedAnimalIds, setSelectedAnimalIds] = useState<string[]>([]);

  function resetForm() {
    if (herd) {
      setName(herd.name);
      setSelectedAnimalIds(herd.animals.map((a) => a.id));
    } else {
      setName("");
      setSelectedAnimalIds([]);
    }
  }

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; animalIds: string[] }) => {
      const response = await apiClient.POST("/v1/animals/herds", {
        body: data,
      });
      if (response.error) throw new Error("Failed to create herd");
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["herds"] });
      onOpenChange(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { name: string; animalIds: string[] }) => {
      if (!herd) return;
      const response = await apiClient.PATCH(
        "/v1/animals/herds/byId/{herdId}",
        {
          params: { path: { herdId: herd.id } },
          body: data,
        },
      );
      if (response.error) throw new Error("Failed to update herd");
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["herds"] });
      onOpenChange(false);
    },
  });

  function handleOpenChange(isOpen: boolean) {
    if (isOpen) resetForm();
    onOpenChange(isOpen);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = { name, animalIds: selectedAnimalIds };
    if (herd) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  }

  function toggleAnimal(animalId: string) {
    setSelectedAnimalIds((prev) =>
      prev.includes(animalId)
        ? prev.filter((id) => id !== animalId)
        : [...prev, animalId],
    );
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {herd ? t("herds.editHerd") : t("herds.addHerd")}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="herdName">{t("herds.name")} *</FieldLabel>
                <Input
                  id="herdName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </Field>
            </FieldGroup>
            <FieldGroup>
              <Field>
                <FieldLabel>{t("herds.animals")}</FieldLabel>
                <div className="border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
                  {allAnimals.map((animal) => (
                    <div key={animal.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`herd-animal-${animal.id}`}
                        checked={selectedAnimalIds.includes(animal.id)}
                        onCheckedChange={() => toggleAnimal(animal.id)}
                      />
                      <Label
                        htmlFor={`herd-animal-${animal.id}`}
                        className="font-normal cursor-pointer"
                      >
                        {animal.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </Field>
            </FieldGroup>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={!name || isPending}>
              {isPending ? t("common.loading") : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteHerdDialog({
  herd,
  onOpenChange,
}: {
  herd: Herd | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (herdId: string) => {
      const response = await apiClient.DELETE(
        "/v1/animals/herds/byId/{herdId}",
        { params: { path: { herdId } } },
      );
      if (response.error) throw new Error("Failed to delete herd");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["herds"] });
      onOpenChange(false);
    },
  });

  return (
    <AlertDialog open={!!herd} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("common.confirm")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("herds.deleteConfirm")}
            {herd && (
              <span className="font-medium block mt-2">{herd.name}</span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => herd && deleteMutation.mutate(herd.id)}
            disabled={deleteMutation.isPending}
            className="bg-destructive hover:bg-destructive/90"
          >
            {deleteMutation.isPending
              ? t("common.loading")
              : t("common.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
