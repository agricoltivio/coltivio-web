// MVP baked Bio-Compliance rules (client-side, indicative only).
// Pure functions over already-fetched API data. No persistence, no backend.
// Logically identical mirror in coltivio-rn-app. v2 moves this to the backend.
// See coltivio-internal/market-research/biosuisse-compliance-module-feasibility.md (section 8).

import type {
  Animal,
  Crop,
  CropRotation,
  FertilizerApplication,
  Treatment,
} from "@/api/types";
import {
  detectWaitingTimeViolations,
  type RotationEntry,
} from "@/lib/cropRotationTimelineUtils";
import {
  ANTIBIOTIC_MAX_PER_YEAR,
  ANTIBIOTIC_MAX_PER_YEAR_SHORT_LIVED,
  RAUS_VEGETATION_MIN_DAYS,
  RAUS_WINTER_MIN_DAYS,
  SHORT_LIVED_LIFECYCLE_DAYS,
  VEGETATION_MONTHS,
} from "./constants";
import type { CheckDomain, CheckId, CheckResult, FailingItem } from "./types";

const MS_PER_DAY = 86_400_000;

function noData(id: CheckId, domain: CheckDomain): CheckResult {
  return { id, domain, status: "no_data", failingCount: 0, items: [] };
}

function passFail(
  id: CheckId,
  domain: CheckDomain,
  items: FailingItem[],
): CheckResult {
  return {
    id,
    domain,
    status: items.length > 0 ? "fail" : "ok",
    failingCount: items.length,
    items,
  };
}

// --- Field checks ---

/**
 * Anbaupause: the same crop / crop family must not recur on a plot before its
 * waiting time elapses. Reuses the field-calendar waiting-time detector, run
 * per plot (the detector groups by family, not by plot).
 */
export function checkRotationPause(rotations: CropRotation[]): CheckResult {
  if (rotations.length === 0) return noData("rotationPause", "field");

  const byPlot = new Map<string, CropRotation[]>();
  for (const r of rotations) {
    const arr = byPlot.get(r.plotId) ?? [];
    arr.push(r);
    byPlot.set(r.plotId, arr);
  }

  const timelineEnd = new Date(new Date().getFullYear() + 1, 11, 31);
  const items: FailingItem[] = [];

  for (const plotRotations of byPlot.values()) {
    const entries: RotationEntry[] = plotRotations.map((r) => ({
      entryId: r.id,
      cropId: r.cropId,
      fromDate: new Date(r.fromDate),
      toDate: new Date(r.toDate),
      recurrence: r.recurrence
        ? {
            interval: r.recurrence.interval,
            until: r.recurrence.until ? new Date(r.recurrence.until) : undefined,
          }
        : undefined,
      isNew: false,
    }));

    // Embedded crop objects carry the fields the detector needs (id, name,
    // waitingTimeInYears, familyId, family). Dedupe by id.
    const cropsById = new Map<string, CropRotation["crop"]>();
    for (const r of plotRotations) cropsById.set(r.crop.id, r.crop);
    const crops = [...cropsById.values()] as unknown as Crop[];

    const violations = detectWaitingTimeViolations(entries, crops, timelineEnd);
    const plotId = plotRotations[0].plotId;
    const plotName = plotRotations[0].plot?.name ?? plotId;
    for (const [entryId, v] of violations) {
      const rot = plotRotations.find((r) => r.id === entryId);
      items.push({
        label: plotName,
        detail: `${rot?.crop.name ?? ""} (${v.conflictingCropName}, ${v.requiredYears}J)`,
        link: { kind: "rotationPlot", plotId },
      });
    }
  }

  return passFail("rotationPause", "field", items);
}

/** Any mineral (synthetic) fertilizer application is forbidden under Knospe. */
export function checkMineralFertilizer(
  applications: FertilizerApplication[],
): CheckResult {
  if (applications.length === 0) return noData("mineralFertilizer", "field");
  const items: FailingItem[] = applications
    .filter((a) => a.fertilizer.type === "mineral")
    .map((a) => ({
      label: a.fertilizer.name,
      detail: `${new Date(a.date).toLocaleDateString()} · ${a.plot?.name ?? ""}`,
      link: { kind: "fertilizerApplication", id: a.id } as const,
    }));
  return passFail("mineralFertilizer", "field", items);
}

// --- Animal checks ---

function isShortLived(animal: Animal): boolean {
  // Only determinable for animals whose life has ended; living animals use the
  // standard limit (we cannot know their final lifecycle length).
  if (!animal.dateOfDeath) return false;
  const lifespanDays =
    (new Date(animal.dateOfDeath).getTime() -
      new Date(animal.dateOfBirth).getTime()) /
    MS_PER_DAY;
  return lifespanDays < SHORT_LIVED_LIFECYCLE_DAYS;
}

/** More than the allowed number of antibiotic treatments per animal per year. */
export function checkAntibioticCount(
  treatments: Treatment[],
  animals: Animal[],
): CheckResult {
  if (animals.length === 0) return noData("antibioticCount", "animal");

  // animalId -> year -> count of antibiotic treatments
  const counts = new Map<string, Map<number, number>>();
  for (const t of treatments) {
    if (!t.isAntibiotic) continue;
    const year = new Date(t.startDate).getFullYear();
    for (const a of t.animals) {
      const perYear = counts.get(a.id) ?? new Map<number, number>();
      perYear.set(year, (perYear.get(year) ?? 0) + 1);
      counts.set(a.id, perYear);
    }
  }

  const animalById = new Map(animals.map((a) => [a.id, a]));
  const items: FailingItem[] = [];
  for (const [animalId, perYear] of counts) {
    const animal = animalById.get(animalId);
    const limit =
      animal && isShortLived(animal)
        ? ANTIBIOTIC_MAX_PER_YEAR_SHORT_LIVED
        : ANTIBIOTIC_MAX_PER_YEAR;
    for (const [year, count] of perYear) {
      if (count > limit) {
        items.push({
          label: animal?.name ?? animalId,
          detail: `${count}× ${year} (max ${limit})`,
          link: { kind: "animal", id: animalId },
        });
      }
    }
  }

  return passFail("antibioticCount", "animal", items);
}

/** Critical antibiotics used without a documented antibiogram. */
export function checkCriticalAntibiotic(treatments: Treatment[]): CheckResult {
  if (treatments.length === 0) return noData("criticalAntibiotic", "animal");
  const items: FailingItem[] = treatments
    .filter((t) => t.criticalAntibiotic && !t.antibiogramAvailable)
    .map((t) => ({
      label: t.name || "?",
      detail: `${new Date(t.startDate).toLocaleDateString()} · ${t.animals
        .map((a) => a.name)
        .slice(0, 3)
        .join(", ")}`,
      link: { kind: "treatment", id: t.id } as const,
    }));
  return passFail("criticalAntibiotic", "animal", items);
}

/**
 * Informational: animals currently inside the bio (doubled) withdrawal window.
 * Stored usable-dates are standard legal; bio end = usable + (usable - end).
 * Cannot detect an actual marketing violation (no delivery data).
 */
export function checkWithdrawalStatus(
  treatments: Treatment[],
  kindLabels: Record<"milk" | "meat" | "organs", string>,
): CheckResult {
  if (treatments.length === 0) return noData("withdrawalStatus", "animal");
  const now = Date.now();
  const items: FailingItem[] = [];
  for (const t of treatments) {
    const end = new Date(t.endDate).getTime();
    const kinds: Array<["milk" | "meat" | "organs", string | null]> = [
      ["milk", t.milkUsableDate],
      ["meat", t.meatUsableDate],
      ["organs", t.organsUsableDate],
    ];
    for (const [kind, usable] of kinds) {
      if (!usable) continue;
      const u = new Date(usable).getTime();
      const bioEnd = u + (u - end);
      if (bioEnd > now) {
        items.push({
          label: t.animals.map((a) => a.name).slice(0, 3).join(", ") || t.name,
          detail: `${kindLabels[kind]} → ${new Date(bioEnd).toLocaleDateString()}`,
          link: { kind: "treatment", id: t.id },
        });
      }
    }
  }
  return {
    id: "withdrawalStatus",
    domain: "animal",
    status: items.length > 0 ? "info" : "ok",
    failingCount: items.length,
    items,
  };
}

type OutdoorEntry = { category: string; startDate: string; endDate: string };

/**
 * Indicative cattle RAUS coverage from the (planned) outdoor schedule.
 * Cattle = Swiss livestock categories starting with "A". Months with no
 * scheduled access are skipped (cannot distinguish "none" from "not entered").
 */
export function checkRausCoverage(
  entries: OutdoorEntry[],
  year: number,
  hasCattle: boolean,
): CheckResult {
  if (!hasCattle) return noData("rausCoverage", "animal");
  const cattle = entries.filter((e) => e.category.startsWith("A"));
  if (cattle.length === 0) return noData("rausCoverage", "animal");

  const yearStart = new Date(year, 0, 1).getTime();
  const yearEnd = new Date(year, 11, 31, 23, 59, 59).getTime();
  const monthDays: Set<number>[] = Array.from({ length: 12 }, () => new Set());

  for (const e of cattle) {
    let cursor = Math.max(new Date(e.startDate).getTime(), yearStart);
    const end = Math.min(new Date(e.endDate).getTime(), yearEnd);
    while (cursor <= end) {
      const d = new Date(cursor);
      monthDays[d.getMonth()].add(d.getDate());
      cursor += MS_PER_DAY;
    }
  }

  const items: FailingItem[] = [];
  for (let m = 0; m < 12; m++) {
    const days = monthDays[m].size;
    if (days === 0) continue;
    const min = VEGETATION_MONTHS.includes(m)
      ? RAUS_VEGETATION_MIN_DAYS
      : RAUS_WINTER_MIN_DAYS;
    if (days < min) {
      const monthName = new Date(year, m, 1).toLocaleString("default", {
        month: "long",
      });
      items.push({ label: monthName, detail: `${days} / ${min} Tage` });
    }
  }

  return {
    id: "rausCoverage",
    domain: "animal",
    status: items.length > 0 ? "warn" : "info",
    failingCount: items.length,
    items,
  };
}
