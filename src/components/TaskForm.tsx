import { useState, useEffect } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { queryOptions, useQuery } from "@tanstack/react-query";
import type { TaskDetail, TaskLinkType, FarmUser } from "@/api/types";
import { ANIMAL_TYPES } from "@/api/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiClient } from "@/api/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { X, Plus, ListChecks } from "lucide-react";

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
  checklistItems: { name: string; dueDate: string }[];
  links: { linkType: TaskLinkType; linkedId: string; displayName: string }[];
}

export interface TaskFormProps {
  task?: TaskDetail;
  users: FarmUser[];
  onSubmit: (data: TaskFormData) => void;
  isSubmitting?: boolean;
}

type AnimalType = (typeof ANIMAL_TYPES)[number];
type LinkItem = { id: string; label: string; animalType?: AnimalType };

// Query factories — lazily enabled, animals include type for filtering
function animalsLinkQuery(enabled: boolean) {
  return queryOptions({
    queryKey: ["linkPicker", "animals"],
    queryFn: async () => {
      const res = await apiClient.GET("/v1/animals");
      if (res.error) throw new Error("Failed to fetch animals");
      return res.data.data.result.map((a): LinkItem => ({
        id: a.id,
        label: a.name,
        animalType: a.type,
      }));
    },
    enabled,
  });
}

function herdsLinkQuery(enabled: boolean) {
  return queryOptions({
    queryKey: ["linkPicker", "herds"],
    queryFn: async () => {
      const res = await apiClient.GET("/v1/animals/herds");
      if (res.error) throw new Error("Failed to fetch herds");
      return res.data.data.result.map((h): LinkItem => ({ id: h.id, label: h.name }));
    },
    enabled,
  });
}

function plotsLinkQuery(enabled: boolean) {
  return queryOptions({
    queryKey: ["linkPicker", "plots"],
    queryFn: async () => {
      const res = await apiClient.GET("/v1/plots");
      if (res.error) throw new Error("Failed to fetch plots");
      return res.data.data.result.map((p): LinkItem => ({ id: p.id, label: p.name }));
    },
    enabled,
  });
}

function contactsLinkQuery(enabled: boolean) {
  return queryOptions({
    queryKey: ["linkPicker", "contacts"],
    queryFn: async () => {
      const res = await apiClient.GET("/v1/contacts");
      if (res.error) throw new Error("Failed to fetch contacts");
      return res.data.data.result.map((c): LinkItem => ({
        id: c.id,
        label: `${c.firstName} ${c.lastName}`.trim() || c.email || c.id,
      }));
    },
    enabled,
  });
}

function ordersLinkQuery(enabled: boolean) {
  return queryOptions({
    queryKey: ["linkPicker", "orders"],
    queryFn: async () => {
      const res = await apiClient.GET("/v1/orders");
      if (res.error) throw new Error("Failed to fetch orders");
      return res.data.data.result.map((o): LinkItem => ({
        id: o.id,
        label: `${o.contact.firstName} ${o.contact.lastName} (${new Date(o.orderDate).toLocaleDateString()})`.trim(),
      }));
    },
    enabled,
  });
}

function treatmentsLinkQuery(enabled: boolean) {
  return queryOptions({
    queryKey: ["linkPicker", "treatments"],
    queryFn: async () => {
      const res = await apiClient.GET("/v1/treatments");
      if (res.error) throw new Error("Failed to fetch treatments");
      return res.data.data.result.map((t): LinkItem => ({ id: t.id, label: t.name }));
    },
    enabled,
  });
}

function wikiLinkQuery(enabled: boolean) {
  return queryOptions({
    queryKey: ["linkPicker", "wiki"],
    queryFn: async () => {
      const res = await apiClient.GET("/v1/wiki");
      if (res.error) throw new Error("Failed to fetch wiki");
      return res.data.data.result.map((w): LinkItem => ({
        id: w.id,
        label:
          w.translations.find((tr) => tr.locale === "de")?.title ||
          w.translations[0]?.title ||
          w.id,
      }));
    },
    enabled,
  });
}

const LINK_TYPES: TaskLinkType[] = [
  "animal",
  "herd",
  "plot",
  "contact",
  "order",
  "treatment",
  "wiki_entry",
];

// Returns "Name A, Name B" for ≤2 items, "{n} {type}" for more
function linkSummaryText(
  linkType: TaskLinkType,
  items: { displayName: string }[],
  t: (key: string) => string,
): string {
  if (items.length === 0) return "";
  if (items.length <= 2) return items.map((i) => i.displayName || "?").join(", ");
  return `${items.length} ${t(`tasks.links.typesPlural.${linkType}`)}`;
}

interface LinkPickerDialogProps {
  open: boolean;
  initialType?: TaskLinkType;
  onClose: () => void;
  currentLinks: TaskFormData["links"];
  onLinksChange: (links: TaskFormData["links"]) => void;
}

function LinkPickerDialog({
  open,
  initialType,
  onClose,
  currentLinks,
  onLinksChange,
}: LinkPickerDialogProps) {
  const { t } = useTranslation();
  const [activeType, setActiveType] = useState<TaskLinkType>(initialType ?? "animal");
  const [search, setSearch] = useState("");
  const [animalTypeFilter, setAnimalTypeFilter] = useState<AnimalType | "">("");

  // Sync to initialType whenever the dialog opens
  useEffect(() => {
    if (open) {
      setActiveType(initialType ?? "animal");
      setSearch("");
      setAnimalTypeFilter("");
    }
  }, [open, initialType]);

  const animalsQuery = useQuery(animalsLinkQuery(open && activeType === "animal"));
  const herdsQuery = useQuery(herdsLinkQuery(open && activeType === "herd"));
  const plotsQuery = useQuery(plotsLinkQuery(open && activeType === "plot"));
  const contactsQuery = useQuery(contactsLinkQuery(open && activeType === "contact"));
  const ordersQuery = useQuery(ordersLinkQuery(open && activeType === "order"));
  const treatmentsQuery = useQuery(treatmentsLinkQuery(open && activeType === "treatment"));
  const wikiQuery = useQuery(wikiLinkQuery(open && activeType === "wiki_entry"));

  const queryMap: Record<TaskLinkType, { data?: LinkItem[]; isLoading: boolean }> = {
    animal: animalsQuery,
    herd: herdsQuery,
    plot: plotsQuery,
    contact: contactsQuery,
    order: ordersQuery,
    treatment: treatmentsQuery,
    wiki_entry: wikiQuery,
  };

  const rawItems = queryMap[activeType].data ?? [];

  // Apply search + animal type filter
  const visibleItems = rawItems.filter((item) => {
    if (search && !item.label.toLowerCase().includes(search.toLowerCase())) return false;
    if (activeType === "animal" && animalTypeFilter && item.animalType !== animalTypeFilter) return false;
    return true;
  });

  function switchType(lt: TaskLinkType) {
    setActiveType(lt);
    setSearch("");
    setAnimalTypeFilter("");
  }

  function toggleLink(item: LinkItem) {
    const isSelected = currentLinks.some(
      (l) => l.linkType === activeType && l.linkedId === item.id,
    );
    if (isSelected) {
      onLinksChange(currentLinks.filter((l) => !(l.linkType === activeType && l.linkedId === item.id)));
    } else {
      onLinksChange([...currentLinks, { linkType: activeType, linkedId: item.id, displayName: item.label }]);
    }
  }

  function selectAll() {
    const toAdd = visibleItems
      .filter((item) => !currentLinks.some((l) => l.linkType === activeType && l.linkedId === item.id))
      .map((item) => ({ linkType: activeType, linkedId: item.id, displayName: item.label }));
    onLinksChange([...currentLinks, ...toAdd]);
  }

  function clearAll() {
    onLinksChange(currentLinks.filter((l) => l.linkType !== activeType));
  }

  const selectedCountForType = currentLinks.filter((l) => l.linkType === activeType).length;
  const isLoading = queryMap[activeType].isLoading;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("tasks.links.addLink")}</DialogTitle>
        </DialogHeader>

        {/* Type tabs */}
        <div className="flex flex-wrap gap-1">
          {LINK_TYPES.map((lt) => {
            const count = currentLinks.filter((l) => l.linkType === lt).length;
            return (
              <button
                key={lt}
                type="button"
                onClick={() => switchType(lt)}
                className={`px-2 py-1 text-xs rounded border transition-colors ${
                  activeType === lt
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-accent"
                }`}
              >
                {t(`tasks.links.types.${lt}`)}
                {count > 0 && (
                  <span className="ml-1 bg-primary/20 text-primary rounded-full px-1">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search + animal type filter */}
        <div className="flex gap-2 flex-wrap">
          <Input
            placeholder={t("common.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-0"
          />
          {activeType === "animal" && (
            <select
              className="border rounded px-2 py-1.5 text-sm bg-background"
              value={animalTypeFilter}
              onChange={(e) => setAnimalTypeFilter(e.target.value as AnimalType | "")}
            >
              <option value="">{t("common.all")}</option>
              {ANIMAL_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`animals.types.${type}`)}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Select all / Clear all */}
        <div className="flex gap-2 items-center text-sm">
          <button
            type="button"
            onClick={selectAll}
            disabled={isLoading || visibleItems.length === 0}
            className="text-primary hover:underline disabled:opacity-40 disabled:no-underline"
          >
            {t("tasks.links.selectAll")}
          </button>
          <span className="text-muted-foreground">·</span>
          <button
            type="button"
            onClick={clearAll}
            disabled={selectedCountForType === 0}
            className="text-muted-foreground hover:underline disabled:opacity-40 disabled:no-underline"
          >
            {t("tasks.links.clearAll")}
          </button>
          {selectedCountForType > 0 && (
            <span className="ml-auto text-xs text-muted-foreground">
              {selectedCountForType} {t("tasks.links.selected")}
            </span>
          )}
        </div>

        {/* Entity list */}
        <div className="max-h-60 overflow-y-auto space-y-0.5 border rounded-md p-1">
          {isLoading && (
            <div className="py-4 text-center text-sm text-muted-foreground">
              {t("common.loading")}
            </div>
          )}
          {!isLoading && visibleItems.length === 0 && (
            <div className="py-4 text-center text-sm text-muted-foreground">
              {t("common.noResults")}
            </div>
          )}
          {visibleItems.map((item) => {
            const isSelected = currentLinks.some(
              (l) => l.linkType === activeType && l.linkedId === item.id,
            );
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleLink(item)}
                className={`w-full text-left px-3 py-2 text-sm rounded flex items-center gap-2 transition-colors ${
                  isSelected ? "bg-primary/10 text-primary" : "hover:bg-accent"
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-sm border flex-shrink-0 flex items-center justify-center text-[10px] transition-colors ${
                    isSelected ? "bg-primary border-primary text-primary-foreground" : "border-border"
                  }`}
                >
                  {isSelected && "✓"}
                </span>
                <span className="flex-1 truncate">{item.label}</span>
                {item.animalType && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    {t(`animals.types.${item.animalType}`)}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex justify-end">
          <Button type="button" onClick={onClose}>
            {t("common.close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TaskForm({
  task,
  users,
  onSubmit,
  isSubmitting = false,
}: TaskFormProps) {
  const { t } = useTranslation();
  const [labelInput, setLabelInput] = useState("");
  const [linkPickerOpen, setLinkPickerOpen] = useState(false);
  const [linkPickerInitialType, setLinkPickerInitialType] = useState<TaskLinkType>("animal");

  function openPickerAt(type: TaskLinkType) {
    setLinkPickerInitialType(type);
    setLinkPickerOpen(true);
  }

  const defaultLinks: TaskFormData["links"] = (task?.links ?? []).map((l) => ({
    linkType: l.linkType,
    linkedId: l.linkedId,
    displayName: l.displayName ?? "",
  }));

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
            name: ci.name,
            dueDate:
              typeof ci.dueDate === "string" ? ci.dueDate.split("T")[0] : "",
          })),
          links: defaultLinks,
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
          links: [],
        },
  });

  const { fields: checklistFields, append: appendChecklist, remove: removeChecklist } =
    useFieldArray({ control, name: "checklistItems" });

  const watchedLabels = watch("labels");
  const watchedRecurrenceEnabled = watch("recurrence.enabled");
  const watchedLinks = watch("links");

  // Group links by type for summary display
  const linksByType = LINK_TYPES.reduce<
    Partial<Record<TaskLinkType, TaskFormData["links"]>>
  >((acc, lt) => {
    const items = watchedLinks.filter((l) => l.linkType === lt);
    if (items.length > 0) acc[lt] = items;
    return acc;
  }, {});

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
          <FieldLabel>{t("tasks.checklist.title")}</FieldLabel>
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
            <Plus className="h-4 w-4 mr-1" />
            {t("tasks.checklist.addItem")}
          </Button>
        </Field>
      </FieldGroup>

      {/* Links */}
      <FieldGroup>
        <Field>
          <FieldLabel>{t("tasks.links.title")}</FieldLabel>

          {/* Compact summary: one clickable chip per type + checklist button */}
          {Object.keys(linksByType).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {(Object.entries(linksByType) as [TaskLinkType, TaskFormData["links"]][]).map(
                ([lt, items]) => (
                  <div key={lt} className="inline-flex items-stretch">
                    <button
                      type="button"
                      onClick={() => openPickerAt(lt)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-sm border rounded-l-full hover:bg-accent transition-colors"
                    >
                      <span className="text-xs text-muted-foreground">
                        {t(`tasks.links.types.${lt}`)}:
                      </span>
                      <span className="font-medium">{linkSummaryText(lt, items, t)}</span>
                    </button>
                    <button
                      type="button"
                      title={t("tasks.checklist.createFromLinks")}
                      onClick={() => {
                        const existingNames = new Set(
                          checklistFields.map((f) => f.name),
                        );
                        items
                          .filter((item) => !existingNames.has(item.displayName))
                          .forEach((item) =>
                            appendChecklist({ name: item.displayName, dueDate: "" }),
                          );
                      }}
                      className="flex items-center px-2 border border-l-0 rounded-r-full bg-muted hover:bg-accent transition-colors"
                    >
                      <ListChecks className="h-4 w-4" />
                    </button>
                  </div>
                ),
              )}
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => openPickerAt("animal")}
          >
            <Plus className="h-4 w-4 mr-1" />
            {t("tasks.links.addLink")}
          </Button>

          <Controller
            name="links"
            control={control}
            render={({ field }) => (
              <LinkPickerDialog
                open={linkPickerOpen}
                initialType={linkPickerInitialType}
                onClose={() => setLinkPickerOpen(false)}
                currentLinks={field.value}
                onLinksChange={field.onChange}
              />
            )}
          />
        </Field>
      </FieldGroup>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {t("common.save")}
        </Button>
      </div>
    </form>
  );
}
