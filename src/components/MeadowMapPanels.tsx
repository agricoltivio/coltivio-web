import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import * as turf from "@turf/turf";
import { Archive, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { herdsQueryOptions } from "@/api/herds.queries";
import {
  meadowUsageQueryOptions,
  useCreateMeadowMutation,
  useDeleteMeadowMutation,
  useUpdateMeadowMutation,
} from "@/api/meadows.queries";
import type { Meadow } from "@/api/types";
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
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { meadowFenceLengthMeters } from "@/lib/meadowGeometry";
import { getCurrentAndLastStays, getHerdsWithActiveSchedules } from "@/lib/meadowUsage";
import { formatDateOnly, toLocalDateString } from "@/lib/utils";

// Meadow panel and dialogs of the plots map

export function MeadowDetailPanel({
  meadow,
  canEdit,
  onClose,
  onEditMeta,
  onEditShape,
}: {
  meadow: Meadow;
  // Edit, reshape, archive and delete need write access to animals
  canEdit: boolean;
  onClose: () => void;
  onEditMeta: () => void;
  onEditShape: () => void;
}) {
  const { t, i18n } = useTranslation();
  const usageQuery = useQuery(meadowUsageQueryOptions(meadow.id));
  // Archiving keeps all data and is reversible; the meadow leaves the map
  const archiveMutation = useUpdateMeadowMutation();
  const deleteMutation = useDeleteMeadowMutation();
  const [confirmArchive, setConfirmArchive] = useState(false);
  const { currentStays, lastEndDate } = getCurrentAndLastStays(
    usageQuery.data ?? [],
    new Date(),
  );
  const currentAnimalCount = currentStays.reduce(
    (sum, stay) => sum + stay.animalCount,
    0,
  );
  const currentHerdNames = [...new Set(currentStays.map((stay) => stay.herdName))];

  return (
    <>
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold text-base truncate pr-2">{meadow.name}</h2>
        <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-xs text-muted-foreground">{t("fieldCalendar.plots.size")}</div>
            <div>{(meadow.size / 100).toFixed(2)} a</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">{t("meadows.fenceLength")}</div>
            <div>~{Math.round(meadowFenceLengthMeters(meadow.geometry))} m</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">{t("meadows.currentAnimals")}</div>
            <div>{currentAnimalCount}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">{t("meadows.lastUsed")}</div>
            {/* Occupied right now: "now" instead of the last finished stay */}
            <div>
              {currentStays.length > 0
                ? t("meadows.lastUsedNow")
                : lastEndDate
                  ? formatDateOnly(lastEndDate, i18n.language)
                  : "–"}
            </div>
          </div>
        </div>
        {currentHerdNames.length > 0 && (
          <div>
            <div className="text-xs text-muted-foreground">{t("meadows.currentHerds")}</div>
            <div>{currentHerdNames.join(", ")}</div>
          </div>
        )}
        {meadow.additionalNotes && (
          <div>
            <div className="text-xs text-muted-foreground">{t("fieldCalendar.plots.additionalNotes")}</div>
            <div className="text-xs whitespace-pre-wrap">{meadow.additionalNotes}</div>
          </div>
        )}

        {canEdit && (
          <div className="border-t pt-3 flex flex-col gap-2">
            <Button variant="outline" size="sm" className="w-full justify-start" onClick={onEditMeta}>
              {t("common.edit")}
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start" onClick={onEditShape}>
              {t("fieldCalendar.plots.edit.editShape")}
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => setConfirmArchive(true)}>
              <Archive className="h-4 w-4" />
              {t("archive.archive")}
            </Button>
            <AlertDialog open={confirmArchive} onOpenChange={setConfirmArchive}>
              <MeadowArchiveDialogContent
                meadow={meadow}
                onArchive={() =>
                  archiveMutation.mutate(
                    { meadowId: meadow.id, body: { archived: true } },
                    { onSuccess: onClose },
                  )
                }
                isArchiving={archiveMutation.isPending}
              />
            </AlertDialog>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-start text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                  {t("common.delete")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("meadows.deleteTitle", { name: meadow.name })}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("meadows.deleteConfirm")} {t("archive.meadowDeleteHint")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                  {/* The safe alternative, offered right where data would be lost */}
                  <AlertDialogAction
                    onClick={() => setConfirmArchive(true)}
                    disabled={archiveMutation.isPending || deleteMutation.isPending}
                    className="bg-background text-foreground border hover:bg-accent"
                  >
                    {t("archive.archive")}
                  </AlertDialogAction>
                  <AlertDialogAction
                    onClick={() => deleteMutation.mutate(meadow.id, { onSuccess: onClose })}
                    disabled={deleteMutation.isPending}
                    className="bg-destructive text-white hover:bg-destructive/90"
                  >
                    {t("common.delete")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            {(archiveMutation.isError || deleteMutation.isError) && (
              <p className="text-xs text-destructive">{t("common.error")}</p>
            )}
          </div>
        )}

        <Link to="/animals/meadows/$meadowId" params={{ meadowId: meadow.id }} className="block w-full">
          <Button className="w-full" size="sm">{t("meadows.usage")}</Button>
        </Link>
      </div>
    </>
  );
}

// Confirmation for archiving a meadow. Not allowed while a herd is (or will be) on it:
// then it only says which herds still have schedules there.
function MeadowArchiveDialogContent({
  meadow,
  onArchive,
  isArchiving,
}: {
  meadow: Meadow;
  onArchive: () => void;
  isArchiving: boolean;
}) {
  const { t } = useTranslation();
  const herdsQuery = useQuery(herdsQueryOptions());
  const herdNames = getHerdsWithActiveSchedules(
    herdsQuery.data?.result ?? [],
    meadow.id,
    toLocalDateString(new Date()),
  );

  if (herdNames.length > 0) {
    return (
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("archive.meadowActiveSchedulesTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("archive.meadowActiveSchedules", { herds: herdNames.join(", ") })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.close")}</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    );
  }

  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{t("archive.meadowConfirmTitle", { name: meadow.name })}</AlertDialogTitle>
        <AlertDialogDescription>{t("archive.meadowInfo")}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
        {/* Herds still loading: wait, so an active schedule can't slip through */}
        <AlertDialogAction onClick={onArchive} disabled={isArchiving || !herdsQuery.data}>
          {t("archive.archive")}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}

// Create (with a geometry) or edit name and notes of a meadow
export function MeadowFormDialog({
  meadow,
  geometry,
  onClose,
  onSuccess,
}: {
  meadow: Meadow | null;
  geometry: GeoJSON.MultiPolygon | null;
  onClose: () => void;
  onSuccess: (meadowId: string) => void;
}) {
  const { t } = useTranslation();
  const createMutation = useCreateMeadowMutation();
  const updateMutation = useUpdateMeadowMutation();
  const [name, setName] = useState(meadow?.name ?? "");
  const [notes, setNotes] = useState(meadow?.additionalNotes ?? "");
  const area = geometry ? turf.area(geometry) : (meadow?.size ?? 0);
  const isPending = createMutation.isPending || updateMutation.isPending;

  function handleSubmit() {
    const additionalNotes = notes.trim() || null;
    if (meadow) {
      updateMutation.mutate(
        { meadowId: meadow.id, body: { name: name.trim(), additionalNotes } },
        { onSuccess: () => onSuccess(meadow.id) },
      );
      return;
    }
    if (!geometry) return;
    createMutation.mutate(
      { name: name.trim(), additionalNotes, geometry },
      { onSuccess: (created) => onSuccess(created.id) },
    );
  }

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{meadow ? t("meadows.editMeadow") : t("meadows.newMeadow")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>{t("common.name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">{t("fieldCalendar.plots.size")}</div>
            <div className="font-medium">{(area / 100).toFixed(2)} a</div>
          </div>
          <div className="space-y-1.5">
            <Label>{t("fieldCalendar.plots.additionalNotes")}</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {(createMutation.isError || updateMutation.isError) && (
            <p className="text-sm text-destructive">{t("common.error")}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || isPending}>{t("common.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
