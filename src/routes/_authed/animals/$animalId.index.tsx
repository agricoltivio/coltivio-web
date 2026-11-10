import { useMemo, useState } from "react";
import Fuse from "fuse.js";
import { Trash2 } from "lucide-react";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import {
  animalFamilyTreeQueryOptions,
  animalQueryOptions,
  animalsQueryOptions,
} from "@/api/animals.queries";
import type { AnimalDetail } from "@/api/types";
import { animalJournalQueryOptions } from "@/api/animalJournal.queries";
import { AnimalHeatsCard, AnimalWeightCard } from "@/components/AnimalBreedingCards";
import { useFeatureAccess } from "@/lib/useFeatureAccess";
import { inlineLink } from "@/lib/ui";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authed/animals/$animalId/")({
  validateSearch: z.object({ returnTo: z.string().optional() }),
  component: AnimalDetailPage,
});

function AnimalDetailPage() {
  const { t } = useTranslation();
  const { animalId } = Route.useParams();
  const { returnTo } = Route.useSearch();
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showDeceasedChildren, setShowDeceasedChildren] = useState(false);
  const [addOffspringOpen, setAddOffspringOpen] = useState(false);
  const { canWrite: canWriteAnimals } = useFeatureAccess("animals");

  const animalQuery = useQuery(animalQueryOptions(animalId));

  const childrenQuery = useQuery({
    queryKey: ["animals", animalId, "children"],
    queryFn: async () => {
      const response = await apiClient.GET(
        "/v1/animals/byId/{animalId}/children",
        {
          params: { path: { animalId } },
        },
      );
      if (response.error) {
        throw new Error("Failed to fetch children");
      }
      return response.data.data.result;
    },
    enabled: !!animalId,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.DELETE("/v1/animals/byId/{animalId}", {
        params: { path: { animalId } },
      });
      if (response.error) {
        throw new Error("Failed to delete animal");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["animals"] });
      navigate({ to: "/animals" });
    },
  });

  // Removing an offspring clears the link matching this animal's sex
  const removeChildMutation = useMutation({
    mutationFn: async ({
      childId,
      parentSex,
    }: {
      childId: string;
      parentSex: "male" | "female";
    }) => {
      const response = await apiClient.PATCH("/v1/animals/byId/{animalId}", {
        params: { path: { animalId: childId } },
        body: parentSex === "female" ? { motherId: null } : { fatherId: null },
      });
      if (response.error) {
        throw new Error("Failed to remove offspring");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["animals"] });
    },
  });

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString();
  }

  const filteredChildren = childrenQuery.data?.filter((child) => {
    if (showDeceasedChildren) return true;
    return child.dateOfDeath === null;
  });

  if (animalQuery.isLoading) {
    return (
      <PageContent title={t("common.loading")}>
        <div className="py-8 text-center text-muted-foreground">
          {t("common.loading")}
        </div>
      </PageContent>
    );
  }

  if (animalQuery.error || !animalQuery.data) {
    return (
      <PageContent title={t("common.error")}>
        <div className="py-8 text-center text-destructive">
          {t("common.error")}
        </div>
      </PageContent>
    );
  }

  const animal = animalQuery.data;

  return (
    <PageContent title={animal.name} showBackButton backTo={() =>
        // returnTo can carry a query string (the filtered list), which `to` doesn't take
        returnTo ? router.history.push(returnTo) : navigate({ to: "/animals" })
      }>
      {/* Header actions */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {animal.dateOfDeath && (
            <Badge variant="secondary">
              {animal.deathReason
                ? t(`animals.deathReasons.${animal.deathReason}`)
                : t("animals.dateOfDeath")}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link
              to="/animals/family-tree"
              search={{ type: animal.type, focusId: animal.id }}
            >
              {t("animals.familyTree")}
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/animals/$animalId/parasite-history" params={{ animalId }}>
              {t("parasiteChecks.parasiteHistory")}
            </Link>
          </Button>
          {canWriteAnimals && (
            <Button variant="outline" asChild>
              <Link to="/animals/$animalId/edit" params={{ animalId }}>
                {t("common.edit")}
              </Link>
            </Button>
          )}
          {canWriteAnimals && <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">{t("common.delete")}</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("common.confirm")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("animals.deleteConfirm")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  {t("common.delete")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>}
        </div>
      </div>

      <div className="space-y-6">
        {/* Animal Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t("animals.animalDetails")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <DetailItem label={t("animals.name")} value={animal.name} />
              <DetailItem
                label={t("animals.type")}
                value={t(`animals.types.${animal.type}`)}
              />
              <DetailItem
                label={t("animals.sex")}
                value={t(`animals.sexOptions.${animal.sex}`)}
              />
              <DetailItem
                label={t("animals.dateOfBirth")}
                value={
                  animal.dateOfBirth ? formatDate(animal.dateOfBirth) : "-"
                }
              />
              <DetailItem
                label={t("animals.earTag")}
                value={animal.earTag?.number || t("animals.noEarTag")}
              />
              <DetailItem
                label={t("animals.mother")}
                value={
                  animal.mother ? (
                    <Link
                      className={inlineLink}
                      to="/animals/$animalId"
                      params={{ animalId: animal.mother.id }}
                    >
                      {animal.mother.name}
                    </Link>
                  ) : (
                    t("animals.noMother")
                  )
                }
              />
              <DetailItem
                label={t("animals.father")}
                value={
                  animal.father ? (
                    <Link
                      to="/animals/$animalId"
                      params={{ animalId: animal.father.id }}
                      className={inlineLink}
                    >
                      {animal.father.name}
                    </Link>
                  ) : (
                    t("animals.noFather")
                  )
                }
              />
              {animal.color && (
                <DetailItem label={t("animals.color")} value={animal.color} />
              )}
              {animal.dateOfDeath && (
                <>
                  <DetailItem
                    label={t("animals.dateOfDeath")}
                    value={formatDate(animal.dateOfDeath)}
                  />
                  <DetailItem
                    label={t("animals.deathReason")}
                    value={
                      animal.deathReason
                        ? t(`animals.deathReasons.${animal.deathReason}`)
                        : "-"
                    }
                  />
                </>
              )}
            </div>
            {animal.notes && (
              <div className="mt-4">
                <DetailItem
                  label={t("animals.notes")}
                  value={
                    <span className="whitespace-pre-wrap">{animal.notes}</span>
                  }
                />
              </div>
            )}
          </CardContent>
        </Card>

        <AnimalWeightCard animal={animal} />

        {animal.sex === "female" && <AnimalHeatsCard animal={animal} />}

        {/* Children Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t("animals.children")}</CardTitle>
            <CardAction>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="showDeceased"
                  checked={showDeceasedChildren}
                  onCheckedChange={(checked) =>
                    setShowDeceasedChildren(checked === true)
                  }
                />
                <Label htmlFor="showDeceased" className="text-sm font-normal">
                  {t("animals.showDeceased")}
                </Label>
                {canWriteAnimals && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAddOffspringOpen(true)}
                  >
                    {t("animals.addOffspring")}
                  </Button>
                )}
              </div>
            </CardAction>
          </CardHeader>
          <CardContent>
            {childrenQuery.isLoading ? (
              <div className="py-6 text-center text-muted-foreground">
                {t("common.loading")}
              </div>
            ) : filteredChildren && filteredChildren.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("animals.name")}</TableHead>
                    <TableHead>{t("animals.type")}</TableHead>
                    <TableHead>{t("animals.sex")}</TableHead>
                    <TableHead>{t("animals.dateOfBirth")}</TableHead>
                    {showDeceasedChildren && (
                      <TableHead>{t("animals.dateOfDeath")}</TableHead>
                    )}
                    {canWriteAnimals && <TableHead className="w-12" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredChildren.map((child) => (
                    <TableRow
                      key={child.id}
                      className="cursor-pointer"
                      onClick={() =>
                        navigate({
                          to: `/animals/$animalId`,
                          params: { animalId: child.id },
                        })
                      }
                    >
                      <TableCell>{child.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {t(`animals.types.${child.type}`)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {t(`animals.sexOptions.${child.sex}`)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {child.dateOfBirth
                          ? formatDate(child.dateOfBirth)
                          : "-"}
                      </TableCell>
                      {showDeceasedChildren && (
                        <TableCell className="text-muted-foreground">
                          {child.dateOfDeath
                            ? formatDate(child.dateOfDeath)
                            : "-"}
                        </TableCell>
                      )}
                      {canWriteAnimals && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            aria-label={t("animals.removeOffspring")}
                            disabled={removeChildMutation.isPending}
                            onClick={(event) => {
                              // Don't navigate to the child
                              event.stopPropagation();
                              removeChildMutation.mutate({
                                childId: child.id,
                                parentSex: animal.sex,
                              });
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-6 text-center text-muted-foreground">
                {t("animals.noChildren")}
              </div>
            )}
          </CardContent>
        </Card>

        {addOffspringOpen && (
          <AddOffspringDialog
            parent={animal}
            onClose={() => setAddOffspringOpen(false)}
          />
        )}

        {/* Treatments Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t("treatments.title")}</CardTitle>
            {canWriteAnimals && <CardAction>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  navigate({
                    to: "/treatments/create",
                    search: {
                      animalId: animal.id,
                      returnTo: `/animals/${animal.id}`,
                    },
                  })
                }
              >
                {t("treatments.addTreatment")}
              </Button>
            </CardAction>}
          </CardHeader>
          <CardContent>
            {animal.treatments && animal.treatments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("treatments.startDate")}</TableHead>
                    <TableHead>{t("treatments.name")}</TableHead>
                    <TableHead>{t("treatments.milkUsableDate")}</TableHead>
                    <TableHead>{t("treatments.meatUsableDate")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {animal.treatments.map((treatment) => (
                    <TableRow
                      key={treatment.id}
                      className="cursor-pointer"
                      onClick={() =>
                        navigate({
                          to: "/treatments/$treatmentId",
                          params: { treatmentId: treatment.id },
                        })
                      }
                    >
                      <TableCell>{formatDate(treatment.startDate)}</TableCell>
                      <TableCell className="font-medium">
                        {treatment.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {treatment.milkUsableDate
                          ? formatDate(treatment.milkUsableDate)
                          : "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {treatment.meatUsableDate
                          ? formatDate(treatment.meatUsableDate)
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-6 text-center text-muted-foreground">
                {t("treatments.noTreatments")}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Journal Card — members only */}
        <AnimalJournalCard animalId={animalId} />
      </div>
    </PageContent>
  );
}

function AnimalJournalCard({ animalId }: { animalId: string }) {
  const { t } = useTranslation();
  const { canWrite: canWriteAnimals } = useFeatureAccess("animals");
  const navigate = useNavigate();
  const journalQuery = useQuery(animalJournalQueryOptions(animalId));
  const entries = journalQuery.data ?? [];
  const recentEntries = [...entries]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("journal.title")}</CardTitle>
        {canWriteAnimals && <CardAction>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              navigate({
                to: "/animals/$animalId/journal/create",
                params: { animalId },
              })
            }
          >
            {t("journal.add")}
          </Button>
        </CardAction>}
      </CardHeader>
      <CardContent>
        {recentEntries.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground">
            {t("journal.noEntries")}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.date")}</TableHead>
                <TableHead>{t("common.title")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentEntries.map((entry) => (
                <TableRow
                  key={entry.id}
                  className="cursor-pointer"
                  onClick={() =>
                    navigate({
                      to: "/animals/$animalId/journal/$entryId",
                      params: { animalId, entryId: entry.id },
                    })
                  }
                >
                  <TableCell className="text-muted-foreground">
                    {new Date(entry.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="font-medium">{entry.title}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {entries.length > 5 && (
          <div className="mt-3 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                navigate({
                  to: "/animals/$animalId/journal",
                  params: { animalId },
                })
              }
            >
              {t("journal.viewAll")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm">{value}</dd>
    </div>
  );
}

// Pick existing animals as offspring: sets their motherId or fatherId to the parent,
// depending on the parent's sex. Excludes the parent itself, its ancestors and
// animals that already are its offspring.
function AddOffspringDialog({
  parent,
  onClose,
}: {
  parent: AnimalDetail;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const livingAnimalsQuery = useQuery(animalsQueryOptions(true));
  // Includes dead animals, so ancestor chains through dead animals are followed too
  const familyTreeQuery = useQuery(animalFamilyTreeQueryOptions(parent.type));

  const ancestorIds = useMemo(() => {
    const ids = new Set<string>();
    if (!familyTreeQuery.data) return ids;
    const parentIdsByChildId = new Map<string, string[]>();
    for (const edge of familyTreeQuery.data.edges) {
      const parentIds = parentIdsByChildId.get(edge.childId) ?? [];
      parentIds.push(edge.parentId);
      parentIdsByChildId.set(edge.childId, parentIds);
    }
    const toVisit = [parent.id];
    while (toVisit.length > 0) {
      const currentId = toVisit.pop()!;
      for (const parentId of parentIdsByChildId.get(currentId) ?? []) {
        if (ids.has(parentId)) continue;
        ids.add(parentId);
        toVisit.push(parentId);
      }
    }
    return ids;
  }, [familyTreeQuery.data, parent.id]);

  const candidates = useMemo(() => {
    if (!livingAnimalsQuery.data || !familyTreeQuery.data) return [];
    const existingChildIds = new Set(
      [...parent.childrenAsMother, ...parent.childrenAsFather].map(
        (child) => child.id,
      ),
    );
    return livingAnimalsQuery.data.result
      .filter(
        (candidate) =>
          candidate.type === parent.type &&
          candidate.id !== parent.id &&
          !existingChildIds.has(candidate.id) &&
          !ancestorIds.has(candidate.id),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [livingAnimalsQuery.data, familyTreeQuery.data, parent, ancestorIds]);

  const fuse = useMemo(
    () =>
      new Fuse(candidates, {
        minMatchCharLength: 1,
        keys: ["name", "earTag.number"],
      }),
    [candidates],
  );
  const visibleCandidates =
    searchText.trim().length > 0
      ? fuse.search(searchText.trim()).map((result) => result.item)
      : candidates;

  const addOffspringMutation = useMutation({
    mutationFn: async (childIds: string[]) => {
      const response = await apiClient.PATCH("/v1/animals/batch", {
        body: {
          animalIds: childIds,
          data:
            parent.sex === "female"
              ? { motherId: parent.id }
              : { fatherId: parent.id },
        },
      });
      if (response.error) {
        throw new Error("Failed to add offspring");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["animals"] });
      onClose();
    },
  });

  function toggleSelection(candidateId: string) {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(candidateId)) {
        next.delete(candidateId);
      } else {
        next.add(candidateId);
      }
      return next;
    });
  }

  const isLoading = livingAnimalsQuery.isLoading || familyTreeQuery.isLoading;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("animals.selectOffspring")}</DialogTitle>
        </DialogHeader>
        <Input
          placeholder={t("common.search")}
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
        />
        <div className="max-h-96 overflow-y-auto rounded-md border">
          {isLoading ? (
            <div className="py-6 text-center text-muted-foreground">
              {t("common.loading")}
            </div>
          ) : visibleCandidates.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground">
              {t("common.noResults")}
            </div>
          ) : (
            visibleCandidates.map((candidate) => (
              <label
                key={candidate.id}
                className="flex cursor-pointer items-center gap-3 border-b px-3 py-2 last:border-b-0 hover:bg-muted/50"
              >
                <Checkbox
                  checked={selectedIds.has(candidate.id)}
                  onCheckedChange={() => toggleSelection(candidate.id)}
                />
                <div className="flex flex-col">
                  <span className="text-sm">{candidate.name}</span>
                  {candidate.earTag && (
                    <span className="text-xs text-muted-foreground">
                      {candidate.earTag.number}
                    </span>
                  )}
                </div>
              </label>
            ))
          )}
        </div>
        <DialogFooter className="sm:justify-between">
          {/* Create a new animal with this parent preset instead of picking an existing one */}
          <Button
            variant="outline"
            onClick={() =>
              navigate({
                to: "/animals/create",
                search: {
                  type: parent.type,
                  ...(parent.sex === "female"
                    ? { motherId: parent.id }
                    : { fatherId: parent.id }),
                },
              })
            }
          >
            {t("animals.createNewOffspring")}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button
              disabled={selectedIds.size === 0 || addOffspringMutation.isPending}
              onClick={() => addOffspringMutation.mutate(Array.from(selectedIds))}
            >
              {t("common.confirm")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
