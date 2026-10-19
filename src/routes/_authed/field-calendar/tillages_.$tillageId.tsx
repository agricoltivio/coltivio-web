import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { useFeatureAccess } from "@/lib/useFeatureAccess";
import { tillageQueryOptions } from "@/api/tillages.queries";
import { TILLAGE_ACTIONS, type TillageAction } from "@/api/types";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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

export const Route = createFileRoute(
  "/_authed/field-calendar/tillages_/$tillageId",
)({
  loader: ({ context: { queryClient }, params: { tillageId } }) => {
    queryClient.ensureQueryData(tillageQueryOptions(tillageId));
  },
  component: TillageDetail,
});

type FormData = {
  action: TillageAction;
  customAction: string;
  date: string;
  additionalNotes: string;
};

function TillageDetail() {
  const { t } = useTranslation();
  const { canWrite } = useFeatureAccess("field_calendar");
  const { tillageId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const tillageQuery = useQuery(tillageQueryOptions(tillageId));
  const tillage = tillageQuery.data;

  const { register, handleSubmit, setValue, watch, reset } = useForm<FormData>({
    defaultValues: {
      action: "plowing",
      customAction: "",
      date: "",
      additionalNotes: "",
    },
  });

  useEffect(() => {
    if (tillage) {
      reset({
        action: tillage.action,
        customAction: tillage.customAction ?? "",
        date: tillage.date.slice(0, 10),
        additionalNotes: tillage.additionalNotes ?? "",
      });
    }
  }, [tillage, reset]);

  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiClient.PATCH("/v1/tillages/byId/{tillageId}", {
        params: { path: { tillageId } },
        body: {
          action: data.action,
          customAction: data.action === "custom" ? data.customAction : null,
          date: data.date,
          additionalNotes: data.additionalNotes || null,
        },
      });
      if (response.error) throw new Error("Failed to update tillage");
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tillages"] });
      queryClient.invalidateQueries({ queryKey: ["plots"] });
      navigate({ to: "/field-calendar/tillages" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.DELETE("/v1/tillages/byId/{tillageId}", {
        params: { path: { tillageId } },
      });
      if (response.error) throw new Error("Failed to delete tillage");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tillages"] });
      navigate({ to: "/field-calendar/tillages" });
    },
  });

  const watchedAction = watch("action");

  if (!tillage) {
    return (
      <PageContent title={t("common.loading")} showBackButton backTo={() => navigate({ to: "/field-calendar/tillages" })}>
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </PageContent>
    );
  }

  const actionLabel =
    tillage.action === "custom"
      ? (tillage.customAction ?? tillage.action)
      : t(`fieldCalendar.tillages.actions.${tillage.action}`);

  return (
    <PageContent
      title={`${actionLabel} – ${tillage.plot.name}`}
      showBackButton
      backTo={() => navigate({ to: "/field-calendar/tillages" })}
      actions={
        canWrite && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={deleteMutation.isPending}>
                {t("common.delete")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("common.confirm")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("fieldCalendar.tillages.deleteConfirm")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate()}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  {t("common.delete")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )
      }
    >
      <form
        onSubmit={handleSubmit((data) => updateMutation.mutate(data))}
        className="space-y-4 max-w-lg"
      >
        {/* Area is fixed after creation, only shown for reference */}
        <div className="rounded-md border p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("fieldCalendar.plots.plot")}</span>
            <span className="font-medium">{tillage.plot.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("fieldCalendar.tillages.size")}</span>
            <span className="font-medium">{(tillage.size / 100).toFixed(2)} a</span>
          </div>
        </div>

        <fieldset disabled={!canWrite} className="space-y-4">
          <div className="space-y-1">
            <Label>{t("fieldCalendar.tillages.action")}</Label>
            <Select
              value={watchedAction}
              onValueChange={(v) => {
                const action = TILLAGE_ACTIONS.find((tillageAction) => tillageAction === v);
                if (action) setValue("action", action);
              }}
              disabled={!canWrite}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TILLAGE_ACTIONS.map((action) => (
                  <SelectItem key={action} value={action}>
                    {t(`fieldCalendar.tillages.actions.${action}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {watchedAction === "custom" && (
            <div className="space-y-1">
              <Label>{t("fieldCalendar.tillages.customAction")}</Label>
              <Input {...register("customAction")} />
            </div>
          )}

          <div className="space-y-1">
            <Label>{t("fieldCalendar.tillages.date")}</Label>
            <Input type="date" {...register("date", { required: true })} />
          </div>

          <div className="space-y-1">
            <Label>{t("fieldCalendar.tillages.notes")}</Label>
            <Textarea {...register("additionalNotes")} rows={3} />
          </div>
        </fieldset>

        {canWrite && (
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={updateMutation.isPending}>
              {t("common.save")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate({ to: "/field-calendar/tillages" })}
            >
              {t("common.cancel")}
            </Button>
          </div>
        )}
      </form>
    </PageContent>
  );
}
