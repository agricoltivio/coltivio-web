import { useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { meQueryOptions, farmUsersQueryOptions } from "@/api/user.queries";
import { farmInvitesQueryOptions, farmMemberPermissionsQueryOptions } from "@/api/farm-members.queries";
import type { FarmPermissionFeature, FarmPermissionAccess } from "@/api/types";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";

export const Route = createFileRoute("/_authed/users")({
  beforeLoad: async ({ context: { queryClient } }) => {
    const me = await queryClient.ensureQueryData(meQueryOptions());
    if (me.farmRole !== "owner") {
      throw redirect({ to: "/dashboard" });
    }
  },
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(farmUsersQueryOptions());
    queryClient.ensureQueryData(farmInvitesQueryOptions());
  },
  component: UsersPage,
});

const ALL_FEATURES: FarmPermissionFeature[] = [
  "animals",
  "field_calendar",
  "commerce",
  "tasks",
];

// Per-feature nav translation key mapping
const FEATURE_I18N_KEY: Record<FarmPermissionFeature, string> = {
  animals: "nav.groups.livestock",
  field_calendar: "nav.groups.fieldCalendar",
  commerce: "nav.groups.sales",
  tasks: "nav.tasks",
};

// Build a local permissions map from the API result (absent = read)
function buildPermissionMap(
  result: { feature: FarmPermissionFeature; access: FarmPermissionAccess }[]
): Record<FarmPermissionFeature, FarmPermissionAccess> {
  const map = {} as Record<FarmPermissionFeature, FarmPermissionAccess>;
  for (const feature of ALL_FEATURES) {
    const found = result.find((p) => p.feature === feature);
    map[feature] = found ? found.access : "read";
  }
  return map;
}

// Initial permissions state for invite form (all read — sensible default)
function initialInvitePermissions(): Record<FarmPermissionFeature, FarmPermissionAccess> {
  const map = {} as Record<FarmPermissionFeature, FarmPermissionAccess>;
  for (const feature of ALL_FEATURES) {
    map[feature] = "read";
  }
  return map;
}

// Derive read/write checked state from access level
function accessToChecks(access: FarmPermissionAccess): { read: boolean; write: boolean } {
  if (access === "none") return { read: false, write: false };
  if (access === "write") return { read: true, write: true };
  return { read: true, write: false };
}

// Derive access level from read/write checked state
function checksToAccess(read: boolean, write: boolean): FarmPermissionAccess {
  if (write) return "write";
  if (read) return "read";
  return "none";
}

// ──────────────────────────────────────────────
// Permissions panel for a single member
// ──────────────────────────────────────────────
function MemberPermissionsPanel({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const permissionsQuery = useQuery(farmMemberPermissionsQueryOptions(userId));

  // Local override map for optimistic UI
  const [localOverrides, setLocalOverrides] = useState<
    Partial<Record<FarmPermissionFeature, FarmPermissionAccess>>
  >({});

  const setPermissionMutation = useMutation({
    mutationFn: async ({
      feature,
      access,
    }: {
      feature: FarmPermissionFeature;
      access: FarmPermissionAccess;
    }) => {
      const response = await apiClient.PUT(
        "/v1/farm/members/byId/{userId}/permissions/byFeature/{feature}",
        {
          params: { path: { userId, feature } },
          body: { access },
        }
      );
      if (response.error) throw new Error("Failed to update permission");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farm", "members", userId, "permissions"] });
      // Also invalidate me so sidebar gating refreshes for the current session if this is self
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });

  if (permissionsQuery.isLoading) {
    return <p className="text-xs text-muted-foreground py-2">{t("common.loading")}</p>;
  }

  const serverMap = permissionsQuery.data
    ? buildPermissionMap(permissionsQuery.data)
    : ({} as Record<FarmPermissionFeature, FarmPermissionAccess>);

  function getAccess(feature: FarmPermissionFeature): FarmPermissionAccess {
    return localOverrides[feature] ?? serverMap[feature] ?? "read";
  }

  function handleChange(feature: FarmPermissionFeature, read: boolean, write: boolean) {
    const access = checksToAccess(read, write);
    setLocalOverrides((prev) => ({ ...prev, [feature]: access }));
    setPermissionMutation.mutate({ feature, access });
  }

  return (
    <div className="border-t pt-3 pb-1 space-y-1">
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 items-center mb-2 pr-1">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {t("users.feature")}
        </span>
        <span className="text-xs font-medium text-muted-foreground w-10 text-center">
          {t("users.permissions.none")}
        </span>
        <span className="text-xs font-medium text-muted-foreground w-10 text-center">
          {t("users.permissions.read")}
        </span>
        <span className="text-xs font-medium text-muted-foreground w-10 text-center">
          {t("users.permissions.write")}
        </span>
      </div>
      {ALL_FEATURES.map((feature) => {
        const access = getAccess(feature);
        return (
          <div
            key={feature}
            className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 items-center py-1 pr-1 rounded hover:bg-muted/50"
          >
            <span className="text-sm">{t(FEATURE_I18N_KEY[feature])}</span>
            <div className="w-10 flex justify-center">
              <Checkbox
                checked={access === "none"}
                onCheckedChange={() => handleChange(feature, false, false)}
              />
            </div>
            <div className="w-10 flex justify-center">
              <Checkbox
                checked={access === "read"}
                onCheckedChange={() => handleChange(feature, true, false)}
              />
            </div>
            <div className="w-10 flex justify-center">
              {/* write implies read */}
              <Checkbox
                checked={access === "write"}
                onCheckedChange={() => handleChange(feature, true, true)}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────
// Invite dialog
// ──────────────────────────────────────────────
function InviteDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"owner" | "member">("member");
  const [permissions, setPermissions] = useState<
    Record<FarmPermissionFeature, FarmPermissionAccess>
  >(initialInvitePermissions());

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const permissionsBody =
        role === "member"
          ? ALL_FEATURES.map((feature) => ({ feature, access: permissions[feature] }))
          : undefined;

      const response = await apiClient.POST("/v1/farm/invites", {
        body: {
          email,
          role,
          ...(permissionsBody ? { permissions: permissionsBody } : {}),
        },
      });
      if (response.error) throw new Error("Failed to send invite");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farm", "invites"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setEmail("");
      setRole("member");
      setPermissions(initialInvitePermissions());
      onClose();
    },
  });

  function handlePermissionChange(feature: FarmPermissionFeature, read: boolean, write: boolean) {
    const access = checksToAccess(read, write);
    setPermissions((prev) => ({ ...prev, [feature]: access }));
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("users.invite")}</DialogTitle>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel>{t("users.inviteEmail")}</FieldLabel>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
            />
          </Field>
          <Field>
            <FieldLabel>{t("users.inviteRole")}</FieldLabel>
            <Select value={role} onValueChange={(v) => setRole(v as "owner" | "member")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">{t("users.role.member")}</SelectItem>
                <SelectItem value="owner">{t("users.role.owner")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>

        {role === "member" && (
          <div className="mt-2">
            <p className="text-sm font-medium mb-2">{t("users.invitePermissions")}</p>
            {/* Header: Feature | None | Read | Write (write implies read) */}
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 items-center mb-2 pr-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t("users.feature")}
              </span>
              <span className="text-xs font-medium text-muted-foreground w-10 text-center">
                {t("users.permissions.none")}
              </span>
              <span className="text-xs font-medium text-muted-foreground w-10 text-center">
                {t("users.permissions.read")}
              </span>
              <span className="text-xs font-medium text-muted-foreground w-10 text-center">
                {t("users.permissions.write")}
              </span>
            </div>
            {ALL_FEATURES.map((feature) => {
              const access = permissions[feature];
              return (
                <div
                  key={feature}
                  className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 items-center py-1 pr-1 rounded hover:bg-muted/50"
                >
                  <Label className="text-sm font-normal">{t(FEATURE_I18N_KEY[feature])}</Label>
                  <div className="w-10 flex justify-center">
                    <Checkbox
                      checked={access === "none"}
                      onCheckedChange={() => setPermissions((prev) => ({ ...prev, [feature]: "none" }))}
                    />
                  </div>
                  <div className="w-10 flex justify-center">
                    <Checkbox
                      checked={access === "read"}
                      onCheckedChange={() => setPermissions((prev) => ({ ...prev, [feature]: "read" }))}
                    />
                  </div>
                  <div className="w-10 flex justify-center">
                    {/* write implies read */}
                    <Checkbox
                      checked={access === "write"}
                      onCheckedChange={() => setPermissions((prev) => ({ ...prev, [feature]: "write" }))}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={() => inviteMutation.mutate()}
            disabled={!email || inviteMutation.isPending}
          >
            {t("users.inviteSend")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────
// Main page
// ──────────────────────────────────────────────
function UsersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const meQuery = useQuery(meQueryOptions());
  const usersQuery = useQuery(farmUsersQueryOptions());
  const invitesQuery = useQuery(farmInvitesQueryOptions());
  const currentUserId = meQuery.data?.id;

  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "owner" | "member" }) => {
      const response = await apiClient.PATCH(
        "/v1/farm/members/byId/{userId}/role",
        { params: { path: { userId } }, body: { role } }
      );
      if (response.error) throw new Error("Failed to change role");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiClient.DELETE("/v1/farm/members/byId/{userId}", {
        params: { path: { userId } },
      });
      if (response.error) throw new Error("Failed to remove member");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const cancelInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const response = await apiClient.DELETE("/v1/farm/invites/byId/{inviteId}", {
        params: { path: { inviteId } },
      });
      if (response.error) throw new Error("Failed to cancel invite");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farm", "invites"] });
    },
  });

  const members = usersQuery.data?.result ?? [];
  const pendingInvites = (invitesQuery.data?.result ?? []).filter(
    (invite) => invite.usedAt == null
  );

  return (
    <PageContent title={t("users.title")}>
      <div className="flex justify-end mb-6">
        <Button onClick={() => setShowInviteDialog(true)}>{t("users.invite")}</Button>
      </div>

      {/* Members list */}
      <div className="mb-8">
        <h2 className="text-base font-semibold mb-3">{t("users.members")}</h2>
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("users.noMembers")}</p>
        ) : (
          <div className="space-y-2">
            {members.map((member) => {
              const isSelf = member.id === currentUserId;
              const isExpanded = expandedUserId === member.id;
              const canExpand = member.farmRole === "member";

              return (
                <Collapsible
                  key={member.id}
                  open={isExpanded}
                  onOpenChange={(open) => setExpandedUserId(open ? member.id : null)}
                >
                  <div className="border rounded-lg px-4 py-3">
                    <div className="flex items-center gap-3">
                      <CollapsibleTrigger asChild disabled={!canExpand}>
                        <div className={`flex-1 min-w-0 ${canExpand ? "cursor-pointer" : ""}`}>
                          <p className="font-medium truncate">
                            {member.fullName ?? member.email}
                          </p>
                          {member.fullName && (
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                          )}
                        </div>
                      </CollapsibleTrigger>

                      {!isSelf && (
                        <Select
                          value={member.farmRole ?? "member"}
                          onValueChange={(v) =>
                            changeRoleMutation.mutate({
                              userId: member.id,
                              role: v as "owner" | "member",
                            })
                          }
                        >
                          <SelectTrigger className="h-7 w-28 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">{t("users.role.member")}</SelectItem>
                            <SelectItem value="owner">{t("users.role.owner")}</SelectItem>
                          </SelectContent>
                        </Select>
                      )}

                      {isSelf && (
                        <Badge variant="secondary" className="text-xs">
                          {t(`users.role.${member.farmRole ?? "member"}`)}
                        </Badge>
                      )}

                      {!isSelf && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive text-xs">
                              {t("common.delete")}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t("users.removeConfirm")}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {member.fullName ?? member.email}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => removeMemberMutation.mutate(member.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {t("common.delete")}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}

                      {canExpand && (
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                      )}
                    </div>

                    {canExpand && (
                      <CollapsibleContent>
                        <MemberPermissionsPanel userId={member.id} />
                      </CollapsibleContent>
                    )}
                  </div>
                </Collapsible>
              );
            })}
          </div>
        )}
      </div>

      {/* Pending invites */}
      <div>
        <h2 className="text-base font-semibold mb-3">{t("users.pendingInvites")}</h2>
        {pendingInvites.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("users.noPendingInvites")}</p>
        ) : (
          <div className="space-y-2">
            {pendingInvites.map((invite) => (
              <div key={invite.id} className="border rounded-lg px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{invite.email}</p>
                  {typeof invite.expiresAt === "string" && (
                    <p className="text-xs text-muted-foreground">
                      {t("users.expiresAt")}: {new Date(invite.expiresAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className="text-xs shrink-0">
                  {t(`users.role.${invite.role}`)}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive text-xs shrink-0"
                  onClick={() => cancelInviteMutation.mutate(invite.id)}
                  disabled={cancelInviteMutation.isPending}
                >
                  {t("users.cancelInvite")}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <InviteDialog open={showInviteDialog} onClose={() => setShowInviteDialog(false)} />
    </PageContent>
  );
}
