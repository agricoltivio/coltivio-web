import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { animalsQueryOptions } from "@/api/animals.queries";
import { herdsQueryOptions } from "@/api/herds.queries";
import { plotsQueryOptions } from "@/api/plots.queries";
import { ANIMAL_TYPES, type AnimalType } from "@/api/types";
import { useFeatureAccess } from "@/lib/useFeatureAccess";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface ChecklistGenerationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (names: string[]) => void;
}

type EntityType = "animal" | "plot";
type AnimalSubView = "animals" | "herds";

export function ChecklistGenerationDialog({
  open,
  onClose,
  onConfirm,
}: ChecklistGenerationDialogProps) {
  const { t } = useTranslation();
  const canReadAnimals = useFeatureAccess("animals").canRead;
  const canReadFieldCalendar = useFeatureAccess("field_calendar").canRead;

  const [entityType, setEntityType] = useState<EntityType | null>(null);
  const [animalSubView, setAnimalSubView] = useState<AnimalSubView>("animals");
  const [search, setSearch] = useState("");
  const [animalTypeFilter, setAnimalTypeFilter] = useState<AnimalType | "">("");
  const [pendingSelection, setPendingSelection] = useState<Map<string, string>>(new Map());

  // Reset step + selection every time the dialog opens
  useEffect(() => {
    if (open) {
      setEntityType(null);
      setAnimalSubView("animals");
      setSearch("");
      setAnimalTypeFilter("");
      setPendingSelection(new Map());
    }
  }, [open]);

  const animalsQuery = useQuery({
    ...animalsQueryOptions(true),
    enabled: open && entityType === "animal" && animalSubView === "animals",
  });
  const herdsQuery = useQuery({
    ...herdsQueryOptions(),
    enabled: open && entityType === "animal" && animalSubView === "herds",
  });
  const plotsQuery = useQuery({
    ...plotsQueryOptions(),
    enabled: open && entityType === "plot",
  });

  const availableEntityTypes: EntityType[] = [
    ...(canReadAnimals ? (["animal"] as const) : []),
    ...(canReadFieldCalendar ? (["plot"] as const) : []),
  ];

  function toggleItem(id: string, displayName: string) {
    setPendingSelection((prev) => {
      const next = new Map(prev);
      if (next.has(id)) next.delete(id);
      else next.set(id, displayName);
      return next;
    });
  }

  function openEntityType(type: EntityType) {
    setEntityType(type);
    setAnimalSubView("animals");
    setSearch("");
    setAnimalTypeFilter("");
  }

  function handleConfirm() {
    onConfirm(Array.from(pendingSelection.values()));
  }

  const searchLower = search.toLowerCase();

  const filteredAnimals = (animalsQuery.data?.result ?? [])
    .filter((a) => animalTypeFilter === "" || a.type === animalTypeFilter)
    .filter(
      (a) =>
        !search ||
        a.name.toLowerCase().includes(searchLower) ||
        (a.earTag?.number ?? "").toLowerCase().includes(searchLower),
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const filteredHerds = (herdsQuery.data?.result ?? [])
    .filter((h) => !search || h.name.toLowerCase().includes(searchLower))
    .sort((a, b) => a.name.localeCompare(b.name));

  const filteredPlots = (plotsQuery.data?.result ?? [])
    .filter((p) => !search || p.name.toLowerCase().includes(searchLower))
    .sort((a, b) => a.name.localeCompare(b.name));

  const isLoading =
    (entityType === "animal" && animalSubView === "animals" && animalsQuery.isLoading) ||
    (entityType === "animal" && animalSubView === "herds" && herdsQuery.isLoading) ||
    (entityType === "plot" && plotsQuery.isLoading);

  function selectAllVisible() {
    if (entityType === "animal" && animalSubView === "animals") {
      setPendingSelection((prev) => {
        const next = new Map(prev);
        for (const a of filteredAnimals) {
          next.set(a.id, a.earTag?.number ? `${a.earTag.number} — ${a.name}` : a.name);
        }
        return next;
      });
    } else if (entityType === "animal" && animalSubView === "herds") {
      setPendingSelection((prev) => {
        const next = new Map(prev);
        for (const h of filteredHerds) next.set(h.id, h.name);
        return next;
      });
    } else if (entityType === "plot") {
      setPendingSelection((prev) => {
        const next = new Map(prev);
        for (const p of filteredPlots) next.set(p.id, p.name);
        return next;
      });
    }
  }

  function clearSelection() {
    setPendingSelection(new Map());
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("tasks.checklist.generate")}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{t("tasks.checklist.generateHint")}</p>

        {entityType === null && (
          <div className="flex flex-col gap-2">
            {availableEntityTypes.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => openEntityType(type)}
                className="flex items-center justify-between px-3 py-2.5 text-sm border rounded-md hover:bg-accent transition-colors"
              >
                {t(`tasks.checklist.entityTypes.${type}Plural`)}
                <span className="text-muted-foreground text-xs">›</span>
              </button>
            ))}
          </div>
        )}

        {entityType !== null && (
          <>
            <div className="flex flex-wrap gap-2 items-center">
              <button
                type="button"
                onClick={() => setEntityType(null)}
                className="text-sm text-muted-foreground hover:underline"
              >
                ‹ {t(`tasks.checklist.entityTypes.${entityType}Plural`)}
              </button>

              {entityType === "animal" && (
                <div className="flex gap-1 ml-auto">
                  {(["animals", "herds"] as const).map((view) => (
                    <button
                      key={view}
                      type="button"
                      onClick={() => {
                        setAnimalSubView(view);
                        setSearch("");
                        setAnimalTypeFilter("");
                      }}
                      className={`px-2 py-1 text-xs rounded border transition-colors ${
                        animalSubView === view
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:bg-accent"
                      }`}
                    >
                      {t(
                        `tasks.checklist.entityTypes.${view === "animals" ? "animalPlural" : "herdPlural"}`,
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 flex-wrap">
              <Input
                placeholder={t("common.search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 min-w-0"
              />
              {entityType === "animal" && animalSubView === "animals" && (
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

            <div className="flex gap-2 items-center text-sm">
              <button
                type="button"
                onClick={selectAllVisible}
                className="text-primary hover:underline"
              >
                {t("common.selectAll")}
              </button>
              <span className="text-muted-foreground">·</span>
              <button
                type="button"
                onClick={clearSelection}
                disabled={pendingSelection.size === 0}
                className="text-muted-foreground hover:underline disabled:opacity-40 disabled:no-underline"
              >
                {t("common.clearAll")}
              </button>
              {pendingSelection.size > 0 && (
                <span className="ml-auto text-xs text-muted-foreground">
                  {pendingSelection.size}
                </span>
              )}
            </div>

            <div className="max-h-60 overflow-y-auto space-y-0.5 border rounded-md p-1">
              {isLoading && (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  {t("common.loading")}
                </div>
              )}

              {!isLoading && entityType === "animal" && animalSubView === "animals" && (
                <EntityList
                  items={filteredAnimals.map((a) => ({
                    id: a.id,
                    label: a.name,
                    sublabel: a.earTag?.number,
                    displayName: a.earTag?.number ? `${a.earTag.number} — ${a.name}` : a.name,
                  }))}
                  selection={pendingSelection}
                  onToggle={toggleItem}
                  emptyLabel={t("common.noResults")}
                />
              )}

              {!isLoading && entityType === "animal" && animalSubView === "herds" && (
                <EntityList
                  items={filteredHerds.map((h) => ({ id: h.id, label: h.name, displayName: h.name }))}
                  selection={pendingSelection}
                  onToggle={toggleItem}
                  emptyLabel={t("common.noResults")}
                />
              )}

              {!isLoading && entityType === "plot" && (
                <EntityList
                  items={filteredPlots.map((p) => ({ id: p.id, label: p.name, displayName: p.name }))}
                  selection={pendingSelection}
                  onToggle={toggleItem}
                  emptyLabel={t("common.noResults")}
                />
              )}
            </div>
          </>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={pendingSelection.size === 0}>
            {t("common.confirm")} ({pendingSelection.size})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EntityList({
  items,
  selection,
  onToggle,
  emptyLabel,
}: {
  items: { id: string; label: string; sublabel?: string; displayName: string }[];
  selection: Map<string, string>;
  onToggle: (id: string, displayName: string) => void;
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return <div className="py-4 text-center text-sm text-muted-foreground">{emptyLabel}</div>;
  }

  return (
    <>
      {items.map((item) => {
        const isSelected = selection.has(item.id);
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onToggle(item.id, item.displayName)}
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
            {item.sublabel && (
              <span className="text-xs text-muted-foreground shrink-0">{item.sublabel}</span>
            )}
          </button>
        );
      })}
    </>
  );
}
