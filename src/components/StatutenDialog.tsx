import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
  onConfirm: (autoRenew: boolean) => void;
  isLoading?: boolean;
  showAutoRenewal?: boolean;
}

export function StatutenDialog({ open, onOpenChange, onConfirm, isLoading = false, showAutoRenewal = true }: StatutenDialogProps) {
  const { t } = useTranslation();
  const [accepted, setAccepted] = useState(false);
  const [autoRenew, setAutoRenew] = useState(true);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setAccepted(false);
      setAutoRenew(true);
    }
    onOpenChange(nextOpen);
  }

  function handleConfirm() {
    if (!accepted) return;
    onConfirm(autoRenew);
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

        {/* Auto-renewal toggle — hidden for trial flow */}
        {showAutoRenewal && (
          <>
            <div className="flex items-center gap-3">
              <Switch
                id="auto-renew"
                checked={autoRenew}
                onCheckedChange={setAutoRenew}
              />
              <Label htmlFor="auto-renew" className="text-sm cursor-pointer">
                {t("membership.statuten.autoRenewalLabel")}
              </Label>
            </div>
            {autoRenew && (
              <p className="text-xs text-muted-foreground -mt-1">
                {t("membership.statuten.autoRenewalNote")}
              </p>
            )}
          </>
        )}

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
