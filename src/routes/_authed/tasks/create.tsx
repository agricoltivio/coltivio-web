import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { farmUsersQueryOptions } from "@/api/user.queries";
import { PageContent } from "@/components/PageContent";
import { TaskForm, type TaskFormData } from "@/components/TaskForm";

export const Route = createFileRoute("/_authed/tasks/create")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(farmUsersQueryOptions());
  },
  component: CreateTask,
});

function buildApiBody(data: TaskFormData) {
  return {
    name: data.name,
    description: data.description || undefined,
    labels: data.labels,
    assigneeId: data.assigneeId || undefined,
    dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
    recurrence: data.recurrence.enabled
      ? {
          frequency: data.recurrence.frequency,
          interval: data.recurrence.interval,
          until: data.recurrence.until
            ? new Date(data.recurrence.until).toISOString()
            : undefined,
        }
      : undefined,
    links: data.links.map((l) => ({
      linkType: l.linkType,
      linkedId: l.linkedId,
    })),
    checklistItems:
      data.checklistItems.length > 0
        ? data.checklistItems.map((ci) => ({
            name: ci.name,
            dueDate: ci.dueDate
              ? new Date(ci.dueDate).toISOString()
              : undefined,
          }))
        : undefined,
  };
}

function CreateTask() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const usersQuery = useQuery(farmUsersQueryOptions());

  const createMutation = useMutation({
    mutationFn: async (data: TaskFormData) => {
      const response = await apiClient.POST("/v1/tasks", {
        body: buildApiBody(data),
      });
      if (response.error) throw new Error("Failed to create task");
      return response.data.data;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      navigate({ to: "/tasks/$taskId", params: { taskId: created.id } });
    },
  });

  return (
    <PageContent title={t("tasks.createTask")} showBackButton backTo={() => navigate({ to: "/tasks" })}>
      <TaskForm
        users={usersQuery.data?.result ?? []}
        onSubmit={(data) => createMutation.mutate(data)}
        isSubmitting={createMutation.isPending}
      />
    </PageContent>
  );
}
