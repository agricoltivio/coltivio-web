// Shared result shape for the Bio-Compliance MVP checks.
// Mirror of coltivio-rn-app's bio-compliance rule types (see constants.ts header).

export type CheckStatus = "ok" | "warn" | "fail" | "info" | "no_data";

export type CheckId =
  | "rotationPause"
  | "mineralFertilizer"
  | "antibioticCount"
  | "criticalAntibiotic"
  | "withdrawalStatus"
  | "rausCoverage";

export type CheckDomain = "field" | "animal";

/** Where a flagged item links to, so the user can jump to the offending record. */
export type CheckLink =
  | { kind: "rotationPlot"; plotId: string }
  | { kind: "fertilizerApplication"; id: string }
  | { kind: "animal"; id: string }
  | { kind: "treatment"; id: string };

export type FailingItem = {
  /** Primary human-readable label (plot name, animal name, month, ...). */
  label: string;
  /** Optional secondary detail (offending value, date, threshold, ...). */
  detail?: string;
  /** Optional deep-link to the offending record. */
  link?: CheckLink;
};

export type CheckResult = {
  id: CheckId;
  domain: CheckDomain;
  status: CheckStatus;
  /** Number of flagged items (0 for ok / no_data). */
  failingCount: number;
  /** The flagged items, for the drill-down. */
  items: FailingItem[];
};
