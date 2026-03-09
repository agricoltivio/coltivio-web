import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { PageContent } from "@/components/PageContent";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { queryOptions } from "@tanstack/react-query";

// Users list to show who is a moderator
const usersQueryOptions = () =>
  queryOptions({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/users");
      if (response.error) throw new Error("Failed to fetch users");
      return response.data.data;
    },
  });

export const Route = createFileRoute("/_authed/wiki/admin/moderators/")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(usersQueryOptions());
  },
  component: WikiModerators,
});

function WikiModerators() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState("");

  const usersQuery = useQuery(usersQueryOptions());
  const moderators = (usersQuery.data?.result ?? []).filter((u) => u.isWikiModerator);

  const grantMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.POST("/v1/wiki/admin/moderators", {
        body: { userId },
      });
      if (response.error) throw new Error("Failed to grant moderator");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setUserId("");
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      const response = await apiClient.DELETE("/v1/wiki/admin/moderators", {
        params: { query: { userId: targetUserId } },
      });
      if (response.error) throw new Error("Failed to revoke moderator");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  return (
    <PageContent
      title={t("wiki.moderators")}
      showBackButton
      backTo={() => navigate({ to: "/wiki/admin" })}
    >
      {/* Grant form */}
      <div className="border rounded-lg p-4 mb-6 max-w-lg space-y-4">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="mod-user-id">{t("wiki.moderatorUserId")} *</FieldLabel>
            <Input
              id="mod-user-id"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="uuid"
            />
          </Field>
        </FieldGroup>
        <Button
          onClick={() => grantMutation.mutate()}
          disabled={!userId || grantMutation.isPending}
        >
          {t("wiki.grantModerator")}
        </Button>
      </div>

      {/* Moderator list */}
      {moderators.length === 0 ? (
        <p className="text-muted-foreground">{t("wiki.noModerators")}</p>
      ) : (
        <div className="grid gap-2">
          {moderators.map((user) => (
            <div key={user.id} className="border rounded-lg p-3 flex items-center gap-3">
              <div className="flex-1">
                <p className="font-medium">{user.fullName ?? user.email}</p>
                <p className="text-sm text-muted-foreground">{user.id}</p>
              </div>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => revokeMutation.mutate(user.id)}
                disabled={revokeMutation.isPending}
              >
                {t("wiki.revoke")}
              </Button>
            </div>
          ))}
        </div>
      )}
    </PageContent>
  );
}
