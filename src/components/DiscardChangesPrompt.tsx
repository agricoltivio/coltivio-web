import { useIsMutating, useQueryClient } from "@tanstack/react-query";
import { useBlocker } from "@tanstack/react-router";
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

// Asks before leaving a page with unsaved changes: in-app navigation (links, back button) gets a
// dialog, closing or reloading the tab the browser's own warning. Leaving while a save or delete is
// running doesn't ask: pages navigate away from their success callbacks, while the form is still
// "dirty". isSubmitting: for saves that don't run through a mutation.
export function DiscardChangesPrompt({
  when,
  isSubmitting = false,
}: {
  when: boolean;
  isSubmitting?: boolean;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isMutating = useIsMutating() > 0;
  const shouldBlock = when && !isMutating && !isSubmitting;

  const blocker = useBlocker({
    // Checked again at navigation time: a save started in the same tick isn't rendered yet
    shouldBlockFn: () => shouldBlock && queryClient.isMutating() === 0,
    enableBeforeUnload: shouldBlock,
    withResolver: true,
  });

  return (
    <AlertDialog
      open={blocker.status === "blocked"}
      onOpenChange={(open) => {
        if (!open && blocker.status === "blocked") blocker.reset();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("common.discardChangesTitle")}</AlertDialogTitle>
          <AlertDialogDescription>{t("common.discardChangesMessage")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive hover:bg-destructive/90"
            onClick={() => {
              if (blocker.status === "blocked") blocker.proceed();
            }}
          >
            {t("common.discard")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
