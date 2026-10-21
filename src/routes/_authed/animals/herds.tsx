import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
import { Pencil, Trash2 } from "lucide-react";
import { useFeatureAccess } from "@/lib/useFeatureAccess";
import { inlineLink } from "@/lib/ui";

export const Route = createFileRoute("/_authed/animals/herds")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(herdsQueryOptions());
    queryClient.ensureQueryData(animalsQueryOptions());
  },
  component: HerdsPage,
});

function HerdsPage() {
  const { t } = useTranslation();
  const { canWrite: canWriteAnimals } = useFeatureAccess("animals");
  const herdsQuery = useQuery(herdsQueryOptions());
  const herds = herdsQuery.data?.result ?? [];

  const [createOpen, setCreateOpen] = useState(false);
  const navigate = useNavigate();
  const [deleteHerd, setDeleteHerd] = useState<Herd | null>(null);

  return (
    <PageContent
      title={t("herds.title")}
      showBackButton={false}
      actions={
        canWriteAnimals && (
          <Button onClick={() => setCreateOpen(true)}>
            {t("herds.addHerd")}
          </Button>
        )
      }
    >

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
                      className={inlineLink}
                    >
                      {herd.name}
                    </Link>
                  </TableCell>
                  <TableCell>{herd.animals.length}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      {canWriteAnimals && <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          navigate({
                            to: "/animals/herds/$herdId",
                            params: { herdId: herd.id },
                          })
                        }
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>}
                      {canWriteAnimals && <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteHerd(herd)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {createOpen && (
        <CreateHerdDialog open={true} onOpenChange={setCreateOpen} />
      )}

      <DeleteHerdDialog
        herd={deleteHerd}
        onOpenChange={(open) => !open && setDeleteHerd(null)}
      />
    </PageContent>
  );
}

// Creates a herd from name and animals, then opens its page to add schedules.
// Editing happens on the herd page itself.
function CreateHerdDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const animalsQuery = useQuery(animalsQueryOptions());
  const allAnimals = animalsQuery.data?.result ?? [];

  const [name, setName] = useState("");
  const [selectedAnimalIds, setSelectedAnimalIds] = useState<string[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; animalIds: string[] }) => {
      const response = await apiClient.POST("/v1/animals/herds", {
        body: data,
      });
      if (response.error) throw response.error;
      return response.data.data;
    },
    onSuccess: (herd) => {
      queryClient.invalidateQueries({ queryKey: ["herds"] });
      onOpenChange(false);
      navigate({ to: "/animals/herds/$herdId", params: { herdId: herd.id } });
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);
    createMutation.mutate(
      { name, animalIds: selectedAnimalIds },
      {
        onError: (err) => {
          setServerError(err instanceof Error ? err.message : String(err));
        },
      },
    );
  }

  function toggleAnimal(animalId: string) {
    setSelectedAnimalIds((prev) =>
      prev.includes(animalId)
        ? prev.filter((id) => id !== animalId)
        : [...prev, animalId],
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("herds.addHerd")}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-6">
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
                <div className="border rounded-md p-3 space-y-2 max-h-56 overflow-y-auto">
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
            {serverError && (
              <p className="text-sm text-destructive">{serverError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={!name || createMutation.isPending}>
              {createMutation.isPending ? t("common.loading") : t("common.save")}
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
