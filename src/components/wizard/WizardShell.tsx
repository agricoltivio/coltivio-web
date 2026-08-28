import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

/** Progress line ("Schritt 2 von 5 · Konfiguration") + a thin bar. */
export function WizardProgress({
  stepIndex,
  total,
  label,
}: {
  stepIndex: number;
  total: number;
  label: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        {t("common.wizardStepOf", { current: stepIndex + 1, total })}
        {" · "}
        <span className="text-foreground">{label}</span>
      </p>
      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${((stepIndex + 1) / total) * 100}%` }}
        />
      </div>
    </div>
  );
}

/** Back / Cancel on the left, Next / Save on the right. */
export function WizardNav({
  isFirst,
  isLast,
  canAdvance,
  saving,
  onBack,
  onCancel,
  onNext,
  onSave,
}: {
  isFirst: boolean;
  isLast: boolean;
  canAdvance: boolean;
  saving: boolean;
  onBack: () => void;
  onCancel: () => void;
  onNext: () => void;
  onSave: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between gap-2 pt-2">
      {isFirst ? (
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
      ) : (
        <Button type="button" variant="outline" onClick={onBack}>
          {t("common.back")}
        </Button>
      )}
      {isLast ? (
        <Button type="button" onClick={onSave} disabled={saving || !canAdvance}>
          {t("common.save")}
        </Button>
      ) : (
        <Button type="button" onClick={onNext} disabled={!canAdvance}>
          {t("common.next")}
        </Button>
      )}
    </div>
  );
}
