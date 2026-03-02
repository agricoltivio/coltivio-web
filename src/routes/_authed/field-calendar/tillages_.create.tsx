import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { apiClient } from "@/api/client";
import { plotsQueryOptions } from "@/api/plots.queries";
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
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Textarea } from "@/components/ui/textarea";

type PlotOption = { value: string; label: string };

const searchSchema = z.object({
  plotId: z.string().optional(),
});

export const Route = createFileRoute(
  "/_authed/field-calendar/tillages_/create",
)({
  validateSearch: searchSchema,
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(plotsQueryOptions());
  },
  component: CreateTillage,
});

type FormData = {
  plotId: string;
  action: TillageAction;
  customAction: string;
  date: string;
  additionalNotes: string;
};

function CreateTillage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { plotId: defaultPlotId } = Route.useSearch();

  const plotsQuery = useQuery(plotsQueryOptions());

  const { register, handleSubmit, setValue, watch } = useForm<FormData>({
    defaultValues: {
      plotId: defaultPlotId ?? "",
      action: "plowing",
      customAction: "",
      date: new Date().toISOString().slice(0, 10),
      additionalNotes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      // We use the full plot geometry as the worked area
      const plot = plots.find((p) => p.id === data.plotId);
      if (!plot) throw new Error("Plot not found");

      const response = await apiClient.POST("/v1/tillages/batch", {
        body: {
          action: data.action,
          customAction:
            data.action === "custom" ? data.customAction : undefined,
          date: new Date(data.date).toISOString(),
          additionalNotes: data.additionalNotes || undefined,
          plots: [
            {
              plotId: data.plotId,
              geometry: plot.geometry,
              size: plot.size,
            },
          ],
        },
      });
      if (response.error) {
        throw new Error("Failed to create tillage");
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tillages"] });
      queryClient.invalidateQueries({ queryKey: ["plots"] });
      navigate({ to: "/field-calendar/tillages" });
    },
  });

  const plots = plotsQuery.data?.result ?? [];
  const watchedPlotId = watch("plotId");
  const watchedAction = watch("action");

  const plotOptions: PlotOption[] = plots.map((p) => ({
    value: p.id,
    label: `${p.name} - ${p.usage} (${p.size / 100}a) `,
  }));

  return (
    <PageContent
      title={t("fieldCalendar.tillages.create")}
      showBackButton
      backTo={() => navigate({ to: "/field-calendar/tillages" })}
    >
      <form
        onSubmit={handleSubmit((data) => createMutation.mutate(data))}
        className="space-y-4 max-w-lg"
      >
        <div className="space-y-1">
          <Label>{t("fieldCalendar.plots.plot")}</Label>
          <Combobox
            items={plotOptions}
            itemToStringValue={(item: PlotOption) => item.label}
            value={plotOptions.find((o) => o.value === watchedPlotId) ?? null}
            onValueChange={(item: PlotOption | null) =>
              setValue("plotId", item?.value ?? "")
            }
          >
            <ComboboxInput
              placeholder={t("fieldCalendar.plots.selectPlot")}
              showClear={!!watchedPlotId}
            />
            <ComboboxContent>
              <ComboboxEmpty>{t("common.noResults")}</ComboboxEmpty>
              <ComboboxList>
                {(option: PlotOption) => (
                  <ComboboxItem key={option.value} value={option}>
                    {option.label}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </div>

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
          <Button type="submit" disabled={createMutation.isPending}>
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
