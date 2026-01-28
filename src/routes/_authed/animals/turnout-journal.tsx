import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  outdoorJournalQueryOptions,
  outdoorJournalCalendarQueryOptions,
} from "@/api/outdoorJournal.queries";
import { animalGroupsQueryOptions } from "@/api/animalGroups.queries";
import { apiClient } from "@/api/client";
import type { AnimalGroup, OutdoorJournalEntry } from "@/api/types";
import { PageContent } from "@/components/PageContent";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowDown,
  ArrowUp,
  Trash2,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Settings,
  Plus,
} from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";

export const Route = createFileRoute("/_authed/animals/turnout-journal")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(outdoorJournalQueryOptions());
    queryClient.ensureQueryData(animalGroupsQueryOptions());
  },
  component: TurnoutJournal,
});

function TurnoutJournal() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const journalQuery = useQuery(outdoorJournalQueryOptions());
  const groupsQuery = useQuery(animalGroupsQueryOptions());

  const [activeTab, setActiveTab] = useState<"calendar" | "entries">(
    "calendar",
  );
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [groupsDialogOpen, setGroupsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] =
    useState<OutdoorJournalEntry | null>(null);
  const [entryToDelete, setEntryToDelete] =
    useState<OutdoorJournalEntry | null>(null);

  // Calendar state: current month and year
  const today = new Date();
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth());
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());

  // Calculate from/to dates for the calendar query (entire month)
  const calendarFrom = new Date(calendarYear, calendarMonth, 1).toISOString();
  const calendarTo = new Date(
    calendarYear,
    calendarMonth + 1,
    0,
    23,
    59,
    59,
  ).toISOString();

  const calendarQuery = useQuery(
    outdoorJournalCalendarQueryOptions(calendarFrom, calendarTo),
  );

  function handlePreviousMonth() {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(calendarYear - 1);
    } else {
      setCalendarMonth(calendarMonth - 1);
    }
  }

  function handleNextMonth() {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(calendarYear + 1);
    } else {
      setCalendarMonth(calendarMonth + 1);
    }
  }

  // Create entry mutation
  const createEntryMutation = useMutation({
    mutationFn: async (data: {
      animalGroupId: string;
      startDate: string;
      endDate: string;
      animalCount: number;
    }) => {
      const response = await apiClient.POST("/v1/outdoorJournal", {
        body: data,
      });
      if (response.error) {
        throw new Error("Failed to create entry");
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outdoorJournal"] });
      setEntryDialogOpen(false);
      setEntryToEdit(null);
    },
  });

  // Update entry mutation
  const updateEntryMutation = useMutation({
    mutationFn: async ({
      entryId,
      data,
    }: {
      entryId: string;
      data: {
        animalGroupId?: string;
        startDate?: string;
        endDate?: string;
        animalCount?: number;
      };
    }) => {
      const response = await apiClient.PATCH(
        "/v1/outdoorJournal/byId/{entryId}",
        {
          params: { path: { entryId } },
          body: data,
        },
      );
      if (response.error) {
        throw new Error("Failed to update entry");
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outdoorJournal"] });
      setEntryDialogOpen(false);
      setEntryToEdit(null);
    },
  });

  // Delete entry mutation
  const deleteEntryMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const response = await apiClient.DELETE(
        "/v1/outdoorJournal/byId/{entryId}",
        {
          params: { path: { entryId } },
        },
      );
      if (response.error) {
        throw new Error("Failed to delete entry");
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outdoorJournal"] });
      setDeleteDialogOpen(false);
      setEntryToDelete(null);
    },
  });

  function handleEditClick(entry: OutdoorJournalEntry) {
    setEntryToEdit(entry);
    setEntryDialogOpen(true);
  }

  function handleDeleteClick(entry: OutdoorJournalEntry) {
    setEntryToDelete(entry);
    setDeleteDialogOpen(true);
  }

  function handleConfirmDelete() {
    if (entryToDelete) {
      deleteEntryMutation.mutate(entryToDelete.id);
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString();
  }

  const columns = useMemo<ColumnDef<OutdoorJournalEntry>[]>(
    () => [
      {
        accessorKey: "animalGroup.name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="p-0 hover:bg-transparent justify-start"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("turnoutJournal.animalGroup")}
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ArrowDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => {
          const group = row.original.animalGroup;
          return (
            <div>
              <span className="font-medium">{group.name}</span>
              {group.description && (
                <span className="text-muted-foreground ml-2">
                  ({group.description})
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "startDate",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="p-0 hover:bg-transparent justify-start"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("turnoutJournal.startDate")}
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ArrowDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => formatDate(row.getValue("startDate")),
      },
      {
        accessorKey: "endDate",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="p-0 hover:bg-transparent justify-start"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("turnoutJournal.endDate")}
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ArrowDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => formatDate(row.getValue("endDate")),
      },
      {
        accessorKey: "animalCount",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="p-0 hover:bg-transparent justify-start"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("turnoutJournal.animalCount")}
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ArrowDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => row.getValue("animalCount"),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const entry = row.original;
          return (
            <div className="flex justify-end gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleEditClick(entry)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => handleDeleteClick(entry)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        },
      },
    ],
    [t],
  );

  const entries = journalQuery.data?.result ?? [];
  const groups = groupsQuery.data?.result ?? [];
  const calendarEntries = calendarQuery.data?.result ?? [];

  return (
    <PageContent title={t("turnoutJournal.title")} showBackButton={false}>
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "calendar" | "entries")}
      >
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="calendar">
              {t("turnoutJournal.calendar")}
            </TabsTrigger>
            <TabsTrigger value="entries">
              {t("turnoutJournal.entries")}
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setGroupsDialogOpen(true)}>
              <Settings className="h-4 w-4 mr-2" />
              {t("turnoutJournal.manageGroups")}
            </Button>
            <Button
              onClick={() => {
                setEntryToEdit(null);
                setEntryDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t("turnoutJournal.addEntry")}
            </Button>
          </div>
        </div>

        <TabsContent value="calendar">
          <CalendarView
            year={calendarYear}
            month={calendarMonth}
            entries={calendarEntries}
            groups={groups}
            onPreviousMonth={handlePreviousMonth}
            onNextMonth={handleNextMonth}
          />
        </TabsContent>

        <TabsContent value="entries">
          <DataTable
            data={entries}
            columns={columns}
            globalFilterFn={(row, _columnId, filterValue) => {
              const entry = row.original;
              const searchValue = filterValue.toLowerCase();
              return (
                entry.animalGroup.name.toLowerCase().includes(searchValue) ||
                (entry.animalGroup.description
                  ?.toLowerCase()
                  .includes(searchValue) ??
                  false)
              );
            }}
            defaultSorting={[{ id: "startDate", desc: true }]}
          />
        </TabsContent>
      </Tabs>

      {/* Entry dialog (create/edit) */}
      <EntryDialog
        open={entryDialogOpen}
        onOpenChange={(open) => {
          setEntryDialogOpen(open);
          if (!open) setEntryToEdit(null);
        }}
        entry={entryToEdit}
        groups={groups}
        onSubmit={(data) => {
          if (entryToEdit) {
            updateEntryMutation.mutate({ entryId: entryToEdit.id, data });
          } else {
            createEntryMutation.mutate(
              data as {
                animalGroupId: string;
                startDate: string;
                endDate: string;
                animalCount: number;
              },
            );
          }
        }}
        isPending={
          createEntryMutation.isPending || updateEntryMutation.isPending
        }
      />

      {/* Groups management dialog */}
      <GroupsDialog
        open={groupsDialogOpen}
        onOpenChange={setGroupsDialogOpen}
        groups={groups}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.confirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("turnoutJournal.deleteConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteEntryMutation.isPending
                ? t("common.loading")
                : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContent>
  );
}

// Calendar view component
function CalendarView({
  year,
  month,
  entries,
  groups,
  onPreviousMonth,
  onNextMonth,
}: {
  year: number;
  month: number;
  entries: OutdoorJournalEntry[];
  groups: AnimalGroup[];
  onPreviousMonth: () => void;
  onNextMonth: () => void;
}) {
  const { t } = useTranslation();

  const monthNames = [
    "Januar",
    "Februar",
    "März",
    "April",
    "Mai",
    "Juni",
    "Juli",
    "August",
    "September",
    "Oktober",
    "November",
    "Dezember",
  ];

  // Get all days in the month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Build a lookup: for each day and group, what's the animal count?
  // An entry is active on a given day if startDate <= day <= endDate
  function getAnimalCountForDay(
    day: number,
    groupId: string,
  ): number | undefined {
    const dayDate = new Date(year, month, day);
    for (const entry of entries) {
      if (entry.animalGroupId !== groupId) continue;
      const startDate = new Date(entry.startDate);
      const endDate = new Date(entry.endDate);
      // Normalize to day-only comparison
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      if (dayDate >= startDate && dayDate <= endDate) {
        return entry.animalCount;
      }
    }
    return undefined;
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {t("turnoutJournal.noGroups")}
      </div>
    );
  }

  return (
    <div>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="outline" size="icon" onClick={onPreviousMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold">
          {monthNames[month]} {year}
        </h2>
        <Button variant="outline" size="icon" onClick={onNextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-16">{t("turnoutJournal.calendar")}</TableHead>
              {groups.map((group) => (
                <TableHead key={group.id} className="text-center min-w-20">
                  <div className="flex flex-col">
                    <span>{group.name}</span>
                    {group.description && (
                      <span className="text-xs font-normal text-muted-foreground">
                        {group.description}
                      </span>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {days.map((day) => (
              <TableRow key={day}>
                <TableCell className="font-medium">{day}</TableCell>
                {groups.map((group) => {
                  const count = getAnimalCountForDay(day, group.id);
                  return (
                    <TableCell
                      key={group.id}
                      className={`text-center ${count !== undefined ? "bg-green-100" : ""}`}
                    >
                      {count ?? ""}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// Entry dialog component
function EntryDialog({
  open,
  onOpenChange,
  entry,
  groups,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: OutdoorJournalEntry | null;
  groups: AnimalGroup[];
  onSubmit: (data: {
    animalGroupId?: string;
    startDate?: string;
    endDate?: string;
    animalCount?: number;
  }) => void;
  isPending: boolean;
}) {
  const { t } = useTranslation();

  const [animalGroupId, setAnimalGroupId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [animalCount, setAnimalCount] = useState("");

  // Reset form when entry changes or dialog opens
  const resetForm = () => {
    if (entry) {
      setAnimalGroupId(entry.animalGroupId);
      setStartDate(entry.startDate.split("T")[0]);
      setEndDate(entry.endDate.split("T")[0]);
      setAnimalCount(String(entry.animalCount));
    } else {
      setAnimalGroupId(groups[0]?.id ?? "");
      setStartDate("");
      setEndDate("");
      setAnimalCount("");
    }
  };

  // Reset when dialog opens
  if (open && !animalGroupId && !entry && groups.length > 0) {
    setAnimalGroupId(groups[0].id);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onSubmit({
      animalGroupId,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      animalCount: Number(animalCount),
    });
  }

  function handleOpenChange(isOpen: boolean) {
    if (isOpen) {
      resetForm();
    }
    onOpenChange(isOpen);
  }

  const isValid =
    animalGroupId && startDate && endDate && animalCount && Number(animalCount) > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {entry
                ? t("turnoutJournal.editEntry")
                : t("turnoutJournal.addEntry")}
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="animalGroupId">
                  {t("turnoutJournal.animalGroup")} *
                </FieldLabel>
                <Select value={animalGroupId} onValueChange={setAnimalGroupId}>
                  <SelectTrigger id="animalGroupId">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                        {group.description && ` (${group.description})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>

            <div className="grid grid-cols-2 gap-4">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="startDate">
                    {t("turnoutJournal.startDate")} *
                  </FieldLabel>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </Field>
              </FieldGroup>

              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="endDate">
                    {t("turnoutJournal.endDate")} *
                  </FieldLabel>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </Field>
              </FieldGroup>
            </div>

            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="animalCount">
                  {t("turnoutJournal.animalCount")} *
                </FieldLabel>
                <Input
                  id="animalCount"
                  type="number"
                  min="1"
                  value={animalCount}
                  onChange={(e) => setAnimalCount(e.target.value)}
                />
              </Field>
            </FieldGroup>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={!isValid || isPending}>
              {isPending ? t("common.loading") : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Groups management dialog
function GroupsDialog({
  open,
  onOpenChange,
  groups,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: AnimalGroup[];
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [addGroupDialogOpen, setAddGroupDialogOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<AnimalGroup | null>(null);
  const [deleteGroup, setDeleteGroup] = useState<AnimalGroup | null>(null);

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const response = await apiClient.POST("/v1/animalGroups", { body: data });
      if (response.error) {
        throw new Error("Failed to create group");
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["animalGroups"] });
      setAddGroupDialogOpen(false);
    },
  });

  // Update group mutation
  const updateGroupMutation = useMutation({
    mutationFn: async ({
      groupId,
      data,
    }: {
      groupId: string;
      data: { name?: string; description?: string };
    }) => {
      const response = await apiClient.PATCH(
        "/v1/animalGroups/byId/{groupId}",
        {
          params: { path: { groupId } },
          body: data,
        },
      );
      if (response.error) {
        throw new Error("Failed to update group");
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["animalGroups"] });
      setEditGroup(null);
    },
  });

  // Delete group mutation
  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const response = await apiClient.DELETE(
        "/v1/animalGroups/byId/{groupId}",
        {
          params: { path: { groupId } },
        },
      );
      if (response.error) {
        throw new Error("Failed to delete group");
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["animalGroups"] });
      setDeleteGroup(null);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("turnoutJournal.animalGroups")}</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setAddGroupDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t("turnoutJournal.addGroup")}
            </Button>
          </div>

          {groups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("turnoutJournal.noGroups")}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("turnoutJournal.groupName")}</TableHead>
                    <TableHead>
                      {t("turnoutJournal.groupDescription")}
                    </TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map((group) => (
                    <TableRow key={group.id}>
                      <TableCell className="font-medium">{group.name}</TableCell>
                      <TableCell>{group.description || "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditGroup(group)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteGroup(group)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.close")}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Add group dialog */}
      <GroupFormDialog
        open={addGroupDialogOpen}
        onOpenChange={setAddGroupDialogOpen}
        group={null}
        onSubmit={(data) => createGroupMutation.mutate(data)}
        isPending={createGroupMutation.isPending}
      />

      {/* Edit group dialog */}
      <GroupFormDialog
        open={!!editGroup}
        onOpenChange={(open) => !open && setEditGroup(null)}
        group={editGroup}
        onSubmit={(data) =>
          editGroup && updateGroupMutation.mutate({ groupId: editGroup.id, data })
        }
        isPending={updateGroupMutation.isPending}
      />

      {/* Delete group confirmation */}
      <AlertDialog
        open={!!deleteGroup}
        onOpenChange={(open) => !open && setDeleteGroup(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.confirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("turnoutJournal.deleteGroupConfirm")}
              {deleteGroup && (
                <span className="font-medium block mt-2">
                  {deleteGroup.name}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteGroup && deleteGroupMutation.mutate(deleteGroup.id)}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteGroupMutation.isPending
                ? t("common.loading")
                : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

// Group form dialog (for create/edit)
function GroupFormDialog({
  open,
  onOpenChange,
  group,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: AnimalGroup | null;
  onSubmit: (data: { name: string; description?: string }) => void;
  isPending: boolean;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  function resetForm() {
    if (group) {
      setName(group.name);
      setDescription(group.description ?? "");
    } else {
      setName("");
      setDescription("");
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onSubmit({
      name,
      description: description || undefined,
    });
  }

  function handleOpenChange(isOpen: boolean) {
    if (isOpen) {
      resetForm();
    }
    onOpenChange(isOpen);
  }

  const isValid = name.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {group
                ? t("turnoutJournal.editGroup")
                : t("turnoutJournal.addGroup")}
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="groupName">
                  {t("turnoutJournal.groupName")} *
                </FieldLabel>
                <Input
                  id="groupName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="A1"
                />
              </Field>
            </FieldGroup>

            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="groupDescription">
                  {t("turnoutJournal.groupDescription")}
                </FieldLabel>
                <Input
                  id="groupDescription"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Milchkühe"
                />
              </Field>
            </FieldGroup>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={!isValid || isPending}>
              {isPending ? t("common.loading") : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
