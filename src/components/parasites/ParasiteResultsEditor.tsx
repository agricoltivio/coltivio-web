import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import {
  PARASITE_RESULT_GRADES,
  PARASITE_TYPES,
  type ParasiteResult,
  type ParasiteResultGrade,
  type ParasiteType,
} from "@/api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parasiteCountUnitKey } from "./ParasiteCharts";

// A result is entered either as a count or as a grade (+/++/+++)
export type ParasiteResultDraft = {
  key: string;
  parasiteType: ParasiteType;
  useGrade: boolean;
  // As typed; empty or not a number means no result
  countPerGram: string;
  grade: ParasiteResultGrade | null;
};

type FilledResult = {
  parasiteType: ParasiteType;
  countPerGram?: number;
  grade?: ParasiteResultGrade;
};

// Labs usually report these only as + / ++ / +++ (or tapeworm eggs detected)
const GRADED_BY_DEFAULT: ParasiteType[] = ["coccidia", "lungworm", "moniezia"];

let resultKeyCounter = 0;
export function nextResultKey() {
  resultKeyCounter += 1;
  return `result-${resultKeyCounter}`;
}

export function newResultDraft(
  parasiteType: ParasiteType,
): ParasiteResultDraft {
  return {
    key: nextResultKey(),
    parasiteType,
    useGrade: GRADED_BY_DEFAULT.includes(parasiteType),
    countPerGram: "",
    // A graded row always has a value; "–" (negative) until something is found
    grade: "negative",
  };
}

// A new sample starts with one empty row for the most common parasite
export function newResultRows(): ParasiteResultDraft[] {
  return [newResultDraft("strongyles")];
}

export function toResultDrafts(
  results: ParasiteResult[],
): ParasiteResultDraft[] {
  return results.map((result) => ({
    key: nextResultKey(),
    parasiteType: result.parasiteType,
    useGrade: result.grade !== null,
    countPerGram:
      result.countPerGram !== null ? String(result.countPerGram) : "",
    grade: result.grade,
  }));
}

// Rows with a valid entered value only (a grade, or a count; "." is not a number)
export function filledResults(
  results: ParasiteResultDraft[] | undefined,
): FilledResult[] {
  return (results ?? []).flatMap((result): FilledResult[] => {
    if (result.useGrade) {
      return result.grade
        ? [{ parasiteType: result.parasiteType, grade: result.grade }]
        : [];
    }
    const countPerGram =
      result.countPerGram === "" ? NaN : Number(result.countPerGram);
    return Number.isFinite(countPerGram)
      ? [{ parasiteType: result.parasiteType, countPerGram }]
      : [];
  });
}

export function hasDuplicateParasiteType(
  results: ParasiteResultDraft[] | undefined,
) {
  const types = (results ?? []).map((result) => result.parasiteType);
  return new Set(types).size !== types.length;
}

// Editable list of parasite / result rows of one sample, same as in the app
export function ParasiteResultsEditor({
  results,
  onChange,
}: {
  results: ParasiteResultDraft[];
  onChange: (results: ParasiteResultDraft[]) => void;
}) {
  const { t } = useTranslation();

  function updateResult(
    resultKey: string,
    change: Partial<ParasiteResultDraft>,
  ) {
    onChange(
      results.map((result) =>
        result.key === resultKey ? { ...result, ...change } : result,
      ),
    );
  }

  function addResult() {
    // Suggest the first parasite type not yet used in this sample
    const usedTypes = new Set(results.map((result) => result.parasiteType));
    const nextType =
      PARASITE_TYPES.find((type) => !usedTypes.has(type)) ?? "other";
    onChange([...results, newResultDraft(nextType)]);
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
                if (!matchingType) return;
                // An empty row switches to the usual result kind of the parasite
                const isEmpty =
                  result.countPerGram === "" &&
                  (result.grade === null || result.grade === "negative");
                updateResult(result.key, {
                  parasiteType: matchingType,
                  ...(isEmpty
                    ? { useGrade: newResultDraft(matchingType).useGrade }
                    : {}),
                });
              }}
            >
              {PARASITE_TYPES.map((parasiteType) => (
                <option key={parasiteType} value={parasiteType}>
                  {t(`parasiteChecks.parasiteTypes.${parasiteType}`)}
                </option>
              ))}
            </select>
            {/* Value and its unit as one group; the unit decides whether the
                value is a count (EpG/OpG/LpG) or a grade (+/++/+++) */}
            <div className="flex">
              {result.useGrade ? (
                <select
                  aria-label={t("parasiteChecks.grade")}
                  className="w-28 rounded-l-md border bg-background px-2 py-2 text-sm"
                  value={result.grade ?? "negative"}
                  onChange={(event) =>
                    updateResult(result.key, {
                      grade:
                        PARASITE_RESULT_GRADES.find(
                          (grade) => grade === event.target.value,
                        ) ?? "negative",
                    })
                  }
                >
                  {PARASITE_RESULT_GRADES.map((grade) => (
                    <option key={grade} value={grade}>
                      {t(`parasiteChecks.grades.${grade}`)}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  type="number"
                  min={0}
                  step="any"
                  className="w-28 rounded-r-none"
                  aria-label={t(parasiteCountUnitKey(result.parasiteType))}
                  value={result.countPerGram}
                  onChange={(event) =>
                    updateResult(result.key, {
                      countPerGram: event.target.value,
                    })
                  }
                />
              )}
              <select
                aria-label={t("parasiteChecks.resultKind")}
                className="-ml-px rounded-r-md border bg-muted px-2 py-2 text-xs text-muted-foreground"
                value={result.useGrade ? "grade" : "count"}
                onChange={(event) =>
                  updateResult(result.key, {
                    useGrade: event.target.value === "grade",
                    grade: result.grade ?? "negative",
                  })
                }
              >
                <option value="count">
                  {t(parasiteCountUnitKey(result.parasiteType))}
                </option>
                <option value="grade">{t("parasiteChecks.grade")}</option>
              </select>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t("common.delete")}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() =>
                onChange(
                  results.filter(
                    (currentResult) => currentResult.key !== result.key,
                  ),
                )
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
        <p className="text-sm text-destructive">
          {t("parasiteChecks.duplicateParasiteType")}
        </p>
      )}
    </div>
  );
}
