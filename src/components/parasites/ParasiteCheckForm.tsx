import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  type Animal,
  type ParasiteCheck,
  type ParasiteCheckCreateInput,
  type ParasiteCheckMethod,
  type ParasiteType,
  type Treatment,
} from "@/api/types";
import {
  cn,
  formatDateOnly,
  parseDateOnly,
  toLocalDateString,
} from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { animalDisplayName, FamachaScoreButtons } from "./ParasiteCharts";
import {
  filledResults,
  hasDuplicateParasiteType,
  newResultRows,
  nextResultKey,
  ParasiteResultsEditor,
  type ParasiteResultDraft,
} from "./ParasiteResultsEditor";

const DEFAULT_RECHECK_DAYS = 14;
const METHODS: ParasiteCheckMethod[] = ["fecal_egg_count", "famacha"];

type SampleMode = "pooled" | "individual";

export type ParasiteCheckFormSubmit = {
  body: Omit<ParasiteCheckCreateInput, "followUp">;
  followUpDueDate: string | null;
};

function addDays(isoDate: string, days: number) {
  const date = parseDateOnly(isoDate);
  date.setDate(date.getDate() + days);
  return toLocalDateString(date);
}

function toResultRows(
  results: { parasiteType: ParasiteType; countPerGram: number }[],
): ParasiteResultDraft[] {
  return results.map((result) => ({
    key: nextResultKey(),
    parasiteType: result.parasiteType,
    countPerGram: String(result.countPerGram),
  }));
}

export function ParasiteCheckForm({
  check,
  defaults,
  animals,
  herds,
  treatments,
  checks,
  onSubmit,
  isSubmitting = false,
}: {
  // Set when editing
  check?: ParasiteCheck;
  defaults?: { previousCheckId?: string };
  // All animals incl. dead ones (for names and to leave out dead ones in re-checks)
  animals: Animal[];
  herds: { id: string; name: string }[];
  treatments: Treatment[];
  // All checks, for choosing the base check of a re-check
  checks: ParasiteCheck[];
  onSubmit: (submit: ParasiteCheckFormSubmit) => void;
  isSubmitting?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const isEditing = !!check;

  const [method, setMethod] = useState<ParasiteCheckMethod>(
    check?.method ?? "fecal_egg_count",
  );
  const [date, setDate] = useState(
    check ? check.date.slice(0, 10) : toLocalDateString(new Date()),
  );
  // Only used to preselect a herd's animals, not stored with the check
  const [herdId, setHerdId] = useState("");
  const [animalIds, setAnimalIds] = useState<string[]>(
    check?.animals.map((checkAnimal) => checkAnimal.animalId) ?? [],
  );
  const [famachaScores, setFamachaScores] = useState<
    Record<string, number | null>
  >(
    Object.fromEntries(
      (check?.animals ?? []).map((checkAnimal) => [
        checkAnimal.animalId,
        checkAnimal.famachaScore,
      ]),
    ),
  );
  const [previousCheckId, setPreviousCheckId] = useState(
    check?.previousCheckId ?? defaults?.previousCheckId ?? "",
  );
  const [treatmentId, setTreatmentId] = useState(check?.treatmentId ?? "");
  const [name, setName] = useState(check?.name ?? "");
  const [notes, setNotes] = useState(check?.notes ?? "");
  const [labName, setLabName] = useState(check?.labName ?? "");

  // Lab results: one pooled sample for all animals or one sample per animal
  const existingPooledSample = check?.fecSamples.find(
    (sample) => sample.pooled,
  );
  const [sampleMode, setSampleMode] = useState<SampleMode>(
    check && check.fecSamples.length > 0 && !existingPooledSample
      ? "individual"
      : "pooled",
  );
  const [pooledLabel, setPooledLabel] = useState(
    existingPooledSample?.label ?? "",
  );
  const [pooledResults, setPooledResults] = useState<ParasiteResultDraft[]>(
    () =>
      existingPooledSample
        ? toResultRows(existingPooledSample.results)
        : newResultRows(),
  );
  // Keyed by animal, so an animal has one sample; animals without entry show an empty row
  const [individualResults, setIndividualResults] = useState<
    Record<string, ParasiteResultDraft[]>
  >(() =>
    Object.fromEntries(
      (check?.fecSamples ?? [])
        .filter((sample) => !sample.pooled)
        .map((sample) => [sample.animalIds[0], toResultRows(sample.results)]),
    ),
  );
  // Stable empty rows for animals that have no results yet
  const [emptyRowsByAnimal] = useState(
    () => new Map<string, ParasiteResultDraft[]>(),
  );
  function animalResultRows(animalId: string) {
    const rows = individualResults[animalId];
    if (rows) return rows;
    const emptyRows = emptyRowsByAnimal.get(animalId) ?? newResultRows();
    emptyRowsByAnimal.set(animalId, emptyRows);
    return emptyRows;
  }

  const [followUpEnabled, setFollowUpEnabled] = useState(false);
  const [followUpDate, setFollowUpDate] = useState(
    addDays(toLocalDateString(new Date()), DEFAULT_RECHECK_DAYS),
  );
  const [followUpDateTouched, setFollowUpDateTouched] = useState(false);
  // Re-check date follows the check date until the user picks one
  useEffect(() => {
    if (!followUpDateTouched)
      setFollowUpDate(addDays(date, DEFAULT_RECHECK_DAYS));
  }, [date, followUpDateTouched]);

  const animalsById = useMemo(
    () => new Map(animals.map((animal) => [animal.id, animal])),
    [animals],
  );

  // A re-check repeats its base check: method and animals are taken over and
  // fixed. Animals that died before the re-check date are left out.
  const baseCheck = previousCheckId
    ? checks.find((otherCheck) => otherCheck.id === previousCheckId)
    : undefined;
  useEffect(() => {
    // Editing keeps the stored animals; only base checks that fit are offered there
    if (isEditing || !baseCheck) return;
    setMethod(baseCheck.method);
    // A re-check cannot be dated before its base check
    const baseDate = baseCheck.date.slice(0, 10);
    if (date < baseDate) setDate(baseDate);
    setAnimalIds(
      baseCheck.animals
        .map((baseAnimal) => baseAnimal.animalId)
        .filter((animalId) => {
          const animal = animalsById.get(animalId);
          return (
            animal !== undefined &&
            (!animal.dateOfDeath ||
              parseDateOnly(animal.dateOfDeath) > parseDateOnly(date))
          );
        }),
    );
  }, [isEditing, baseCheck, animalsById, date]);

  // A base check with re-checks cannot be dated after its first re-check
  const earliestRecheckDate = check?.rechecks.length
    ? check.rechecks.map((recheck) => recheck.date.slice(0, 10)).sort()[0]
    : undefined;

  // A base check with re-checks keeps its animals (method is fixed when editing anyway)
  const isLockedBaseCheck = (check?.rechecks.length ?? 0) > 0;

  function handleHerdChange(newHerdId: string) {
    setHerdId(newHerdId);
    if (!newHerdId) return;
    // Prefill with the herd's living animals, can be adjusted afterwards
    setAnimalIds(
      animals
        .filter((animal) => animal.herdId === newHerdId && !animal.dateOfDeath)
        .map((animal) => animal.id),
    );
  }

  function animalLabel(animalId: string) {
    const animal = animalsById.get(animalId);
    return animal ? animalDisplayName(animal.name, animal.earTag?.number) : "…";
  }

  // Once animals are selected, only animals of the same type can be added
  const selectedAnimalType = animalIds
    .map((animalId) => animalsById.get(animalId)?.type)
    .find((type) => type !== undefined);
  const animalOptions = animals
    .filter((animal) => !animal.dateOfDeath || animalIds.includes(animal.id))
    .filter(
      (animal) => !selectedAnimalType || animal.type === selectedAnimalType,
    )
    .map((animal) => ({
      value: animal.id,
      label: `${animalDisplayName(animal.name, animal.earTag?.number)} (${t(`animals.types.${animal.type}`)})`,
    }));

  // Re-checks always point to an earlier base check, never to another re-check
  const previousCheckOptions = checks.filter(
    (otherCheck) =>
      otherCheck.id !== check?.id &&
      otherCheck.previousCheckId === null &&
      // When editing, only base checks the stored check already fits, so nothing
      // gets overwritten or dropped
      (!isEditing ||
        (otherCheck.method === method &&
          animalIds.every((animalId) =>
            otherCheck.animals.some(
              (baseAnimal) => baseAnimal.animalId === animalId,
            ),
          ))),
  );
  // A base check with re-checks cannot become a re-check itself
  const canBeRecheck = !check || check.rechecks.length === 0;

  const sortedTreatments = [...treatments].sort((a, b) =>
    b.startDate.localeCompare(a.startDate),
  );

  // Duplicate parasite types in a sample are rejected by the API
  const hasInvalidResults =
    method === "fecal_egg_count" &&
    (sampleMode === "pooled"
      ? hasDuplicateParasiteType(pooledResults)
      : animalIds.some((animalId) =>
          hasDuplicateParasiteType(individualResults[animalId]),
        ));

  // A check only contains one animal type (the API rejects mixed checks)
  const hasMixedAnimalTypes =
    new Set(animalIds.map((animalId) => animalsById.get(animalId)?.type)).size >
    1;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    // Pooled: one sample for all animals. Individual: one sample per animal with results.
    const fecSamples =
      method !== "fecal_egg_count"
        ? []
        : sampleMode === "pooled"
          ? filledResults(pooledResults).length > 0
            ? [
                {
                  label: pooledLabel || null,
                  animalIds,
                  results: filledResults(pooledResults),
                },
              ]
            : []
          : animalIds.flatMap((animalId) => {
              const results = filledResults(individualResults[animalId]);
              return results.length > 0
                ? [{ label: null, animalIds: [animalId], results }]
                : [];
            });

    onSubmit({
      body: {
        date,
        method,
        animals: animalIds.map((animalId) => ({
          animalId,
          famachaScore:
            method === "famacha" ? (famachaScores[animalId] ?? null) : null,
        })),
        fecSamples,
        labName: method === "fecal_egg_count" ? labName || null : null,
        name: name.trim() || null,
        notes: notes || null,
        treatmentId: treatmentId || null,
        previousCheckId: previousCheckId || null,
      },
      followUpDueDate: !isEditing && followUpEnabled ? followUpDate : null,
    });
  }

  const selectClass =
    "w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60";

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl space-y-7">
      {/* Method */}
      <div className="inline-flex rounded-lg border p-1">
        {METHODS.map((methodOption) => (
          <button
            key={methodOption}
            type="button"
            disabled={isEditing || !!baseCheck}
            onClick={() => setMethod(methodOption)}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium disabled:cursor-not-allowed",
              method === methodOption
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground",
            )}
          >
            {t(`parasiteChecks.methods.${methodOption}`)}
          </button>
        ))}
      </div>
      {baseCheck && (
        <p className="text-sm text-muted-foreground">
          {t("parasiteChecks.recheckLockedInfo")}
        </p>
      )}

      <Field className="max-w-lg">
        <FieldLabel htmlFor="name">
          {t("parasiteChecks.nameOptional")}
        </FieldLabel>
        <Input
          id="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </Field>

      <FieldGroup className="flex-row items-end">
        <Field className="max-w-48">
          <FieldLabel htmlFor="date">{t("common.date")} *</FieldLabel>
          <Input
            id="date"
            type="date"
            required
            // A re-check comes after its base check, a base check before its re-checks
            min={baseCheck ? baseCheck.date.slice(0, 10) : undefined}
            max={earliestRecheckDate}
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </Field>
        {/* Preselects the herd's living animals; only for new selections */}
        {!baseCheck && !isLockedBaseCheck && (
          <Field className="max-w-64">
            <FieldLabel htmlFor="herdId">
              {t("parasiteChecks.selectFromHerd")}
            </FieldLabel>
            <select
              id="herdId"
              className={selectClass}
              value={herdId}
              onChange={(event) => handleHerdChange(event.target.value)}
            >
              <option value="">-</option>
              {herds.map((herd) => (
                <option key={herd.id} value={herd.id}>
                  {herd.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        {canBeRecheck && (
          <Field className="max-w-72">
            <FieldLabel htmlFor="previousCheckId">
              {t("parasiteChecks.previousCheckOptional")}
            </FieldLabel>
            <select
              id="previousCheckId"
              className={selectClass}
              value={previousCheckId}
              onChange={(event) => setPreviousCheckId(event.target.value)}
            >
              <option value="">-</option>
              {previousCheckOptions.map((otherCheck) => (
                <option key={otherCheck.id} value={otherCheck.id}>
                  {[
                    t(`parasiteChecks.methods.${otherCheck.method}`),
                    formatDateOnly(otherCheck.date, locale),
                    otherCheck.name,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </option>
              ))}
            </select>
          </Field>
        )}
      </FieldGroup>

      {/* Animals (fixed for re-checks) */}
      {baseCheck || isLockedBaseCheck ? (
        <p className="text-sm">
          {t("parasiteChecks.nAnimals", { count: animalIds.length })}
        </p>
      ) : (
        <Field>
          <FieldLabel>{t("parasiteChecks.animals")} *</FieldLabel>
          <MultiSelect
            options={animalOptions}
            value={animalIds}
            onValueChange={setAnimalIds}
            placeholder={t("parasiteChecks.selectAnimals")}
            searchPlaceholder={t("common.search")}
            emptyText={t("common.noResults")}
          />
        </Field>
      )}

      {hasMixedAnimalTypes && (
        <p className="text-sm text-destructive">
          {t("parasiteChecks.mixedAnimalTypes")}
        </p>
      )}

      {/* FAMACHA scores per animal */}
      {method === "famacha" && animalIds.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium">{t("parasiteChecks.famachaScores")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("parasiteChecks.famachaScoresInfo")}
          </p>
          <Table>
            <TableBody>
              {animalIds.map((animalId) => (
                <TableRow key={animalId}>
                  <TableCell className="font-medium">
                    {animalLabel(animalId)}
                  </TableCell>
                  <TableCell className="w-56">
                    <FamachaScoreButtons
                      value={famachaScores[animalId] ?? null}
                      onChange={(score) =>
                        setFamachaScores((current) => ({
                          ...current,
                          [animalId]: score,
                        }))
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Lab results */}
      {method === "fecal_egg_count" && animalIds.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium">{t("parasiteChecks.samples")}</h3>
          <div className="flex flex-wrap items-end gap-4">
            <div className="inline-flex rounded-lg border p-1">
              {(["pooled", "individual"] satisfies SampleMode[]).map(
                (modeOption) => (
                  <button
                    key={modeOption}
                    type="button"
                    onClick={() => setSampleMode(modeOption)}
                    className={cn(
                      "rounded-md px-3 py-1 text-sm",
                      sampleMode === modeOption
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {t(`parasiteChecks.sampleModes.${modeOption}`)}
                  </button>
                ),
              )}
            </div>
            <Field className="max-w-64">
              <FieldLabel htmlFor="labName">
                {t("parasiteChecks.labName")}
              </FieldLabel>
              <Input
                id="labName"
                value={labName}
                onChange={(event) => setLabName(event.target.value)}
              />
            </Field>
            {sampleMode === "pooled" && (
              <Field className="max-w-64">
                <FieldLabel htmlFor="pooledLabel">
                  {t("parasiteChecks.sampleLabel")}
                </FieldLabel>
                <Input
                  id="pooledLabel"
                  value={pooledLabel}
                  onChange={(event) => setPooledLabel(event.target.value)}
                />
              </Field>
            )}
          </div>
          {sampleMode === "individual" && (
            <p className="text-sm text-muted-foreground">
              {t("parasiteChecks.individualInfo")}
            </p>
          )}

          {sampleMode === "pooled" ? (
            <div className="max-w-xl">
              <p className="mb-2 text-sm font-medium">
                {t("parasiteChecks.pooledSample", { count: animalIds.length })}
              </p>
              <ParasiteResultsEditor
                results={pooledResults}
                onChange={setPooledResults}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {animalIds.map((animalId) => (
                <div key={animalId}>
                  <p className="mb-2 text-sm font-medium">
                    {animalLabel(animalId)}
                  </p>
                  <ParasiteResultsEditor
                    results={animalResultRows(animalId)}
                    onChange={(rows) =>
                      setIndividualResults((current) => ({
                        ...current,
                        [animalId]: rows,
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <FieldGroup>
        <Field className="max-w-lg">
          <FieldLabel htmlFor="treatmentId">
            {t("parasiteChecks.treatmentOptional")}
          </FieldLabel>
          <select
            id="treatmentId"
            className={selectClass}
            value={treatmentId}
            onChange={(event) => setTreatmentId(event.target.value)}
          >
            <option value="">-</option>
            {sortedTreatments.map((treatment) => (
              <option key={treatment.id} value={treatment.id}>
                {treatment.name} · {formatDateOnly(treatment.startDate, locale)}
              </option>
            ))}
          </select>
        </Field>
        <Field className="max-w-lg">
          <FieldLabel htmlFor="notes">{t("parasiteChecks.notes")}</FieldLabel>
          <Textarea
            id="notes"
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </Field>
      </FieldGroup>

      {/* Re-check reminder (create only) */}
      {!isEditing && (
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="followUp"
              checked={followUpEnabled}
              onCheckedChange={(checked) =>
                setFollowUpEnabled(checked === true)
              }
            />
            <Label htmlFor="followUp">
              {t("parasiteChecks.createFollowUpTask")}
            </Label>
          </div>
          {followUpEnabled && (
            <Input
              type="date"
              className="max-w-48"
              min={date}
              value={followUpDate}
              onChange={(event) => {
                setFollowUpDateTouched(true);
                setFollowUpDate(event.target.value);
              }}
            />
          )}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="submit"
          disabled={
            isSubmitting ||
            animalIds.length === 0 ||
            hasInvalidResults ||
            hasMixedAnimalTypes
          }
        >
          {t("common.save")}
        </Button>
      </div>
    </form>
  );
}
