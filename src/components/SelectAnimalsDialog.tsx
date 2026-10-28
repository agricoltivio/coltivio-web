import {
  useState,
  type ComponentProps,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useTranslation } from "react-i18next";
import Fuse from "fuse.js";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { Animal } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatDateOnly } from "@/lib/utils";

// Selected animals shown as badges in the form field, the rest as "+n more"
const MAX_BADGES = 6;

type SortField = "earTag" | "name" | "type" | "dateOfBirth" | "herd";

function animalName(animal: Animal) {
  return animal.name.trim() || animal.earTag?.number || "–";
}

// Form field showing the selection compactly, with a dialog to pick animals
// (search, filters for herd / type / birth date, sorting, select all).
// Same as the app's SelectAnimals screen.
export function SelectAnimalsField({
  animals,
  herds,
  value,
  onValueChange,
  singleAnimalType = false,
  placeholder,
}: {
  // May include dead animals; they are only listed while selected
  animals: Animal[];
  herds: { id: string; name: string }[];
  value: string[];
  onValueChange: (animalIds: string[]) => void;
  // Once an animal is selected, only animals of its type can be added
  singleAnimalType?: boolean;
  placeholder?: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const animalsById = new Map(animals.map((animal) => [animal.id, animal]));
  const selectedAnimals = value.flatMap((animalId) => {
    const animal = animalsById.get(animalId);
    return animal ? [animal] : [];
  });

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          {value.length > 0
            ? t("animalPicker.change")
            : (placeholder ?? t("animalPicker.title"))}
        </Button>
        {value.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {t("animalPicker.selectedCount", { count: value.length })}
          </span>
        )}
      </div>
      {selectedAnimals.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedAnimals.slice(0, MAX_BADGES).map((animal) => (
            <Badge key={animal.id} variant="secondary" className="text-xs">
              {animalName(animal)}
            </Badge>
          ))}
          {selectedAnimals.length > MAX_BADGES && (
            <Badge
              variant="outline"
              className="cursor-pointer text-xs"
              onClick={() => setOpen(true)}
            >
              {t("animalPicker.more", {
                count: selectedAnimals.length - MAX_BADGES,
              })}
            </Badge>
          )}
        </div>
      )}
      {/* Mounted only while open, so it starts from the current value each time */}
      {open && (
        <SelectAnimalsDialog
          animals={animals}
          herds={herds}
          initialSelectedIds={value}
          singleAnimalType={singleAnimalType}
          onConfirm={(animalIds) => {
            onValueChange(animalIds);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

function SelectAnimalsDialog({
  animals,
  herds,
  initialSelectedIds,
  singleAnimalType,
  onConfirm,
  onClose,
}: {
  animals: Animal[];
  herds: { id: string; name: string }[];
  initialSelectedIds: string[];
  singleAnimalType: boolean;
  onConfirm: (animalIds: string[]) => void;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;

  // Changes stay local until confirmed
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(initialSelectedIds),
  );
  const [searchText, setSearchText] = useState("");
  const [selectedHerdIds, setSelectedHerdIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [birthdayFrom, setBirthdayFrom] = useState("");
  const [birthdayTo, setBirthdayTo] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const herdNameById = new Map(herds.map((herd) => [herd.id, herd.name]));
  // Dead animals are left out unless already selected (e.g. when editing)
  const selectableAnimals = animals.filter(
    (animal) => !animal.dateOfDeath || initialSelectedIds.includes(animal.id),
  );
  // Only offer herds and types that actually have selectable animals
  const herdOptions = herds.filter((herd) =>
    selectableAnimals.some((animal) => animal.herdId === herd.id),
  );
  const animalTypes = [
    ...new Set(selectableAnimals.map((animal) => animal.type)),
  ];

  const filteredAnimals = (() => {
    let result = selectableAnimals;

    // Single type: once an animal is selected, only its type stays selectable.
    // Already selected animals stay visible, so a mixed selection can be corrected.
    if (singleAnimalType && selectedIds.size > 0) {
      const selectedType = selectableAnimals.find((animal) =>
        selectedIds.has(animal.id),
      )?.type;
      if (selectedType)
        result = result.filter(
          (animal) =>
            animal.type === selectedType || selectedIds.has(animal.id),
        );
    }
    if (selectedHerdIds.size > 0)
      result = result.filter(
        (animal) => !!animal.herdId && selectedHerdIds.has(animal.herdId),
      );
    if (selectedTypes.size > 0)
      result = result.filter((animal) => selectedTypes.has(animal.type));
    if (showSelectedOnly)
      result = result.filter((animal) => selectedIds.has(animal.id));
    // Dates are ISO strings, so they compare as text
    if (birthdayFrom)
      result = result.filter(
        (animal) => animal.dateOfBirth.slice(0, 10) >= birthdayFrom,
      );
    if (birthdayTo)
      result = result.filter(
        (animal) => animal.dateOfBirth.slice(0, 10) <= birthdayTo,
      );

    if (searchText.trim().length > 0) {
      const fuse = new Fuse(result, {
        threshold: 0.3,
        keys: ["name", "earTag.number"],
      });
      result = fuse.search(searchText.trim()).map((match) => match.item);
    }

    const multiplier = sortDirection === "asc" ? 1 : -1;
    const sortValue = (animal: Animal) => {
      if (sortField === "earTag") return animal.earTag?.number ?? "";
      if (sortField === "type") return t(`animals.types.${animal.type}`);
      if (sortField === "dateOfBirth") return animal.dateOfBirth;
      if (sortField === "herd")
        return animal.herdId ? (herdNameById.get(animal.herdId) ?? "") : "";
      return animalName(animal);
    };
    return [...result].sort(
      (a, b) =>
        multiplier *
        sortValue(a).localeCompare(sortValue(b), locale, { numeric: true }),
    );
  })();

  function toggleInSet(
    setter: Dispatch<SetStateAction<Set<string>>>,
    key: string,
  ) {
    setter((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectAllVisible() {
    // Single type with nothing selected yet: only the first visible type
    const firstVisibleType = filteredAnimals[0]?.type;
    const visibleIds = filteredAnimals
      .filter(
        (animal) =>
          !singleAnimalType ||
          selectedIds.size > 0 ||
          animal.type === firstVisibleType,
      )
      .map((animal) => animal.id);
    // Added to the selection, so e.g. two herds can be selected one after another
    setSelectedIds((current) => new Set([...current, ...visibleIds]));
  }

  function changeSort(field: SortField) {
    if (field === sortField) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortField(field);
    setSortDirection("asc");
  }

  function sortableHead(field: SortField, label: string) {
    const SortIcon =
      sortField !== field
        ? ArrowUpDown
        : sortDirection === "asc"
          ? ArrowUp
          : ArrowDown;
    return (
      <TableHead>
        <button
          type="button"
          className="inline-flex items-center gap-1 hover:text-foreground"
          onClick={() => changeSort(field)}
        >
          {label}
          <SortIcon
            className={cn("size-3", sortField !== field && "opacity-40")}
          />
        </button>
      </TableHead>
    );
  }

  const hasDateFilter = birthdayFrom !== "" || birthdayTo !== "";
  const allVisibleSelected =
    filteredAnimals.length > 0 &&
    filteredAnimals.every((animal) => selectedIds.has(animal.id));

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t("animalPicker.title")}</DialogTitle>
        </DialogHeader>

        <Input
          placeholder={t("animalPicker.searchPlaceholder")}
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
        />

        {/* Filter chips */}
        <div className="flex flex-wrap gap-1.5">
          <FilterChip
            label={t("animalPicker.selectedOnly")}
            active={showSelectedOnly}
            onClick={() => setShowSelectedOnly((current) => !current)}
          />
          <Popover>
            <PopoverTrigger asChild>
              <FilterChip
                label={t("animals.dateOfBirth")}
                active={hasDateFilter}
              />
            </PopoverTrigger>
            <PopoverContent className="w-64 space-y-2" align="start">
              <label className="block text-sm">
                {t("common.fromDate")}
                <Input
                  type="date"
                  value={birthdayFrom}
                  onChange={(event) => setBirthdayFrom(event.target.value)}
                />
              </label>
              <label className="block text-sm">
                {t("common.toDate")}
                <Input
                  type="date"
                  value={birthdayTo}
                  onChange={(event) => setBirthdayTo(event.target.value)}
                />
              </label>
              {hasDateFilter && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setBirthdayFrom("");
                    setBirthdayTo("");
                  }}
                >
                  {t("common.clearAll")}
                </Button>
              )}
            </PopoverContent>
          </Popover>
          {animalTypes.length > 1 &&
            animalTypes.map((animalType) => (
              <FilterChip
                key={animalType}
                label={t(`animals.types.${animalType}`)}
                active={selectedTypes.has(animalType)}
                onClick={() => toggleInSet(setSelectedTypes, animalType)}
              />
            ))}
          {herdOptions.map((herd) => (
            <FilterChip
              key={herd.id}
              label={herd.name}
              active={selectedHerdIds.has(herd.id)}
              onClick={() => toggleInSet(setSelectedHerdIds, herd.id)}
            />
          ))}
        </div>

        <div className="flex items-center justify-between text-sm">
          <Button
            type="button"
            variant="link"
            className="h-auto p-0"
            disabled={filteredAnimals.length === 0 || allVisibleSelected}
            onClick={selectAllVisible}
          >
            {t("animalPicker.selectAll", { count: filteredAnimals.length })}
          </Button>
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-muted-foreground"
            disabled={selectedIds.size === 0}
            onClick={() => setSelectedIds(new Set())}
          >
            {t("common.deselectAll")}
          </Button>
        </div>

        {/* Scrolls on its own, header stays visible */}
        <div className="min-h-0 flex-1 overflow-auto rounded-md border">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow>
                <TableHead className="w-10" />
                {sortableHead("earTag", t("animals.earTag"))}
                {sortableHead("name", t("animals.name"))}
                {sortableHead("type", t("animals.type"))}
                {sortableHead("dateOfBirth", t("animals.dateOfBirth"))}
                {sortableHead("herd", t("animalPicker.herd"))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAnimals.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground"
                  >
                    {t("common.noResults")}
                  </TableCell>
                </TableRow>
              )}
              {filteredAnimals.map((animal) => (
                <TableRow
                  key={animal.id}
                  className="cursor-pointer"
                  data-state={selectedIds.has(animal.id) ? "selected" : ""}
                  onClick={() => toggleInSet(setSelectedIds, animal.id)}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(animal.id)}
                      // The row click toggles; the checkbox only shows the state
                      className="pointer-events-none"
                      tabIndex={-1}
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {animal.earTag?.number ?? "–"}
                  </TableCell>
                  <TableCell className="font-medium">
                    {animal.name}
                    {animal.dateOfDeath && " †"}
                  </TableCell>
                  <TableCell>{t(`animals.types.${animal.type}`)}</TableCell>
                  <TableCell>
                    {formatDateOnly(animal.dateOfBirth, locale)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {animal.herdId
                      ? (herdNameById.get(animal.herdId) ?? "–")
                      : "–"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="button" onClick={() => onConfirm([...selectedIds])}>
            {t("animalPicker.confirm", { count: selectedIds.size })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Also used as popover trigger, so it passes through all button props
function FilterChip({
  label,
  active,
  className,
  ...props
}: { label: string; active: boolean } & ComponentProps<"button">) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "rounded-full border px-3 py-1 text-sm transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-background text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      {label}
    </button>
  );
}
