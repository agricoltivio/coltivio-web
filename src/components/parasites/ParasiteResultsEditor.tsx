import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import { PARASITE_TYPES, type ParasiteType } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parasiteCountUnitKey } from "./ParasiteCharts";

export type ParasiteResultDraft = {
  key: string;
  parasiteType: ParasiteType;
  // As typed; empty or not a number means no result
  countPerGram: string;
};

let resultKeyCounter = 0;
export function nextResultKey() {
  resultKeyCounter += 1;
  return `result-${resultKeyCounter}`;
}

// A new sample starts with one empty row for the most common parasite
export function newResultRows(): ParasiteResultDraft[] {
  return [{ key: nextResultKey(), parasiteType: "strongyles", countPerGram: "" }];
}

// Rows with a valid entered value only (e.g. "." is not a number)
export function filledResults(results: ParasiteResultDraft[] | undefined) {
  return (results ?? []).flatMap((result) => {
    const countPerGram = result.countPerGram === "" ? NaN : Number(result.countPerGram);
    return Number.isFinite(countPerGram)
      ? [{ parasiteType: result.parasiteType, countPerGram }]
      : [];
  });
}

export function hasDuplicateParasiteType(results: ParasiteResultDraft[] | undefined) {
  const types = (results ?? []).map((result) => result.parasiteType);
  return new Set(types).size !== types.length;
}

// Editable list of parasite / count rows of one sample, same as in the app
export function ParasiteResultsEditor({
  results,
  onChange,
}: {
  results: ParasiteResultDraft[];
  onChange: (results: ParasiteResultDraft[]) => void;
}) {
  const { t } = useTranslation();

  function updateResult(resultKey: string, change: Partial<ParasiteResultDraft>) {
    onChange(
      results.map((result) => (result.key === resultKey ? { ...result, ...change } : result)),
    );
  }

  function addResult() {
    // Suggest the first parasite type not yet used in this sample
    const usedTypes = new Set(results.map((result) => result.parasiteType));
    const nextType = PARASITE_TYPES.find((type) => !usedTypes.has(type)) ?? "other";
    onChange([...results, { key: nextResultKey(), parasiteType: nextType, countPerGram: "" }]);
  }

  return (
    <div className="space-y-2">
      <div className="divide-y rounded-md border">
        {results.map((result) => (
          <div key={result.key} className="flex items-center gap-2 p-2">
            <select
              aria-label={t("parasiteChecks.parasiteType")}
              className="min-w-0 flex-1 truncate rounded-md border bg-background px-3 py-2 text-sm"
              value={result.parasiteType}
              onChange={(event) => {
                const matchingType = PARASITE_TYPES.find(
                  (type) => type === event.target.value,
                );
                if (matchingType) updateResult(result.key, { parasiteType: matchingType });
              }}
            >
              {PARASITE_TYPES.map((parasiteType) => (
                <option key={parasiteType} value={parasiteType}>
                  {t(`parasiteChecks.parasiteTypes.${parasiteType}`)}
                </option>
              ))}
            </select>
            <Input
              type="number"
              min={0}
              step="any"
              className="w-28"
              aria-label={t(parasiteCountUnitKey(result.parasiteType))}
              value={result.countPerGram}
              onChange={(event) =>
                updateResult(result.key, { countPerGram: event.target.value })
              }
            />
            <span className="w-10 text-xs text-muted-foreground">
              {t(parasiteCountUnitKey(result.parasiteType))}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t("common.delete")}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() =>
                onChange(results.filter((currentResult) => currentResult.key !== result.key))
              }
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <button
          type="button"
          onClick={addResult}
          className="flex w-full items-center gap-2 p-2 text-sm font-medium text-primary hover:bg-accent"
        >
          <Plus className="size-4" />
          {t("parasiteChecks.addParasite")}
        </button>
      </div>
      {hasDuplicateParasiteType(results) && (
        <p className="text-sm text-destructive">{t("parasiteChecks.duplicateParasiteType")}</p>
      )}
    </div>
  );
}
