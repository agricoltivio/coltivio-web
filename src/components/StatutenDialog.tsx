import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface StatutenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function StatutenDialog({ open, onOpenChange, onConfirm, isLoading = false }: StatutenDialogProps) {
  const { t } = useTranslation();
  const [accepted, setAccepted] = useState(false);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setAccepted(false);
    onOpenChange(nextOpen);
  }

  function handleConfirm() {
    if (!accepted) return;
    onConfirm();
  }

  // The statutes text is always displayed in German (legal document).
  // We retrieve it from de namespace directly via i18n, falling back to the key.
  const statutenText = t("membership.statuten.text");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("membership.statuten.title")}</DialogTitle>
        </DialogHeader>

        {/* Scrollable statutes — fixed height so checkbox is always visible */}
        <div className="max-h-64 overflow-y-auto border rounded p-4 text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
          {statutenText}
        </div>

        {/* Acceptance checkbox — always visible below the scroll area */}
        <div className="flex items-center gap-3 pt-1">
          <Checkbox
            id="statuten-accept"
            checked={accepted}
            onCheckedChange={(checked) => setAccepted(checked === true)}
          />
          <Label htmlFor="statuten-accept" className="text-sm cursor-pointer">
            {t("membership.statuten.acceptLabel")}
          </Label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleConfirm} disabled={!accepted || isLoading}>
            {isLoading ? t("common.loading") : t("membership.statuten.confirmButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
