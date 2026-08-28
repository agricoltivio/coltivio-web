import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import { Pin } from "lucide-react";
import { useFeatureAccess } from "@/lib/useFeatureAccess";
import { tasksQueryOptions } from "@/api/tasks.queries";
import { apiClient } from "@/api/client";
import type { Task } from "@/api/types";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authed/tasks/")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(tasksQueryOptions());
  },
  component: TasksPage,
});

type SortBy = "dueDate" | "assignee";

function assigneeName(task: Task): string | null {
  if (!task.assignee) return null;
  return task.assignee.fullName || task.assignee.email;
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1 text-sm transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-foreground hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}

function TasksPage() {
  const { t } = useTranslation();
  const { canWrite: canWriteTasks } = useFeatureAccess("tasks");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("dueDate");
  const [openOnly, setOpenOnly] = useState(true);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [selectedAssignees, setSelectedAssignees] = useState<Set<string>>(new Set());
  const [selectedLabels, setSelectedLabels] = useState<Set<string>>(new Set());

  const tasksQuery = useQuery(tasksQueryOptions());
  const allTasks = (tasksQuery.data?.result ?? []) as Task[];

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

  const now = new Date();

  function isOverdue(date: string | unknown) {
    return typeof date === "string" && new Date(date) < now;
  }
  function formatDate(date: string | unknown) {
    if (!date || typeof date !== "string") return null;
    return new Date(date).toLocaleDateString();
  }

  const openTasks = useMemo(
    () => allTasks.filter((task) => task.status === "todo"),
    [allTasks],
  );

  // Pills are derived from open tasks so they don't jump around as filters change.
  const assigneePills = useMemo(() => {
    const byId = new Map<string, string>();
    for (const task of openTasks) {
      if (task.assigneeId) byId.set(task.assigneeId, assigneeName(task) ?? task.assigneeId);
    }
    return [...byId.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [openTasks]);

  const labelPills = useMemo(
    () => [...new Set(openTasks.flatMap((task) => task.labels))].sort(),
    [openTasks],
  );

  const filtered = useMemo(() => {
    let result = openOnly ? openTasks : allTasks;

    if (search.trim()) {
      const lower = search.toLowerCase();
      result = result.filter((task) => task.name.toLowerCase().includes(lower));
    }
    if (overdueOnly) {
      result = result.filter((task) => isOverdue(task.dueDate));
    }
    if (selectedAssignees.size > 0) {
      result = result.filter(
        (task) => task.assigneeId != null && selectedAssignees.has(task.assigneeId),
      );
    }
    if (selectedLabels.size > 0) {
      result = result.filter((task) => task.labels.some((l) => selectedLabels.has(l)));
    }

    return [...result].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (sortBy === "assignee") {
        const an = assigneeName(a);
        const bn = assigneeName(b);
        if (an && bn && an !== bn) return an.localeCompare(bn);
        if (an && !bn) return -1;
        if (!an && bn) return 1;
        return a.name.localeCompare(b.name);
      }
      // dueDate
      const aHasDate = typeof a.dueDate === "string";
      const bHasDate = typeof b.dueDate === "string";
      if (aHasDate && bHasDate) {
        const diff =
          new Date(a.dueDate as string).getTime() - new Date(b.dueDate as string).getTime();
        return diff !== 0 ? diff : a.name.localeCompare(b.name);
      }
      if (aHasDate) return -1;
      if (bHasDate) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [
    openOnly,
    openTasks,
    allTasks,
    search,
    overdueOnly,
    selectedAssignees,
    selectedLabels,
    sortBy,
  ]);

  function toggle(set: Set<string>, setSet: (s: Set<string>) => void, value: string) {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setSet(next);
  }

  return (
    <PageContent
      title={t("tasks.title")}
      actions={
        canWriteTasks && (
          <Button asChild>
            <Link to="/tasks/create">{t("tasks.createTask")}</Link>
          </Button>
        )
      }
    >
      <div className="flex flex-col-reverse gap-6 lg:flex-row lg:items-start lg:gap-10">
        {/* Tasks */}
        <div className="min-w-0 flex-1 space-y-4 lg:max-w-2xl">
          <div className="flex gap-2">
            <Input
              className="h-10 flex-1 text-base"
              placeholder={t("common.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
              <SelectTrigger className="h-10 w-auto shrink-0 gap-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="dueDate">{t("tasks.sort.dueDate")}</SelectItem>
                <SelectItem value="assignee">{t("tasks.sort.assignee")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {tasksQuery.isLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              {t("common.loading")}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              {t("tasks.noTasks")}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((task) => {
                const done = task.status === "done";
                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-1 rounded-lg border pr-2 transition-colors hover:bg-accent"
                  >
                    <button
                      type="button"
                      className="flex h-14 min-w-0 flex-1 flex-col justify-center gap-0.5 px-4 text-left"
                      onClick={() =>
                        navigate({ to: "/tasks/$taskId", params: { taskId: task.id } })
                      }
                    >
                      <div className="flex items-center gap-2">
                        {task.pinned && (
                          <Pin className="size-3.5 shrink-0 text-muted-foreground" />
                        )}
                        <span
                          className={cn(
                            "min-w-0 flex-1 truncate text-sm font-medium",
                            done && "text-muted-foreground line-through",
                          )}
                        >
                          {task.name}
                        </span>
                        {task.assignee && (
                          <Badge
                            variant="secondary"
                            className="max-w-[9rem] shrink-0 text-ellipsis font-normal"
                          >
                            {assigneeName(task)}
                          </Badge>
                        )}
                        {typeof task.dueDate === "string" && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "shrink-0 font-normal",
                              !done &&
                                isOverdue(task.dueDate) &&
                                "border-destructive/40 text-destructive",
                            )}
                          >
                            {formatDate(task.dueDate)}
                          </Badge>
                        )}
                      </div>
                      <div className="flex h-4 items-center gap-1.5">
                        <span className="min-w-0 flex-1 truncate text-xs leading-4 text-muted-foreground">
                          {task.description}
                        </span>
                        {task.labels.map((label) => (
                          <Badge
                            key={label}
                            variant="outline"
                            className="h-4 shrink-0 px-1.5 py-0 text-[10px] font-normal"
                          >
                            {label}
                          </Badge>
                        ))}
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
                        className={cn(
                          "shrink-0 rounded p-1 transition-colors hover:bg-muted",
                          task.pinned ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        <Pin className="size-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Filters */}
        <aside className="space-y-4 lg:w-72 lg:shrink-0">
          <p className="text-sm font-semibold">{t("tasks.filter.title")}</p>

          <div className="flex flex-wrap gap-2">
            <FilterPill active={openOnly} onClick={() => setOpenOnly((v) => !v)}>
              {t("tasks.status.todo")}
            </FilterPill>
            <FilterPill active={overdueOnly} onClick={() => setOverdueOnly((v) => !v)}>
              {t("tasks.filter.overdue")}
            </FilterPill>
          </div>

          {assigneePills.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("tasks.assignee")}
              </p>
              <div className="flex flex-wrap gap-2">
                {assigneePills.map((user) => (
                  <FilterPill
                    key={user.id}
                    active={selectedAssignees.has(user.id)}
                    onClick={() =>
                      toggle(selectedAssignees, setSelectedAssignees, user.id)
                    }
                  >
                    {user.name}
                  </FilterPill>
                ))}
              </div>
            </div>
          )}

          {labelPills.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("tasks.labels")}
              </p>
              <div className="flex flex-wrap gap-2">
                {labelPills.map((label) => (
                  <FilterPill
                    key={label}
                    active={selectedLabels.has(label)}
                    onClick={() => toggle(selectedLabels, setSelectedLabels, label)}
                  >
                    {label}
                  </FilterPill>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </PageContent>
  );
}
