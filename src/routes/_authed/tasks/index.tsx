import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import { Pin } from "lucide-react";
import { useFeatureAccess } from "@/lib/useFeatureAccess";
import { tasksQueryOptions } from "@/api/tasks.queries";
import { farmUsersQueryOptions } from "@/api/user.queries";
import { apiClient } from "@/api/client";
import type { Task, TaskStatus } from "@/api/types";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authed/tasks/")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(tasksQueryOptions({ status: "todo" }));
    queryClient.ensureQueryData(farmUsersQueryOptions());
  },
  component: TasksPage,
});

function TasksPage() {
  const { t } = useTranslation();
  const { canWrite: canWriteTasks } = useFeatureAccess("tasks");
  const navigate = useNavigate();

  const [status, setStatus] = useState<TaskStatus>("todo");
  const [search, setSearch] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [labelFilter, setLabelFilter] = useState("");

  const tasksQuery = useQuery(tasksQueryOptions({ status }));
  const usersQuery = useQuery(farmUsersQueryOptions());
  const queryClient = useQueryClient();

  const pinMutation = useMutation({
    mutationFn: async ({ taskId, pinned }: { taskId: string; pinned: boolean }) => {
      const response = await apiClient.PATCH("/v1/tasks/byId/{taskId}", {
        params: { path: { taskId } },
        body: { pinned },
      });
      if (response.error) throw new Error("Failed to update task");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const allTasks = tasksQuery.data?.result ?? [];
  const users = usersQuery.data?.result ?? [];

  // Collect unique labels from the current result set for the filter dropdown
  const allLabels = useMemo(
    () => [...new Set(allTasks.flatMap((t) => t.labels))].sort(),
    [allTasks],
  );

  const now = new Date();

  const filteredAndSorted = useMemo(() => {
    let result = allTasks as Task[];

    if (search.trim()) {
      const lower = search.toLowerCase();
      result = result.filter((task) =>
        task.name.toLowerCase().includes(lower),
      );
    }

    if (overdueOnly) {
      result = result.filter(
        (task) =>
          typeof task.dueDate === "string" && new Date(task.dueDate) < now,
      );
    }

    if (assigneeFilter) {
      result = result.filter((task) => task.assigneeId === assigneeFilter);
    }

    if (labelFilter) {
      result = result.filter((task) => task.labels.includes(labelFilter));
    }

    // Sort: pinned first, then tasks with a due date (ascending), then without (alphabetical).
    result = [...result].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      const aHasDate = typeof a.dueDate === "string";
      const bHasDate = typeof b.dueDate === "string";
      if (aHasDate && bHasDate) {
        const dateDiff =
          new Date(a.dueDate as string).getTime() -
          new Date(b.dueDate as string).getTime();
        return dateDiff !== 0 ? dateDiff : a.name.localeCompare(b.name);
      }
      if (aHasDate) return -1;
      if (bHasDate) return 1;
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [allTasks, search, overdueOnly, assigneeFilter, labelFilter]);

  function formatDate(date: string | unknown) {
    if (!date || typeof date !== "string") return null;
    return new Date(date).toLocaleDateString();
  }

  function isOverdue(date: string | unknown) {
    return typeof date === "string" && new Date(date) < now;
  }

  const activeFilterCount = [
    search.trim(),
    overdueOnly,
    assigneeFilter,
    labelFilter,
  ].filter(Boolean).length;

  return (
    <PageContent title={t("tasks.title")} showBackButton={false}>
      {/* Top bar: status toggle + create button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          <Button
            variant={status === "todo" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatus("todo")}
          >
            {t("tasks.status.todo")}
          </Button>
          <Button
            variant={status === "done" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatus("done")}
          >
            {t("tasks.status.done")}
          </Button>
        </div>
        {canWriteTasks && (
          <Button asChild>
            <Link to="/tasks/create">{t("tasks.createTask")}</Link>
          </Button>
        )}
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Input
          className="w-52"
          placeholder={t("common.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {status === "todo" && (
          <Button
            variant={overdueOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setOverdueOnly((v) => !v)}
          >
            {t("tasks.filter.overdue")}
          </Button>
        )}

        <select
          className="border rounded px-3 py-1.5 text-sm bg-background"
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
        >
          <option value="">{t("tasks.filter.allAssignees")}</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.fullName || u.email}
            </option>
          ))}
        </select>

        {allLabels.length > 0 && (
          <select
            className="border rounded px-3 py-1.5 text-sm bg-background"
            value={labelFilter}
            onChange={(e) => setLabelFilter(e.target.value)}
          >
            <option value="">{t("tasks.filter.allLabels")}</option>
            {allLabels.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
        )}

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setOverdueOnly(false);
              setAssigneeFilter("");
              setLabelFilter("");
            }}
          >
            {t("tasks.filter.clear")}
          </Button>
        )}
      </div>

      {tasksQuery.isLoading && (
        <div className="py-8 text-center text-muted-foreground">
          {t("common.loading")}
        </div>
      )}

      {!tasksQuery.isLoading && filteredAndSorted.length === 0 && (
        <div className="py-8 text-center text-muted-foreground">
          {t("tasks.noTasks")}
        </div>
      )}

      <div className="space-y-2">
        {filteredAndSorted.map((task) => (
          <div
            key={task.id}
            className="w-full text-left border rounded-lg px-4 py-3 hover:bg-accent transition-colors flex items-start gap-2"
          >
            <button
              type="button"
              className="flex-1 min-w-0 text-left"
              onClick={() =>
                navigate({ to: "/tasks/$taskId", params: { taskId: task.id } })
              }
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {task.pinned && (
                      <Pin className="size-3.5 text-muted-foreground shrink-0" />
                    )}
                    <p className="font-medium truncate">{task.name}</p>
                  </div>
                  {task.assignee && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {task.assignee.fullName || task.assignee.email}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {typeof task.dueDate === "string" && (
                    <span
                      className={`text-xs ${isOverdue(task.dueDate) && status === "todo" ? "text-destructive font-medium" : "text-muted-foreground"}`}
                    >
                      {formatDate(task.dueDate)}
                    </span>
                  )}
                  {task.labels.map((label) => (
                    <Badge key={label} variant="outline" className="text-xs">
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>
            </button>
            {canWriteTasks && (
              <button
                type="button"
                title={task.pinned ? t("tasks.unpin") : t("tasks.pin")}
                onClick={(e) => {
                  e.stopPropagation();
                  pinMutation.mutate({ taskId: task.id, pinned: !task.pinned });
                }}
                className={`shrink-0 p-1 rounded hover:bg-muted transition-colors ${task.pinned ? "text-foreground" : "text-muted-foreground"}`}
              >
                <Pin className="size-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </PageContent>
  );
}
