import { useState } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { TaskDetail, FarmUser } from "@/api/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { X, Plus, Sparkles } from "lucide-react";
import { ChecklistGenerationDialog } from "@/components/ChecklistGenerationDialog";

export interface TaskFormData {
  name: string;
  description: string;
  assigneeId: string;
  dueDate: string;
  labels: string[];
  recurrence: {
    enabled: boolean;
    frequency: "weekly" | "monthly" | "yearly";
    interval: number;
    until: string;
  };
  checklistItems: { id?: string; name: string; dueDate: string }[];
}

export interface TaskFormProps {
  task?: TaskDetail;
  users: FarmUser[];
  onSubmit: (data: TaskFormData) => void;
  isSubmitting?: boolean;
}

export function TaskForm({
  task,
  users,
  onSubmit,
  isSubmitting = false,
}: TaskFormProps) {
  const { t } = useTranslation();
  const [labelInput, setLabelInput] = useState("");
  const [checklistGenOpen, setChecklistGenOpen] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
  } = useForm<TaskFormData>({
    defaultValues: task
      ? {
          name: task.name,
          description: task.description ?? "",
          assigneeId: task.assigneeId ?? "",
          dueDate:
            typeof task.dueDate === "string"
              ? task.dueDate.split("T")[0]
              : "",
          labels: task.labels,
          recurrence: task.recurrence
            ? {
                enabled: true,
                frequency: task.recurrence.frequency,
                interval: task.recurrence.interval,
                until:
                  typeof task.recurrence.until === "string"
                    ? task.recurrence.until.split("T")[0]
                    : "",
              }
            : { enabled: false, frequency: "weekly", interval: 1, until: "" },
          checklistItems: [...task.checklistItems].sort((a, b) => a.position - b.position).map((ci) => ({
            id: ci.id,
            name: ci.name,
            dueDate: typeof ci.dueDate === "string" ? ci.dueDate.split("T")[0] : "",
          })),
        }
      : {
          name: "",
          description: "",
          assigneeId: "",
          dueDate: "",
          labels: [],
          recurrence: {
            enabled: false,
            frequency: "weekly",
            interval: 1,
            until: "",
          },
          checklistItems: [],
        },
  });

  const { fields: checklistFields, append: appendChecklist, remove: removeChecklist } =
    useFieldArray({ control, name: "checklistItems" });

  const watchedLabels = watch("labels");
  const watchedRecurrenceEnabled = watch("recurrence.enabled");

  // Appends one checklist item per generated name — duplicates are allowed
  function handleGenerateConfirm(names: string[]) {
    names.forEach((name) => appendChecklist({ name, dueDate: "" }));
    setChecklistGenOpen(false);
  }

  function addLabel() {
    const trimmed = labelInput.trim();
    if (trimmed && !watchedLabels.includes(trimmed)) {
      setValue("labels", [...watchedLabels, trimmed]);
    }
    setLabelInput("");
  }

  function removeLabel(label: string) {
    setValue(
      "labels",
      watchedLabels.filter((l) => l !== label),
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-lg space-y-7">
      {/* Name */}
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">{t("tasks.name")} *</FieldLabel>
          <Input id="name" type="text" {...register("name", { required: true })} />
        </Field>
      </FieldGroup>

      {/* Description */}
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="description">{t("tasks.description")}</FieldLabel>
          <Textarea id="description" rows={3} {...register("description")} />
        </Field>
      </FieldGroup>

      {/* Assignee + Due date row */}
      <FieldGroup className="flex-row">
        <Field>
          <FieldLabel htmlFor="assigneeId">{t("tasks.assignee")}</FieldLabel>
          <select
            id="assigneeId"
            className="w-full border rounded px-3 py-2 text-sm"
            {...register("assigneeId")}
          >
            <option value="">-</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName || u.email}
              </option>
            ))}
          </select>
        </Field>
        <Field>
          <FieldLabel htmlFor="dueDate">{t("tasks.dueDate")}</FieldLabel>
          <Input id="dueDate" type="date" {...register("dueDate")} />
        </Field>
      </FieldGroup>

      {/* Labels */}
      <FieldGroup>
        <Field>
          <FieldLabel>{t("tasks.labels")}</FieldLabel>
          <div className="flex flex-wrap gap-2 mb-2">
            {watchedLabels.map((label) => (
              <Badge key={label} variant="secondary" className="flex items-center gap-1">
                {label}
                <button
                  type="button"
                  onClick={() => removeLabel(label)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              placeholder={t("tasks.addLabel")}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addLabel();
                }
              }}
            />
            <Button type="button" variant="outline" onClick={addLabel}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </Field>
      </FieldGroup>

      {/* Recurrence */}
      <FieldGroup>
        <Field>
          <div className="flex items-center gap-2 mb-3">
            <Controller
              name="recurrence.enabled"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="recurrenceEnabled"
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                />
              )}
            />
            <Label htmlFor="recurrenceEnabled">
              {t("tasks.recurrence.title")}
            </Label>
          </div>
          {watchedRecurrenceEnabled && (
            <div className="flex flex-wrap gap-3 pl-6">
              <Field>
                <FieldLabel htmlFor="recurrenceFrequency">
                  {t("tasks.recurrence.frequency")}
                </FieldLabel>
                <select
                  id="recurrenceFrequency"
                  className="border rounded px-3 py-2 text-sm"
                  {...register("recurrence.frequency")}
                >
                  <option value="weekly">{t("tasks.recurrence.frequencies.weekly")}</option>
                  <option value="monthly">{t("tasks.recurrence.frequencies.monthly")}</option>
                  <option value="yearly">{t("tasks.recurrence.frequencies.yearly")}</option>
                </select>
              </Field>
              <Field>
                <FieldLabel htmlFor="recurrenceInterval">
                  {t("tasks.recurrence.interval")}
                </FieldLabel>
                <Input
                  id="recurrenceInterval"
                  type="number"
                  min={1}
                  className="w-20"
                  {...register("recurrence.interval", { valueAsNumber: true, min: 1 })}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="recurrenceUntil">
                  {t("tasks.recurrence.until")}
                </FieldLabel>
                <Input id="recurrenceUntil" type="date" {...register("recurrence.until")} />
              </Field>
            </div>
          )}
        </Field>
      </FieldGroup>

      {/* Checklist items */}
      <FieldGroup>
        <Field>
          <div className="flex items-center justify-between">
            <FieldLabel>{t("tasks.checklist.title")}</FieldLabel>
            <Button
              type="button"
              variant="outline"
              size="icon"
              title={t("tasks.checklist.generate")}
              onClick={() => setChecklistGenOpen(true)}
            >
              <Sparkles className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2 mb-2">
            {checklistFields.map((field, index) => (
              <div key={field.id} className="flex gap-2 items-start">
                <Input
                  placeholder={t("tasks.checklist.itemName")}
                  {...register(`checklistItems.${index}.name`, { required: true })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeChecklist(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => appendChecklist({ name: "", dueDate: "" })}
          >
            {t("tasks.checklist.addItem")}
          </Button>
        </Field>
      </FieldGroup>

      <ChecklistGenerationDialog
        open={checklistGenOpen}
        onClose={() => setChecklistGenOpen(false)}
        onConfirm={handleGenerateConfirm}
      />

      <div className="flex justify-end gap-3 pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {t("common.save")}
        </Button>
      </div>
    </form>
  );
}
