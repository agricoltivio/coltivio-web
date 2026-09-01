// Client-side "active farm" selection. Not synced to the server — the backend resolves
// the farm per request from the `x-farm-id` header the API client injects (see api/client.ts).
// Keyed per user so multiple accounts on one browser don't clobber each other, following
// the existing `${userId}:key` localStorage convention used elsewhere in the app.

function storageKey(userId: string): string {
  return `${userId}:activeFarmId`;
}

export function getStoredActiveFarmId(userId: string): string | null {
  try {
    return localStorage.getItem(storageKey(userId));
  } catch {
    return null;
  }
}

export function setStoredActiveFarmId(userId: string, farmId: string): void {
  try {
    localStorage.setItem(storageKey(userId), farmId);
  } catch {
    // ignore — private mode / storage disabled
  }
}

export function clearStoredActiveFarmId(userId: string): void {
  try {
    localStorage.removeItem(storageKey(userId));
  } catch {
    // ignore
  }
}

// A farm-selection problem surfaced by a backend response, reported from the API client's
// response middleware (which can't use React) to the ActiveFarmProvider.
//  - "ambiguous": user belongs to 2+ farms and sent no/blank x-farm-id → must pick one.
//  - "stale-membership": the sent farm id is no longer one the user belongs to (kicked /
//    desynced across devices) → clear it and re-pick.
export type FarmSelectionIssue = "ambiguous" | "stale-membership";

let farmSelectionIssueListener: ((issue: FarmSelectionIssue) => void) | null = null;

export function setFarmSelectionIssueListener(
  listener: ((issue: FarmSelectionIssue) => void) | null,
): void {
  farmSelectionIssueListener = listener;
}

export function notifyFarmSelectionIssue(issue: FarmSelectionIssue): void {
  farmSelectionIssueListener?.(issue);
}
