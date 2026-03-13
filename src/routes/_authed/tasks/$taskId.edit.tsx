import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { taskQueryOptions } from "@/api/tasks.queries";
import { farmUsersQueryOptions } from "@/api/user.queries";
import { PageContent } from "@/components/PageContent";
import { TaskForm, type TaskFormData } from "@/components/TaskForm";

export const Route = createFileRoute("/_authed/tasks/$taskId/edit")({
  loader: ({ params, context: { queryClient } }) => {
    queryClient.ensureQueryData(taskQueryOptions(params.taskId));
    queryClient.ensureQueryData(farmUsersQueryOptions());
  },
  component: EditTask,
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
      : null,
    links: data.links.map((l) => ({
      linkType: l.linkType,
      linkedId: l.linkedId,
    })),
    checklistItems: data.checklistItems.map((ci) => ({
      name: ci.name,
      dueDate: ci.dueDate ? new Date(ci.dueDate).toISOString() : undefined,
    })),
  };
}

function EditTask() {
  const { t } = useTranslation();
  const { taskId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const task = useQuery(taskQueryOptions(taskId)).data!;
  const usersQuery = useQuery(farmUsersQueryOptions());

  const updateMutation = useMutation({
    mutationFn: async (data: TaskFormData) => {
      const response = await apiClient.PATCH("/v1/tasks/byId/{taskId}", {
        params: { path: { taskId } },
        body: buildApiBody(data),
      });
      if (response.error) throw new Error("Failed to update task");
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      navigate({ to: "/tasks/$taskId", params: { taskId } });
    },
  });

  return (
    <PageContent
      title={t("tasks.editTask")}
      showBackButton
      backTo={() => navigate({ to: "/tasks/$taskId", params: { taskId } })}
    >
      <TaskForm
        task={task}
        users={usersQuery.data?.result ?? []}
        onSubmit={(data) => updateMutation.mutate(data)}
        isSubmitting={updateMutation.isPending}
      />
    </PageContent>
  );
}
