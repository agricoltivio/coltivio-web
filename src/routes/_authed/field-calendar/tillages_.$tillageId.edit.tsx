import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
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

export const Route = createFileRoute(
  "/_authed/field-calendar/tillages_/$tillageId/edit",
)({
  loader: ({ context: { queryClient }, params: { tillageId } }) => {
    queryClient.ensureQueryData(tillageQueryOptions(tillageId));
  },
  component: EditTillage,
});

type FormData = {
  action: TillageAction;
  customAction: string;
  date: string;
  additionalNotes: string;
};

function EditTillage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { tillageId } = Route.useParams();

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
      const response = await apiClient.PATCH(
        "/v1/tillages/byId/{tillageId}",
        {
          params: { path: { tillageId } },
          body: {
            action: data.action,
            customAction:
              data.action === "custom" ? data.customAction : null,
            date: new Date(data.date).toISOString(),
            additionalNotes: data.additionalNotes || undefined,
          },
        },
      );
      if (response.error) {
        throw new Error("Failed to update tillage");
      }
      return response.data.data;
    },
    onSuccess: () => {
      navigate({ to: "/field-calendar/tillages" });
      queryClient.invalidateQueries({ queryKey: ["tillages"] });
    },
  });

  const watchedAction = watch("action");

  return (
    <PageContent title={t("fieldCalendar.tillages.edit")} showBackButton backTo={() => navigate({ to: "/field-calendar/tillages" })}>
      <form
        onSubmit={handleSubmit((data) => updateMutation.mutate(data))}
        className="space-y-4 max-w-lg"
      >
        <div className="space-y-1">
          <Label>{t("fieldCalendar.tillages.action")}</Label>
          <Select
            value={watchedAction}
            onValueChange={(v) => setValue("action", v as TillageAction)}
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
      </form>
    </PageContent>
  );
}
