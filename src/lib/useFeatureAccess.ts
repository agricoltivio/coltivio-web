import { useQuery } from "@tanstack/react-query";
import { meQueryOptions } from "@/api/user.queries";
import type { FarmPermissionFeature } from "@/api/types";

export function useFeatureAccess(feature: FarmPermissionFeature): { canRead: boolean; canWrite: boolean } {
  const meQuery = useQuery(meQueryOptions());
  const me = meQuery.data;

  if (!me) return { canRead: true, canWrite: false };

  // Owners always have full access
  if (me.farmRole === "owner") return { canRead: true, canWrite: true };

  const permission = me.farmPermissions.find((p) => p.feature === feature);

  if (!permission) {
    // Absence of a record means default read access
    return { canRead: true, canWrite: false };
  }

  if (permission.access === "none") return { canRead: false, canWrite: false };
  if (permission.access === "write") return { canRead: true, canWrite: true };
  return { canRead: true, canWrite: false };
}
