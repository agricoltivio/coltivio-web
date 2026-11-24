// Heats and matings less than this many days apart belong to the same heat
export const SAME_HEAT_DAYS = 14;

// Calendar-day arithmetic in local time, adding milliseconds would land on the wrong day across DST changes
function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

// Port of resolveHeatOutcomes in coltivio-api (src/animals/breeding.ts), for previewing a heat that isn't
// saved yet. A mating followed by another heat (mated or not) at least SAME_HEAT_DAYS later and before the
// expected birth failed. Of several matings in the same heat only the last one gets the expected birth, the
// earlier ones share its outcome. Heats of a single animal, dates at local midnight.
export function resolveHeatOutcomes(
  heats: { id: string; date: Date; mated: boolean }[],
  gestationDays: number,
): Map<string, { expectedBirthDate: Date | null; conceptionFailed: boolean }> {
  const outcomes = new Map<string, { expectedBirthDate: Date | null; conceptionFailed: boolean }>();
  // Newest first, so a mating's later mating in the same heat is already resolved
  const newestFirst = [...heats].sort((a, b) => b.date.getTime() - a.date.getTime());
  let laterMating: { date: Date; conceptionFailed: boolean } | null = null;
  for (const heat of newestFirst) {
    if (!heat.mated) {
      outcomes.set(heat.id, { expectedBirthDate: null, conceptionFailed: false });
      continue;
    }
    const sameHeatEnd = addDays(heat.date, SAME_HEAT_DAYS);
    if (laterMating && laterMating.date < sameHeatEnd) {
      outcomes.set(heat.id, { expectedBirthDate: null, conceptionFailed: laterMating.conceptionFailed });
      laterMating = { date: heat.date, conceptionFailed: laterMating.conceptionFailed };
      continue;
    }
    const expectedBirthDate = addDays(heat.date, gestationDays);
    const conceptionFailed = heats.some(
      (laterHeat) => laterHeat.date >= sameHeatEnd && laterHeat.date < expectedBirthDate,
    );
    outcomes.set(heat.id, { expectedBirthDate: conceptionFailed ? null : expectedBirthDate, conceptionFailed });
    laterMating = { date: heat.date, conceptionFailed };
  }
  return outcomes;
}
