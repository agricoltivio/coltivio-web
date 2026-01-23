import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { animalQueryOptions } from "@/api/animals.queries";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
  component: AnimalDetailPage,
});

function AnimalDetailPage() {
  const { t } = useTranslation();
  const { animalId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDeceasedChildren, setShowDeceasedChildren] = useState(false);

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
    <PageContent title={animal.name} showBackButton>
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
            <Link to="/animals/$animalId/edit" params={{ animalId }}>
              {t("common.edit")}
            </Link>
          </Button>
          <AlertDialog>
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
          </AlertDialog>
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
                value={formatDate(animal.dateOfBirth)}
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
                      className="hover:underline text-blue-600 hover:text-blue-800"
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
                      className="hover:underline text-blue-600 hover:text-blue-800"
                    >
                      {animal.father.name}
                    </Link>
                  ) : (
                    t("animals.noFather")
                  )
                }
              />
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
          </CardContent>
        </Card>

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
                        {formatDate(child.dateOfBirth)}
                      </TableCell>
                      {showDeceasedChildren && (
                        <TableCell className="text-muted-foreground">
                          {child.dateOfDeath
                            ? formatDate(child.dateOfDeath)
                            : "-"}
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
      </div>
    </PageContent>
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
