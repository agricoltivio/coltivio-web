import { useMemo, useState } from "react";
import { animalsQueryOptions } from "@/api/animals.queries";
import { apiClient } from "@/api/client";
import { ANIMAL_TYPES, type AnimalType, type Animal, type DeathReason } from "@/api/types";
import { MultiSelect } from "@/components/ui/multi-select";
import { Checkbox } from "@/components/ui/checkbox";
import { PageContent } from "@/components/PageContent";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowUp, Upload, GitBranch, SlidersHorizontal } from "lucide-react";
import { useFeatureAccess } from "@/lib/useFeatureAccess";
import { type ColumnDef, type RowSelectionState } from "@tanstack/react-table";
import ReactECharts from "echarts-for-react";
import { CHART_COLORS } from "@/components/charts/chartUtils";
import z from "zod";

const animalSearchSchema = z.object({
  page: fallback(z.number(), 1).default(1),
  filter: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/_authed/animals/")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(animalsQueryOptions(false));
  },
  validateSearch: zodValidator(animalSearchSchema),
  component: Animals,
});

function Animals() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { canWrite: canWriteAnimals } = useFeatureAccess("animals");
  const [onlyLiving, setOnlyLiving] = useState(true);
  const animalsQuery = useQuery(animalsQueryOptions(false));
  const [typeFilter, setTypeFilter] = useState<AnimalType[]>([]);
  const [dobFrom, setDobFrom] = useState("");
  const [dobTo, setDobTo] = useState("");
  const [dodFrom, setDodFrom] = useState("");
  const [dodTo, setDodTo] = useState("");
  const [deathReasonFilter, setDeathReasonFilter] = useState<DeathReason[]>([]);

  // When a death-related filter is set, automatically fetch dead animals too
  function setDodFromWithAutoShow(value: string) {
    setDodFrom(value);
    if (value) setOnlyLiving(false);
  }
  function setDodToWithAutoShow(value: string) {
    setDodTo(value);
    if (value) setOnlyLiving(false);
  }
  function setDeathReasonFilterWithAutoShow(value: DeathReason[]) {
    setDeathReasonFilter(value);
    if (value.length > 0) setOnlyLiving(false);
  }

  function clearAllFilters() {
    setTypeFilter([]);
    setDobFrom("");
    setDobTo("");
    setDodFrom("");
    setDodTo("");
    setDeathReasonFilter([]);
    setOnlyLiving(true);
  }

  // --- Batch edit ---
  const queryClient = useQueryClient();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [batchSheetOpen, setBatchSheetOpen] = useState(false);
  const [batchFields, setBatchFields] = useState<{
    type: { enabled: boolean; value: AnimalType };
    usage: { enabled: boolean; value: "milk" | "other" };
    registered: { enabled: boolean; value: boolean };
    dateOfDeath: { enabled: boolean; value: string };
    deathReason: { enabled: boolean; value: "died" | "slaughtered" };
  }>({
    type: { enabled: false, value: "goat" },
    usage: { enabled: false, value: "milk" },
    registered: { enabled: false, value: false },
    dateOfDeath: { enabled: false, value: "" },
    deathReason: { enabled: false, value: "died" },
  });

  const batchMutation = useMutation({
    mutationFn: async (animalIds: string[]) => {
      const batchData: {
        type?: AnimalType;
        usage?: "milk" | "other";
        registered?: boolean;
        dateOfDeath?: string;
        deathReason?: "died" | "slaughtered";
      } = {};
      if (batchFields.type.enabled) batchData.type = batchFields.type.value;
      if (batchFields.usage.enabled) batchData.usage = batchFields.usage.value;
      if (batchFields.registered.enabled) batchData.registered = batchFields.registered.value;
      if (batchFields.dateOfDeath.enabled && batchFields.dateOfDeath.value) {
        batchData.dateOfDeath = new Date(batchFields.dateOfDeath.value).toISOString();
      }
      if (batchFields.deathReason.enabled) batchData.deathReason = batchFields.deathReason.value;

      const response = await apiClient.PATCH("/v1/animals/batch", {
        body: { animalIds, data: batchData },
      });
      if (response.error) throw new Error(t("common.error"));
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["animals", false] });
      setBatchSheetOpen(false);
      setRowSelection({});
    },
  });

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString();
  }

  const columns = useMemo<ColumnDef<Animal>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            onClick={(e) => e.stopPropagation()}
          />
        ),
        enableSorting: false,
      },
      {
        accessorKey: "name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="p-0 has-[>svg]:px-0 hover:bg-transparent justify-start"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("animals.name")}
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ArrowDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => (
          <Link
            to="/animals/$animalId"
            params={{ animalId: row.original.id }}
            className="font-medium text-blue-600 underline underline-offset-2 hover:text-blue-800"
            onClick={(e) => e.stopPropagation()}
          >
            {row.getValue("name")}
          </Link>
        ),
      },
      {
        accessorKey: "type",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="cursor-pointer"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("animals.type")}
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ArrowDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => t(`animals.types.${row.getValue("type")}`),
        sortingFn: (rowA, rowB) => {
          const typeA = rowA.getValue("type") as string;
          const typeB = rowB.getValue("type") as string;
          return (
            ANIMAL_TYPES.indexOf(typeA as AnimalType) -
            ANIMAL_TYPES.indexOf(typeB as AnimalType)
          );
        },
      },
      {
        accessorKey: "earTag.number",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="p-0 has-[>svg]:px-0 hover:bg-transparent justify-start"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("animals.earTag")}
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ArrowDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => row.original.earTag?.number || "-",
      },
      {
        accessorKey: "dateOfBirth",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="p-0 has-[>svg]:px-0 hover:bg-transparent justify-start"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("animals.dateOfBirth")}
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ArrowDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => {
          const dateOfBirth = row.getValue("dateOfBirth") as string | null;
          return dateOfBirth ? formatDate(dateOfBirth) : "-";
        },
      },
      {
        accessorKey: "dateOfDeath",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="p-0 has-[>svg]:px-0 hover:bg-transparent justify-start"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("animals.dateOfDeath")}
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ArrowDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => {
          const dateOfDeath = row.getValue("dateOfDeath") as string | null;
          return dateOfDeath ? formatDate(dateOfDeath) : "-";
        },
      },
    ],
    [t],
  );

  const allAnimals = animalsQuery.data?.result ?? [];
  // Charts always show all living animals, unaffected by filters
  const livingAnimals = allAnimals.filter((a) => !a.dateOfDeath);
  const data = allAnimals.filter((a) => {
    if (onlyLiving && a.dateOfDeath) return false;
    if (typeFilter.length > 0 && !typeFilter.includes(a.type)) return false;
    if (dobFrom && a.dateOfBirth && a.dateOfBirth < dobFrom) return false;
    if (dobTo && a.dateOfBirth && a.dateOfBirth > dobTo + "T23:59:59") return false;
    if (dodFrom && a.dateOfDeath && a.dateOfDeath < dodFrom) return false;
    if (dodTo && a.dateOfDeath && a.dateOfDeath > dodTo + "T23:59:59") return false;
    if (deathReasonFilter.length > 0 && (!a.deathReason || !deathReasonFilter.includes(a.deathReason))) return false;
    return true;
  });

  const activeFilterCount =
    typeFilter.length +
    (dobFrom ? 1 : 0) +
    (dobTo ? 1 : 0) +
    (dodFrom ? 1 : 0) +
    (dodTo ? 1 : 0) +
    deathReasonFilter.length +
    (!onlyLiving ? 1 : 0);

  // Map selected row indices back to animal IDs
  const selectedIds = Object.keys(rowSelection)
    .filter((k) => rowSelection[k])
    .map((k) => data[Number(k)]?.id)
    .filter((id): id is string => id !== undefined);

  return (
    <PageContent title="Tiere">
      <div className="flex justify-end gap-2 mb-6">
        <Button variant="outline" onClick={() => navigate({ to: "/animals/family-tree" })}>
          <GitBranch className="h-4 w-4 mr-2" />
          {t("animals.familyTree")}
        </Button>
        <Button variant="outline" onClick={() => navigate({ to: "/animals/import" })}>
          <Upload className="h-4 w-4 mr-2" />
          {t("animals.import")}
        </Button>
        {canWriteAnimals && (
          <Button onClick={() => navigate({ to: "/animals/create" })}>
            {t("common.create")}
          </Button>
        )}
      </div>

      {livingAnimals.length > 0 && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <AnimalTypePieChart animals={livingAnimals} />
          <AgeDistributionChart animals={livingAnimals} />
        </div>
      )}

      <DataTable
        data={data}
        columns={columns}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        globalFilterFn={(row, _columnId, filterValue) => {
          const animal = row.original;
          const searchValue = filterValue.toLowerCase();
          return (
            animal.name.toLowerCase().includes(searchValue) ||
            (animal.earTag?.number?.toLowerCase().includes(searchValue) ??
              false)
          );
        }}
        defaultSorting={[{ id: "type", desc: false }]}
        filterSlot={
          <>
          {selectedIds.length > 0 && (
            <Button className="ml-auto" onClick={() => setBatchSheetOpen(true)}>
              {t("animals.batchEditCount", { count: selectedIds.length })}
            </Button>
          )}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                {t("animals.filters")}
                {activeFilterCount > 0 && (
                  <span className="ml-1 rounded-full bg-primary text-primary-foreground text-xs w-5 h-5 flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 space-y-4" align="start">
              <div className="space-y-2">
                <p className="text-sm font-medium">{t("animals.filterByType")}</p>
                <MultiSelect
                  options={ANIMAL_TYPES.map((type) => ({
                    value: type,
                    label: t(`animals.types.${type}`),
                  }))}
                  value={typeFilter}
                  onValueChange={(v) => setTypeFilter(v as AnimalType[])}
                  placeholder={t("common.all")}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">{t("animals.dateOfBirth")}</p>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={dobFrom}
                    onChange={(e) => setDobFrom(e.target.value)}
                    className="text-sm"
                    placeholder={t("animals.filterDobFrom")}
                  />
                  <span className="text-muted-foreground text-sm">–</span>
                  <Input
                    type="date"
                    value={dobTo}
                    onChange={(e) => setDobTo(e.target.value)}
                    className="text-sm"
                    placeholder={t("animals.filterDobTo")}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">{t("animals.dateOfDeath")}</p>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={dodFrom}
                    onChange={(e) => setDodFromWithAutoShow(e.target.value)}
                    className="text-sm"
                  />
                  <span className="text-muted-foreground text-sm">–</span>
                  <Input
                    type="date"
                    value={dodTo}
                    onChange={(e) => setDodToWithAutoShow(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">{t("animals.deathReason")}</p>
                <MultiSelect
                  options={(["died", "slaughtered"] as DeathReason[]).map((r) => ({
                    value: r,
                    label: t(`animals.deathReasons.${r}`),
                  }))}
                  value={deathReasonFilter}
                  onValueChange={(v) => setDeathReasonFilterWithAutoShow(v as DeathReason[])}
                  placeholder={t("common.all")}
                  className="w-full"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    id="show-dead"
                    type="checkbox"
                    checked={!onlyLiving}
                    onChange={() => setOnlyLiving(!onlyLiving)}
                    className="h-4 w-4"
                  />
                  <label htmlFor="show-dead" className="text-sm cursor-pointer">
                    {t("animals.showDeadAnimals")}
                  </label>
                </div>
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearAllFilters}>
                    {t("common.clearAll")}
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
          </>
        }
      />

      <Sheet open={batchSheetOpen} onOpenChange={(open) => { if (!open) setBatchSheetOpen(false); }}>
        <SheetContent className="px-6">
          <SheetHeader>
            <SheetTitle>{t("animals.batchEdit")}</SheetTitle>
          </SheetHeader>
          <div className="space-y-5 mt-4">
            {/* Type */}
            <div className="flex items-start gap-3">
              <Checkbox
                checked={batchFields.type.enabled}
                onCheckedChange={(v) => setBatchFields((f) => ({ ...f, type: { ...f.type, enabled: !!v } }))}
                className="mt-2"
              />
              <FieldGroup className="flex-1">
                <Field>
                  <FieldLabel htmlFor="batch-type">{t("animals.type")}</FieldLabel>
                  <Select
                    value={batchFields.type.value}
                    onValueChange={(v) => setBatchFields((f) => ({ ...f, type: { enabled: true, value: v as AnimalType } }))}
                  >
                    <SelectTrigger id="batch-type" disabled={!batchFields.type.enabled}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ANIMAL_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>{t(`animals.types.${type}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>
            </div>

            {/* Usage */}
            <div className="flex items-start gap-3">
              <Checkbox
                checked={batchFields.usage.enabled}
                onCheckedChange={(v) => setBatchFields((f) => ({ ...f, usage: { ...f.usage, enabled: !!v } }))}
                className="mt-2"
              />
              <FieldGroup className="flex-1">
                <Field>
                  <FieldLabel htmlFor="batch-usage">{t("animals.usage")}</FieldLabel>
                  <Select
                    value={batchFields.usage.value}
                    onValueChange={(v) => setBatchFields((f) => ({ ...f, usage: { enabled: true, value: v as "milk" | "other" } }))}
                  >
                    <SelectTrigger id="batch-usage" disabled={!batchFields.usage.enabled}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="milk">{t("animals.usageOptions.milk")}</SelectItem>
                      <SelectItem value="other">{t("animals.usageOptions.other")}</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>
            </div>

            {/* Registered */}
            <div className="flex items-start gap-3">
              <Checkbox
                checked={batchFields.registered.enabled}
                onCheckedChange={(v) => setBatchFields((f) => ({ ...f, registered: { ...f.registered, enabled: !!v } }))}
                className="mt-2"
              />
              <FieldGroup className="flex-1">
                <Field>
                  <FieldLabel htmlFor="batch-registered">{t("animals.registered")}</FieldLabel>
                  <Select
                    value={String(batchFields.registered.value)}
                    onValueChange={(v) => setBatchFields((f) => ({ ...f, registered: { enabled: true, value: v === "true" } }))}
                  >
                    <SelectTrigger id="batch-registered" disabled={!batchFields.registered.enabled}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">{t("common.yes")}</SelectItem>
                      <SelectItem value="false">{t("common.no")}</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>
            </div>

            {/* Date of death */}
            <div className="flex items-start gap-3">
              <Checkbox
                checked={batchFields.dateOfDeath.enabled}
                onCheckedChange={(v) => setBatchFields((f) => ({ ...f, dateOfDeath: { ...f.dateOfDeath, enabled: !!v } }))}
                className="mt-2"
              />
              <FieldGroup className="flex-1">
                <Field>
                  <FieldLabel htmlFor="batch-dod">{t("animals.dateOfDeath")}</FieldLabel>
                  <Input
                    id="batch-dod"
                    type="date"
                    value={batchFields.dateOfDeath.value}
                    disabled={!batchFields.dateOfDeath.enabled}
                    onChange={(e) => setBatchFields((f) => ({ ...f, dateOfDeath: { enabled: true, value: e.target.value } }))}
                  />
                </Field>
              </FieldGroup>
            </div>

            {/* Death reason */}
            <div className="flex items-start gap-3">
              <Checkbox
                checked={batchFields.deathReason.enabled}
                onCheckedChange={(v) => setBatchFields((f) => ({ ...f, deathReason: { ...f.deathReason, enabled: !!v } }))}
                className="mt-2"
              />
              <FieldGroup className="flex-1">
                <Field>
                  <FieldLabel htmlFor="batch-death-reason">{t("animals.deathReason")}</FieldLabel>
                  <Select
                    value={batchFields.deathReason.value}
                    onValueChange={(v) => setBatchFields((f) => ({ ...f, deathReason: { enabled: true, value: v as "died" | "slaughtered" } }))}
                  >
                    <SelectTrigger id="batch-death-reason" disabled={!batchFields.deathReason.enabled}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="died">{t("animals.deathReasons.died")}</SelectItem>
                      <SelectItem value="slaughtered">{t("animals.deathReasons.slaughtered")}</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>
            </div>

            {batchMutation.error && (
              <p className="text-destructive text-sm">{batchMutation.error.message}</p>
            )}

            <Button
              className="w-full"
              disabled={
                !Object.values(batchFields).some((f) => f.enabled) ||
                batchMutation.isPending
              }
              onClick={() => batchMutation.mutate(selectedIds)}
            >
              {batchMutation.isPending
                ? t("common.loading")
                : t("animals.batchApply", { count: selectedIds.length })}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </PageContent>
  );
}

function AnimalTypePieChart({ animals }: { animals: Animal[] }) {
  const { t } = useTranslation();

  const pieData = useMemo(() => {
    const counts: Partial<Record<AnimalType, number>> = {};
    for (const animal of animals) {
      counts[animal.type] = (counts[animal.type] ?? 0) + 1;
    }
    return Object.entries(counts).map(([type, count], i) => ({
      name: t(`animals.types.${type}`),
      value: count,
      itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] },
    }));
  }, [animals, t]);

  const option = {
    tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
    legend: { bottom: 0, type: "scroll", textStyle: { fontSize: 11 } },
    series: [
      {
        type: "pie",
        radius: ["40%", "70%"],
        center: ["50%", "45%"],
        data: pieData,
        label: {
          show: true,
          formatter: "{b}: {c}",
          fontSize: 11,
        },
        emphasis: { label: { fontSize: 13, fontWeight: "bold" } },
      },
    ],
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{t("animals.chartByType")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ReactECharts option={option} style={{ height: 220 }} notMerge />
      </CardContent>
    </Card>
  );
}

function ageYears(dateOfBirth: string): number {
  return (Date.now() - new Date(dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
}

function AgeDistributionChart({ animals }: { animals: Animal[] }) {
  const { t } = useTranslation();
  const [selectedType, setSelectedType] = useState<AnimalType | "all">("all");

  const typesPresent = useMemo(
    () => ANIMAL_TYPES.filter((type) => animals.some((a) => a.type === type && a.dateOfBirth)),
    [animals],
  );

  const typeColorMap = useMemo(
    () => Object.fromEntries(ANIMAL_TYPES.map((type, i) => [type, CHART_COLORS[i % CHART_COLORS.length]])),
    [],
  );

  const option = useMemo(() => {
    const visibleTypes = selectedType === "all" ? typesPresent : typesPresent.filter((t) => t === selectedType);

    return {
      tooltip: {
        trigger: "item",
        // data format: [ageYears, yJitter, name, type]
        formatter: (params: { data: [number, number, string, string] }) =>
          `${params.data[2]}<br/>${t(`animals.types.${params.data[3]}`)}: ${params.data[0].toFixed(1)} ${t("animals.years")}`,
      },
      legend: { bottom: 0, type: "scroll", textStyle: { fontSize: 11 } },
      grid: { left: 16, right: 16, top: 10, bottom: 40 },
      xAxis: {
        type: "value",
        min: 0,
        name: t("animals.years"),
        nameLocation: "end",
        nameTextStyle: { fontSize: 10 },
        axisLabel: { fontSize: 10 },
      },
      // y-axis is pure jitter spread — hide everything
      yAxis: { type: "value", min: -1, max: 1, show: false },
      series: visibleTypes.map((type) => ({
        name: t(`animals.types.${type}`),
        type: "scatter",
        symbolSize: 8,
        itemStyle: { color: typeColorMap[type], opacity: 0.8 },
        data: animals
          .filter((a) => a.type === type && a.dateOfBirth)
          .map((a) => {
            const age = +ageYears(a.dateOfBirth).toFixed(2);
            // deterministic y jitter so dots spread vertically without meaning
            const hash = a.id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
            const yJitter = ((hash % 100) / 100) * 2 - 1; // range [-1, 1]
            return [age, yJitter, a.name, type];
          }),
      })),
    };
  }, [animals, typesPresent, typeColorMap, selectedType, t]);

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">{t("animals.chartAgeDistribution")}</CardTitle>
        <Select value={selectedType} onValueChange={(v) => setSelectedType(v as AnimalType | "all")}>
          <SelectTrigger className="h-7 text-xs w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            {typesPresent.map((type) => (
              <SelectItem key={type} value={type}>{t(`animals.types.${type}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <ReactECharts option={option} style={{ height: 220 }} notMerge />
      </CardContent>
    </Card>
  );
}
