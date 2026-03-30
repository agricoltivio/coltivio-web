import { createFileRoute, Link, useNavigate, type LinkProps } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Pin, Check, SquarePen, Trash2 } from "lucide-react";
import { taskQueryOptions } from "@/api/tasks.queries";
import { apiClient } from "@/api/client";
import type { TaskLinkType, TaskChecklistItem } from "@/api/types";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
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

export const Route = createFileRoute("/_authed/tasks/$taskId/")({
  loader: ({ params, context: { queryClient } }) => {
    return queryClient.ensureQueryData(taskQueryOptions(params.taskId));
  },
  component: TaskDetailPage,
});

// Maps a linkType + linkedId to a TanStack Router LinkProps for navigation.
// Passes returnTo so the entity's back button returns to this task.
function linkHref(
  linkType: TaskLinkType,
  linkedId: string,
  taskId: string,
): LinkProps | null {
  const returnTo = `/tasks/${taskId}`;
  switch (linkType) {
    case "animal":
      return { to: "/animals/$animalId", params: { animalId: linkedId }, search: { returnTo } };
    case "herd":
      return { to: "/animals/herds/$herdId", params: { herdId: linkedId }, search: { returnTo } };
    case "plot":
      return { to: "/field-calendar/plots/$plotId", params: { plotId: linkedId }, search: { returnTo } };
    case "contact":
      return { to: "/contacts/$contactId", params: { contactId: linkedId }, search: { returnTo } };
    case "order":
      return { to: "/orders/$orderId", params: { orderId: linkedId }, search: { returnTo } };
    case "treatment":
      return { to: "/treatments/$treatmentId", params: { treatmentId: linkedId }, search: { returnTo } };
    case "wiki_entry":
      return { to: "/wiki/$entryId", params: { entryId: linkedId }, search: { returnTo } };
    default:
      return null;
  }
}

function TaskDetailPage() {
  const { t } = useTranslation();
  const { taskId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const taskQuery = useQuery(taskQueryOptions(taskId));

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.DELETE("/v1/tasks/byId/{taskId}", {
        params: { path: { taskId } },
      });
      if (response.error) throw new Error("Failed to delete task");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      navigate({ to: "/tasks" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (status: "todo" | "done") => {
      const response = await apiClient.PATCH(
        "/v1/tasks/byId/{taskId}/status",
        {
          params: { path: { taskId } },
          body: { status },
        },
      );
      if (response.error) throw new Error("Failed to update task status");
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const pinMutation = useMutation({
    mutationFn: async (pinned: boolean) => {
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

  const checklistMutation = useMutation({
    mutationFn: async ({
      itemId,
      done,
    }: {
      itemId: string;
      done: boolean;
    }) => {
      const response = await apiClient.PATCH(
        "/v1/tasks/byId/{taskId}/checklistItems/byId/{itemId}",
        {
          params: { path: { taskId, itemId } },
          body: { done },
        },
      );
      if (response.error) throw new Error("Failed to update checklist item");
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", "byId", taskId] });
    },
  });

  function formatDate(date: string | unknown) {
    if (!date || typeof date !== "string") return "-";
    return new Date(date).toLocaleDateString();
  }

  if (taskQuery.isLoading) {
    return (
      <PageContent title={t("common.loading")}>
        <div className="py-8 text-center text-muted-foreground">
          {t("common.loading")}
        </div>
      </PageContent>
    );
  }

  if (taskQuery.error || !taskQuery.data) {
    return (
      <PageContent title={t("common.error")}>
        <div className="py-8 text-center text-destructive">
          {t("common.error")}
        </div>
      </PageContent>
    );
  }

  const task = taskQuery.data;
  const [openLinksType, setOpenLinksType] = useState<TaskLinkType | null>(null);

  // Group links by linkType
  const linksByType = task.links.reduce<
    Partial<Record<TaskLinkType, typeof task.links>>
  >((acc, link) => {
    if (!acc[link.linkType]) acc[link.linkType] = [];
    acc[link.linkType]!.push(link);
    return acc;
  }, {});

  return (
    <PageContent
      title={task.name}
      showBackButton
      backTo={() => navigate({ to: "/tasks" })}
    >
      {/* Header actions */}
      <div className="mb-6 flex items-center justify-end gap-2">
        <Button
          variant={task.status === "done" ? "default" : "outline"}
          size="icon"
          onClick={() =>
            statusMutation.mutate(task.status === "todo" ? "done" : "todo")
          }
          disabled={statusMutation.isPending}
          title={task.status === "todo" ? t("tasks.markDone") : t("tasks.markTodo")}
        >
          <Check className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => pinMutation.mutate(!task.pinned)}
          disabled={pinMutation.isPending}
          title={task.pinned ? t("tasks.unpin") : t("tasks.pin")}
        >
          <Pin className={`size-4 ${task.pinned ? "fill-current" : ""}`} />
        </Button>
        <Button variant="outline" size="icon" asChild title={t("common.edit")}>
          <Link to="/tasks/$taskId/edit" params={{ taskId }}>
            <SquarePen className="size-4" />
          </Link>
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="icon" title={t("common.delete")}>
              <Trash2 className="size-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("common.confirm")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("tasks.deleteConfirm")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                {t("common.delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="space-y-6">
        {/* Details card */}
        <Card>
          <CardHeader>
            <CardTitle>{task.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <DetailItem
                label={t("tasks.status.todo")}
                value={
                  <Badge variant={task.status === "done" ? "default" : "secondary"}>
                    {t(`tasks.status.${task.status}`)}
                  </Badge>
                }
              />
              <DetailItem
                label={t("tasks.dueDate")}
                value={formatDate(task.dueDate)}
              />
              <DetailItem
                label={t("tasks.assignee")}
                value={
                  task.assignee
                    ? task.assignee.fullName || task.assignee.email
                    : "-"
                }
              />
              {task.labels.length > 0 && (
                <DetailItem
                  label={t("tasks.labels")}
                  value={
                    <div className="flex flex-wrap gap-1">
                      {task.labels.map((label) => (
                        <Badge key={label} variant="outline">
                          {label}
                        </Badge>
                      ))}
                    </div>
                  }
                />
              )}
              {task.description && (
                <DetailItem
                  label={t("tasks.description")}
                  value={task.description}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recurrence */}
        {task.recurrence && (
          <Card>
            <CardHeader>
              <CardTitle>{t("tasks.recurrence.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <DetailItem
                  label={t("tasks.recurrence.frequency")}
                  value={t(
                    `tasks.recurrence.frequencies.${task.recurrence.frequency}`,
                  )}
                />
                <DetailItem
                  label={t("tasks.recurrence.interval")}
                  value={String(task.recurrence.interval)}
                />
                {typeof task.recurrence.until === "string" && (
                  <DetailItem
                    label={t("tasks.recurrence.until")}
                    value={formatDate(task.recurrence.until)}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Checklist */}
        {task.checklistItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t("tasks.checklist.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[...task.checklistItems].sort((a, b) => a.position - b.position).map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <Checkbox
                      checked={item.done}
                      onCheckedChange={(checked) =>
                        checklistMutation.mutate({
                          itemId: item.id,
                          done: checked === true,
                        })
                      }
                      disabled={checklistMutation.isPending}
                    />
                    <span
                      className={
                        item.done
                          ? "line-through text-muted-foreground"
                          : undefined
                      }
                    >
                      {item.name}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Links — compact chips, click opens detail modal */}
        {task.links.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t("tasks.links.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(Object.entries(linksByType) as [TaskLinkType, typeof task.links][]).map(
                  ([linkType, links]) => {
                    const label =
                      links.length <= 2
                        ? links.map((l) => l.displayName || l.linkedId).join(", ")
                        : `${links.length} ${t(`tasks.links.typesPlural.${linkType}`)}`;
                    return (
                      <button
                        key={linkType}
                        type="button"
                        onClick={() => setOpenLinksType(linkType)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-sm border rounded-full hover:bg-accent transition-colors"
                      >
                        <span className="text-xs text-muted-foreground">
                          {t(`tasks.links.types.${linkType}`)}:
                        </span>
                        <span className="font-medium">{label}</span>
                      </button>
                    );
                  },
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Modal listing items for the selected link type */}
        {openLinksType && linksByType[openLinksType] && (
          <Dialog open onOpenChange={(open) => !open && setOpenLinksType(null)}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>{t(`tasks.links.types.${openLinksType}`)}</DialogTitle>
              </DialogHeader>
              <div className="space-y-1">
                {linksByType[openLinksType]!.map((link) => {
                  const href = linkHref(link.linkType, link.linkedId, taskId);
                  const label = link.displayName || link.linkedId;
                  return href ? (
                    <Link
                      key={link.id}
                      {...href}
                      onClick={() => setOpenLinksType(null)}
                      className="flex items-center justify-between px-3 py-2.5 rounded-md hover:bg-accent transition-colors text-sm"
                    >
                      <span>{label}</span>
                      <span className="text-muted-foreground text-xs">›</span>
                    </Link>
                  ) : (
                    <div key={link.id} className="px-3 py-2.5 text-sm text-muted-foreground">
                      {label}
                    </div>
                  );
                })}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </PageContent>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm">{value}</dd>
    </div>
  );
}
