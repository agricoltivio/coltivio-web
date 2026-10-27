import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import {
  PARASITE_TYPES,
  type Animal,
  type ParasiteCheck,
  type ParasiteCheckCreateInput,
  type ParasiteCheckMethod,
  type ParasiteType,
  type Treatment,
} from "@/api/types";
import { cn, formatDateOnly, parseDateOnly, toLocalDateString } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  animalDisplayName,
  FamachaScoreButtons,
  parasiteCountUnitKey,
} from "./ParasiteCharts";

const DEFAULT_RECHECK_DAYS = 14;
const METHODS: ParasiteCheckMethod[] = ["fecal_egg_count", "famacha"];

type SampleMode = "pooled" | "individual";
// Entered counts per parasite type, as typed (empty = no result)
type CountInputs = Partial<Record<ParasiteType, string>>;

export type ParasiteCheckFormSubmit = {
  body: Omit<ParasiteCheckCreateInput, "followUp">;
  followUpDueDate: string | null;
};

function addDays(isoDate: string, days: number) {
  const date = parseDateOnly(isoDate);
  date.setDate(date.getDate() + days);
  return toLocalDateString(date);
}

function filledResults(inputs: CountInputs | undefined) {
  return PARASITE_TYPES.flatMap((parasiteType) => {
    const input = inputs?.[parasiteType];
    // Empty or not a number (e.g. ".") means no result
    const countPerGram = input === undefined || input === "" ? NaN : Number(input);
    return Number.isFinite(countPerGram) ? [{ parasiteType, countPerGram }] : [];
  });
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
  defaults?: { herdId?: string; previousCheckId?: string };
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
  const [herdId, setHerdId] = useState(check?.herdId ?? defaults?.herdId ?? "");
  const [animalIds, setAnimalIds] = useState<string[]>(
    check?.animals.map((checkAnimal) => checkAnimal.animalId) ?? [],
  );
  const [famachaScores, setFamachaScores] = useState<Record<string, number | null>>(
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
  const [notes, setNotes] = useState(check?.notes ?? "");
  const [labName, setLabName] = useState(check?.labName ?? "");

  // Lab results: one pooled sample for all animals or one sample per animal
  const existingPooledSample = check?.fecSamples.find((sample) => sample.pooled);
  const [sampleMode, setSampleMode] = useState<SampleMode>(
    check && check.fecSamples.length > 0 && !existingPooledSample
      ? "individual"
      : "pooled",
  );
  const [pooledLabel, setPooledLabel] = useState(existingPooledSample?.label ?? "");
  const [pooledInputs, setPooledInputs] = useState<CountInputs>(
    Object.fromEntries(
      (existingPooledSample?.results ?? []).map((result) => [
        result.parasiteType,
        String(result.countPerGram),
      ]),
    ),
  );
  const [individualInputs, setIndividualInputs] = useState<Record<string, CountInputs>>(
    Object.fromEntries(
      (check?.fecSamples ?? [])
        .filter((sample) => !sample.pooled)
        .map((sample) => [
          sample.animalIds[0],
          Object.fromEntries(
            sample.results.map((result) => [
              result.parasiteType,
              String(result.countPerGram),
            ]),
          ),
        ]),
    ),
  );
  // Parasite columns of the results table
  const [parasiteColumns, setParasiteColumns] = useState<ParasiteType[]>(() => {
    const usedTypes = new Set(
      (check?.fecSamples ?? []).flatMap((sample) =>
        sample.results.map((result) => result.parasiteType),
      ),
    );
    return usedTypes.size > 0
      ? PARASITE_TYPES.filter((parasiteType) => usedTypes.has(parasiteType))
      : ["strongyles"];
  });

  const [followUpEnabled, setFollowUpEnabled] = useState(false);
  const [followUpDate, setFollowUpDate] = useState(
    addDays(toLocalDateString(new Date()), DEFAULT_RECHECK_DAYS),
  );
  const [followUpDateTouched, setFollowUpDateTouched] = useState(false);
  // Re-check date follows the check date until the user picks one
  useEffect(() => {
    if (!followUpDateTouched) setFollowUpDate(addDays(date, DEFAULT_RECHECK_DAYS));
  }, [date, followUpDateTouched]);

  const animalsById = useMemo(
    () => new Map(animals.map((animal) => [animal.id, animal])),
    [animals],
  );

  // A re-check repeats its base check: method, herd and animals are taken over
  // and fixed. Animals that died before the re-check date are left out.
  const baseCheck = previousCheckId
    ? checks.find((otherCheck) => otherCheck.id === previousCheckId)
    : undefined;
  useEffect(() => {
    // Editing keeps the stored animals; only base checks that fit are offered there
    if (isEditing || !baseCheck) return;
    setMethod(baseCheck.method);
    setHerdId(baseCheck.herdId ?? "");
    // Left out: animals that died before the re-check date or left the herd
    setAnimalIds(
      baseCheck.animals
        .map((baseAnimal) => baseAnimal.animalId)
        .filter((animalId) => {
          const animal = animalsById.get(animalId);
          return (
            animal !== undefined &&
            (!animal.dateOfDeath || parseDateOnly(animal.dateOfDeath) > parseDateOnly(date)) &&
            (!baseCheck.herdId || animal.herdId === baseCheck.herdId)
          );
        }),
    );
  }, [isEditing, baseCheck, animalsById, date]);

  // A base check with re-checks keeps its herd and animals (method is fixed when editing anyway)
  const isLockedBaseCheck = (check?.rechecks.length ?? 0) > 0;

  // Started for a herd (e.g. from the herd overview): prefill its living animals
  const [prefilledFromHerd, setPrefilledFromHerd] = useState(false);
  useEffect(() => {
    if (isEditing || prefilledFromHerd || !defaults?.herdId || defaults.previousCheckId) return;
    setPrefilledFromHerd(true);
    setAnimalIds(
      animals
        .filter((animal) => animal.herdId === defaults.herdId && !animal.dateOfDeath)
        .map((animal) => animal.id),
    );
  }, [isEditing, prefilledFromHerd, defaults, animals]);

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

  const animalOptions = animals
    .filter((animal) => !animal.dateOfDeath || animalIds.includes(animal.id))
    .map((animal) => ({
      value: animal.id,
      label: `${animalDisplayName(animal.name, animal.earTag?.number)} (${t(`animals.types.${animal.type}`)})`,
    }));

  // Re-checks always point to an earlier base check, never to another re-check
  const previousCheckOptions = checks.filter(
    (otherCheck) =>
      otherCheck.id !== check?.id &&
      otherCheck.previousCheckId === null &&
      otherCheck.date.slice(0, 10) <= date &&
      // When editing, only base checks the stored check already fits, so nothing
      // gets overwritten or dropped
      (!isEditing ||
        (otherCheck.method === method &&
          (otherCheck.herdId ?? "") === herdId &&
          animalIds.every((animalId) =>
            otherCheck.animals.some((baseAnimal) => baseAnimal.animalId === animalId),
          ))),
  );
  // A base check with re-checks cannot become a re-check itself
  const canBeRecheck = !check || check.rechecks.length === 0;

  const sortedTreatments = [...treatments].sort((a, b) =>
    b.startDate.localeCompare(a.startDate),
  );

  function setIndividualInput(animalId: string, parasiteType: ParasiteType, value: string) {
    setIndividualInputs((current) => ({
      ...current,
      [animalId]: { ...current[animalId], [parasiteType]: value },
    }));
  }

  function removeParasiteColumn(parasiteType: ParasiteType) {
    setParasiteColumns((columns) => columns.filter((column) => column !== parasiteType));
    // Drop entered values of that column
    setPooledInputs((inputs) => ({ ...inputs, [parasiteType]: undefined }));
    setIndividualInputs((current) =>
      Object.fromEntries(
        Object.entries(current).map(([animalId, inputs]) => [
          animalId,
          { ...inputs, [parasiteType]: undefined },
        ]),
      ),
    );
  }

  const unusedParasiteTypes = PARASITE_TYPES.filter(
    (parasiteType) => !parasiteColumns.includes(parasiteType),
  );

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    // Pooled: one sample for all animals. Individual: one sample per animal with results.
    const fecSamples =
      method !== "fecal_egg_count"
        ? []
        : sampleMode === "pooled"
          ? filledResults(pooledInputs).length > 0
            ? [
                {
                  label: pooledLabel || null,
                  animalIds,
                  results: filledResults(pooledInputs),
                },
              ]
            : []
          : animalIds.flatMap((animalId) => {
              const results = filledResults(individualInputs[animalId]);
              return results.length > 0
                ? [{ label: null, animalIds: [animalId], results }]
                : [];
            });

    onSubmit({
      body: {
        date,
        method,
        herdId: herdId || null,
        animals: animalIds.map((animalId) => ({
          animalId,
          famachaScore: method === "famacha" ? (famachaScores[animalId] ?? null) : null,
        })),
        fecSamples,
        labName: method === "fecal_egg_count" ? labName || null : null,
        notes: notes || null,
        treatmentId: treatmentId || null,
        previousCheckId: previousCheckId || null,
      },
      followUpDueDate: !isEditing && followUpEnabled ? followUpDate : null,
    });
  }

  const selectClass = "w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60";

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

      <FieldGroup className="flex-row">
        <Field className="max-w-48">
          <FieldLabel htmlFor="date">{t("common.date")} *</FieldLabel>
          <Input
            id="date"
            type="date"
            required
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </Field>
        <Field className="max-w-64">
          <FieldLabel htmlFor="herdId">{t("parasiteChecks.herdOptional")}</FieldLabel>
          <select
            id="herdId"
            className={selectClass}
            value={herdId}
            disabled={!!baseCheck || isLockedBaseCheck}
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
                    otherCheck.herd?.name,
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
                  <TableCell className="font-medium">{animalLabel(animalId)}</TableCell>
                  <TableCell className="w-56">
                    <FamachaScoreButtons
                      value={famachaScores[animalId] ?? null}
                      onChange={(score) =>
                        setFamachaScores((current) => ({ ...current, [animalId]: score }))
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
              {(["pooled", "individual"] satisfies SampleMode[]).map((modeOption) => (
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
              ))}
            </div>
            <Field className="max-w-64">
              <FieldLabel htmlFor="labName">{t("parasiteChecks.labName")}</FieldLabel>
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

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    {sampleMode === "pooled"
                      ? t("parasiteChecks.sampleModes.pooled")
                      : t("parasiteChecks.animals")}
                  </TableHead>
                  {parasiteColumns.map((parasiteType) => (
                    <TableHead key={parasiteType} className="w-36">
                      <div className="flex items-center gap-1">
                        <span className="truncate">
                          {t(`parasiteChecks.parasiteTypes.${parasiteType}`)} (
                          {t(parasiteCountUnitKey(parasiteType))})
                        </span>
                        {parasiteColumns.length > 1 && (
                          <button
                            type="button"
                            aria-label={t("common.delete")}
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => removeParasiteColumn(parasiteType)}
                          >
                            <X className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="w-44">
                    {unusedParasiteTypes.length > 0 && (
                      <select
                        className="w-full rounded-md border bg-background px-2 py-1 text-xs font-normal"
                        value=""
                        onChange={(event) => {
                          const addedType = PARASITE_TYPES.find(
                            (parasiteType) => parasiteType === event.target.value,
                          );
                          if (addedType) {
                            setParasiteColumns((columns) =>
                              PARASITE_TYPES.filter(
                                (parasiteType) =>
                                  columns.includes(parasiteType) || parasiteType === addedType,
                              ),
                            );
                          }
                        }}
                      >
                        <option value="">+ {t("parasiteChecks.addParasite")}</option>
                        {unusedParasiteTypes.map((parasiteType) => (
                          <option key={parasiteType} value={parasiteType}>
                            {t(`parasiteChecks.parasiteTypes.${parasiteType}`)}
                          </option>
                        ))}
                      </select>
                    )}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sampleMode === "pooled" ? (
                  <TableRow>
                    <TableCell className="font-medium">
                      {t("parasiteChecks.pooledSample", { count: animalIds.length })}
                    </TableCell>
                    {parasiteColumns.map((parasiteType) => (
                      <TableCell key={parasiteType}>
                        <Input
                          type="number"
                          min={0}
                          step="any"
                          value={pooledInputs[parasiteType] ?? ""}
                          onChange={(event) =>
                            setPooledInputs((inputs) => ({
                              ...inputs,
                              [parasiteType]: event.target.value,
                            }))
                          }
                        />
                      </TableCell>
                    ))}
                    <TableCell />
                  </TableRow>
                ) : (
                  animalIds.map((animalId) => (
                    <TableRow key={animalId}>
                      <TableCell className="font-medium">{animalLabel(animalId)}</TableCell>
                      {parasiteColumns.map((parasiteType) => (
                        <TableCell key={parasiteType}>
                          <Input
                            type="number"
                            min={0}
                            step="any"
                            value={individualInputs[animalId]?.[parasiteType] ?? ""}
                            onChange={(event) =>
                              setIndividualInput(animalId, parasiteType, event.target.value)
                            }
                          />
                        </TableCell>
                      ))}
                      <TableCell />
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
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
              onCheckedChange={(checked) => setFollowUpEnabled(checked === true)}
            />
            <Label htmlFor="followUp">{t("parasiteChecks.createFollowUpTask")}</Label>
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
        <Button type="submit" disabled={isSubmitting || animalIds.length === 0}>
          {t("common.save")}
        </Button>
      </div>
    </form>
  );
}
