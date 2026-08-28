import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { apiClient } from "@/api/client";
import { plotsQueryOptions } from "@/api/plots.queries";
import { TILLAGE_ACTIONS, type TillageAction, type Plot } from "@/api/types";
import { PageContent } from "@/components/PageContent";
import { MultiPlotPicker } from "@/components/MultiPlotPicker";
import { WizardNav, WizardProgress } from "@/components/wizard/WizardShell";
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

const STEPS = ["plots", "details", "summary"] as const;
type WizardStep = (typeof STEPS)[number];

const searchSchema = z.object({
  plotId: z.string().optional(),
  returnTo: z.string().optional(),
});

export const Route = createFileRoute("/_authed/field-calendar/tillages_/create")({
  validateSearch: searchSchema,
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(plotsQueryOptions());
  },
  component: CreateTillage,
});

type FormData = {
  plotIds: string[];
  action: TillageAction;
  customAction: string;
  date: string;
  additionalNotes: string;
};

function CreateTillage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { plotId: defaultPlotId, returnTo } = Route.useSearch();

  // Return to the plot's tillage list when opened from a plot, otherwise to the
  // global overview.
  const backSearch = defaultPlotId
    ? { plotId: defaultPlotId, ...(returnTo ? { returnTo } : {}) }
    : {};
  function goToOverview() {
    navigate({ to: "/field-calendar/tillages", search: backSearch });
  }

  const [step, setStep] = useState<WizardStep>("plots");
  const plotsQuery = useQuery(plotsQueryOptions());
  const plots = plotsQuery.data?.result ?? [];

  const { register, setValue, watch, getValues } = useForm<FormData>({
    defaultValues: {
      plotIds: defaultPlotId ? [defaultPlotId] : [],
      action: "plowing",
      customAction: "",
      date: new Date().toISOString().slice(0, 10),
      additionalNotes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const selectedPlots = data.plotIds
        .map((plotId) => plots.find((p) => p.id === plotId))
        .filter((p): p is Plot => p != null);
      if (selectedPlots.length === 0) throw new Error("Plot not found");

      const response = await apiClient.POST("/v1/tillages/batch", {
        body: {
          action: data.action,
          customAction: data.action === "custom" ? data.customAction : undefined,
          date: new Date(data.date).toISOString(),
          additionalNotes: data.additionalNotes || undefined,
          plots: selectedPlots.map((plot) => ({
            plotId: plot.id,
            geometry: plot.geometry,
            size: plot.size,
          })),
        },
      });
      if (response.error) throw new Error("Failed to create tillage");
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tillages"] });
      queryClient.invalidateQueries({ queryKey: ["plots"] });
      goToOverview();
    },
  });

  const watchedPlotIds = watch("plotIds");
  const watchedAction = watch("action");
  const watchedCustomAction = watch("customAction");
  const watchedDate = watch("date");
  const watchedNotes = watch("additionalNotes");

  const selectedPlots = watchedPlotIds
    .map((plotId) => plots.find((p) => p.id === plotId))
    .filter((p): p is Plot => p != null);

  const stepIndex = STEPS.indexOf(step);

  function stepValid(s: WizardStep): boolean {
    switch (s) {
      case "plots":
        return watchedPlotIds.length >= 1;
      case "details":
        return (
          !!watchedDate &&
          (watchedAction !== "custom" || watchedCustomAction.trim() !== "")
        );
      case "summary":
        return true;
    }
  }

  const actionLabel =
    watchedAction === "custom" && watchedCustomAction
      ? watchedCustomAction
      : t(`fieldCalendar.tillages.actions.${watchedAction}`);

  return (
    <PageContent
      title={t("fieldCalendar.tillages.create")}
      showBackButton
      backTo={goToOverview}
    >
      <div className="max-w-lg space-y-6">
        <WizardProgress
          stepIndex={stepIndex}
          total={STEPS.length}
          label={t(`fieldCalendar.tillages.wizard.steps.${step}`)}
        />

        {step === "plots" && (
          <div className="space-y-1">
            <Label>{t("fieldCalendar.plots.title")}</Label>
            <MultiPlotPicker
              plots={plots}
              value={watchedPlotIds}
              onChange={(ids) => setValue("plotIds", ids)}
            />
          </div>
        )}

        {step === "details" && (
          <div className="space-y-4">
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
          </div>
        )}

        {step === "summary" && (
          <dl className="divide-y rounded-lg border text-sm">
            <SummaryRow
              label={t("fieldCalendar.tillages.action")}
              value={actionLabel}
            />
            <SummaryRow
              label={t("fieldCalendar.tillages.date")}
              value={new Date(watchedDate).toLocaleDateString()}
            />
            {watchedNotes && (
              <SummaryRow
                label={t("fieldCalendar.tillages.notes")}
                value={watchedNotes}
              />
            )}
            <SummaryRow
              label={t("fieldCalendar.plots.title")}
              value={
                <ul className="space-y-0.5">
                  {selectedPlots.map((plot) => (
                    <li key={plot.id}>{plot.name}</li>
                  ))}
                </ul>
              }
            />
          </dl>
        )}

        <WizardNav
          isFirst={stepIndex === 0}
          isLast={step === "summary"}
          canAdvance={stepValid(step)}
          saving={createMutation.isPending}
          onBack={() => setStep(STEPS[stepIndex - 1])}
          onCancel={goToOverview}
          onNext={() => setStep(STEPS[stepIndex + 1])}
          onSave={() => createMutation.mutate(getValues())}
        />
      </div>
    </PageContent>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-3 py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
