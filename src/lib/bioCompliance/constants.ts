// MVP baked Bio Suisse (Knospe) thresholds.
//
// This is a client-side, indicative rule set. A logically identical mirror lives
// in coltivio-rn-app (features/bio-compliance/rules). The single source of truth
// moves to a date-effective backend rule engine in v2.
// See coltivio-internal/market-research/biosuisse-compliance-module-feasibility.md (section 8).

// Veterinary: max chemical-synthetic/antibiotic treatments per animal per calendar year
// before the animal loses Knospe status (Richtlinien 2026 Art. 4.5.2).
export const ANTIBIOTIC_MAX_PER_YEAR = 3;
export const ANTIBIOTIC_MAX_PER_YEAR_SHORT_LIVED = 1;
// Productive lifecycle below this is treated as "short-lived" (stricter limit).
export const SHORT_LIVED_LIFECYCLE_DAYS = 365;

// Bio farms apply double the statutory withdrawal period (Richtlinien 2026 Art. 4.5.3).
// Stored waiting-days are the standard legal values, so we double them client-side.
export const WITHDRAWAL_BIO_FACTOR = 2;

// Cattle RAUS minimums (days per month): pasture in the vegetation period, Auslauf in winter.
export const RAUS_VEGETATION_MIN_DAYS = 26;
export const RAUS_WINTER_MIN_DAYS = 13;
// Vegetation period: April (3) through October (9), zero-indexed months.
export const VEGETATION_MONTHS = [3, 4, 5, 6, 7, 8, 9];
