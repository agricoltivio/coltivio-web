import { Archive } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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

// Shown for an archived plot or meadow, with a way to restore it. Restoring asks first:
// areas added on the same ground since archiving may overlap the restored one.
export function ArchivedNotice({
  kind,
  name,
  archivedAt,
  onRestore,
  isRestoring,
  restoreFailed,
}: {
  kind: "plot" | "meadow";
  name: string;
  archivedAt: string;
  onRestore: () => void;
  isRestoring: boolean;
  restoreFailed: boolean;
}) {
  const { t, i18n } = useTranslation();

  return (
    <Alert className="mb-6">
      <Archive />
      <AlertTitle>
        {t("archive.archivedSince", {
          date: new Date(archivedAt).toLocaleDateString(i18n.language),
        })}
      </AlertTitle>
      <AlertDescription>
        <p>{t("archive.archivedInfo")}</p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={isRestoring}>
              {isRestoring ? t("common.loading") : t("archive.restore")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {kind === "plot"
                  ? t("archive.plotRestoreTitle", { name })
                  : t("archive.meadowRestoreTitle", { name })}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {kind === "plot"
                  ? t("archive.plotRestoreWarning")
                  : t("archive.meadowRestoreWarning")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={onRestore}>{t("archive.restore")}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {restoreFailed && <p className="text-destructive">{t("common.error")}</p>}
      </AlertDescription>
    </Alert>
  );
}
