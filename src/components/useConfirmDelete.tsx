import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
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

type PendingDelete = { onConfirm: () => void; message?: string };

// Asks before deleting: confirmDelete(() => deleteMutation.mutate(id)) opens the dialog, which has to
// be rendered once by the component ({confirmDeleteDialog}). message: what gets lost, when more than
// the default "can't be undone".
export function useConfirmDelete(): {
  confirmDelete: (onConfirm: () => void, message?: string) => void;
  confirmDeleteDialog: ReactNode;
} {
  const { t } = useTranslation();
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  const confirmDeleteDialog = (
    <AlertDialog
      open={pendingDelete !== null}
      onOpenChange={(open) => {
        if (!open) setPendingDelete(null);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("common.deleteConfirmTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {pendingDelete?.message ?? t("common.deleteConfirmMessage")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive hover:bg-destructive/90"
            onClick={() => {
              pendingDelete?.onConfirm();
              setPendingDelete(null);
            }}
          >
            {t("common.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return {
    confirmDelete: (onConfirm, message) => setPendingDelete({ onConfirm, message }),
    confirmDeleteDialog,
  };
}
