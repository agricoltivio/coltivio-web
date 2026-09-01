import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "./SupabaseAuthContext";
import { farmsQueryOptions } from "@/api/farm.queries";
import {
  clearStoredActiveFarmId,
  getStoredActiveFarmId,
  setFarmSelectionIssueListener,
  setStoredActiveFarmId,
} from "@/lib/activeFarm";
import type { Farm } from "@/api/types";

// "loading"     — still figuring out which farm(s) the user has
// "no-farm"     — user belongs to no farm → existing onboarding (NoFarm)
// "ready"       — a valid active farm is selected (or auto-selected)
// "must-select" — user belongs to 2+ farms and hasn't picked one (or picked a stale one)
type ActiveFarmStatus = "loading" | "no-farm" | "ready" | "must-select";

interface ActiveFarmContextValue {
  status: ActiveFarmStatus;
  activeFarmId: string | null;
  farms: Farm[];
  setActiveFarm: (farmId: string) => void;
  // Refetch the farms list and switch to whichever farm is new relative to
  // `knownFarmIdsBefore`. Used after accepting an invite, where the accept response's
  // `farmId` reflects the request's x-farm-id (the current farm), not the joined one.
  activateNewFarm: (knownFarmIdsBefore: string[]) => Promise<void>;
  // Call after the active farm was left or deleted: clears the stored selection and lets
  // the bootstrap logic re-route — farm picker (2+ left), dashboard (1 left, auto-selected)
  // or the create/join screen (none left).
  onActiveFarmRemoved: () => Promise<void>;
}

const ActiveFarmContext = createContext<ActiveFarmContextValue | undefined>(undefined);

export function ActiveFarmProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const farmsQuery = useQuery({
    ...farmsQueryOptions(),
    enabled: isAuthenticated && userId != null,
  });
  const farms = farmsQuery.data?.result ?? [];
  const farmCount = farmsQuery.data?.count ?? 0;

  const [activeFarmId, setActiveFarmIdState] = useState<string | null>(() =>
    userId ? getStoredActiveFarmId(userId) : null,
  );
  // Forced by a backend "you must pick a farm" / "stale membership" response, so the gate
  // shows even when the farms query still holds (now-stale) success data.
  const [mustSelect, setMustSelect] = useState(false);

  // Re-read storage when the signed-in user changes (e.g. account switch on one browser).
  useEffect(() => {
    setActiveFarmIdState(userId ? getStoredActiveFarmId(userId) : null);
    setMustSelect(false);
  }, [userId]);

  // Bootstrap the selection once the farms list is known.
  useEffect(() => {
    if (!userId || !farmsQuery.isSuccess) return;

    if (farmCount === 1) {
      const onlyFarmId = farms[0].id;
      if (getStoredActiveFarmId(userId) !== onlyFarmId) {
        setStoredActiveFarmId(userId, onlyFarmId);
      }
      if (activeFarmId !== onlyFarmId) setActiveFarmIdState(onlyFarmId);
      if (mustSelect) setMustSelect(false);
      return;
    }

    if (farmCount > 1) {
      const storedFarmId = getStoredActiveFarmId(userId);
      const storedIsValid =
        storedFarmId != null && farms.some((farm) => farm.id === storedFarmId);
      if (storedIsValid) {
        if (activeFarmId !== storedFarmId) setActiveFarmIdState(storedFarmId);
        if (mustSelect) setMustSelect(false);
      } else {
        if (storedFarmId != null) clearStoredActiveFarmId(userId);
        if (activeFarmId !== null) setActiveFarmIdState(null);
        setMustSelect(true);
      }
    }
  }, [userId, farmsQuery.isSuccess, farmCount, farms, activeFarmId, mustSelect]);

  // Bridge from the API response middleware (which can't use React) — see lib/activeFarm.ts.
  useEffect(() => {
    setFarmSelectionIssueListener((issue) => {
      if (issue === "ambiguous") {
        setMustSelect(true);
      } else if (issue === "stale-membership") {
        if (userId) clearStoredActiveFarmId(userId);
        setActiveFarmIdState(null);
        setMustSelect(true);
        void queryClient.invalidateQueries({ queryKey: ["farms"] });
      }
    });
    return () => setFarmSelectionIssueListener(null);
  }, [userId, queryClient]);

  const setActiveFarm = useCallback(
    (farmId: string) => {
      if (!userId) return;
      setStoredActiveFarmId(userId, farmId);
      setActiveFarmIdState(farmId);
      setMustSelect(false);
      // Every cached query was fetched for the previous farm — refetch them all with the
      // new x-farm-id header.
      void queryClient.invalidateQueries();
      // A farm-scoped detail route (e.g. /animals/$id) would 404 under the new farm; send
      // the user to a safe landing page.
      void navigate({ to: "/dashboard" });
    },
    [userId, queryClient, navigate],
  );

  const activateNewFarm = useCallback(
    async (knownFarmIdsBefore: string[]) => {
      const result = await queryClient.fetchQuery({
        ...farmsQueryOptions(),
        staleTime: 0,
      });
      const known = new Set(knownFarmIdsBefore);
      const newFarm = result.result.find((farm) => !known.has(farm.id));
      if (newFarm) setActiveFarm(newFarm.id);
    },
    [queryClient, setActiveFarm],
  );

  const onActiveFarmRemoved = useCallback(async () => {
    if (userId) clearStoredActiveFarmId(userId);
    setActiveFarmIdState(null);
    setMustSelect(false);
    // Refetch the farms list (and everything else — cached data was for the removed farm).
    // The bootstrap effect + the _authed layout gate then route to the right screen.
    try {
      await queryClient.invalidateQueries();
    } catch {
      // individual query errors are handled by their own consumers
    }
    void navigate({ to: "/dashboard" });
  }, [userId, queryClient, navigate]);

  let status: ActiveFarmStatus;
  if (!isAuthenticated || userId == null || farmsQuery.isLoading || farmsQuery.isError) {
    status = "loading";
  } else if (farmCount === 0) {
    status = "no-farm";
  } else if (mustSelect) {
    status = "must-select";
  } else if (activeFarmId != null && farms.some((farm) => farm.id === activeFarmId)) {
    status = "ready";
  } else if (farmCount === 1) {
    // The bootstrap effect will set activeFarmId on the next tick.
    status = "ready";
  } else {
    status = "must-select";
  }

  return (
    <ActiveFarmContext.Provider
      value={{
        status,
        activeFarmId,
        farms,
        setActiveFarm,
        activateNewFarm,
        onActiveFarmRemoved,
      }}
    >
      {children}
    </ActiveFarmContext.Provider>
  );
}

export function useActiveFarm(): ActiveFarmContextValue {
  const context = useContext(ActiveFarmContext);
  if (context === undefined) {
    throw new Error("useActiveFarm must be used within an ActiveFarmProvider");
  }
  return context;
}
