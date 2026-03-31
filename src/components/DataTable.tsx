import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type PaginationState,
  type FilterFn,
  type RowSelectionState,
  type OnChangeFn,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const PAGE_SIZE_OPTIONS = [10, 20, 50, "all"] as const;

interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  onRowClick?: (row: TData) => void;
  globalFilterFn?: FilterFn<TData>;
  defaultSorting?: SortingState;
  defaultPageSize?: number;
  searchPlaceholder?: string;
  showSearch?: boolean;
  showPagination?: boolean;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  filterSlot?: ReactNode;
}

export function DataTable<TData>({
  data,
  columns,
  onRowClick,
  globalFilterFn,
  defaultSorting = [],
  defaultPageSize = 20,
  searchPlaceholder,
  showSearch = true,
  showPagination = true,
  rowSelection,
  onRowSelectionChange,
  filterSlot,
}: DataTableProps<TData>) {
  const { t } = useTranslation();

  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>(defaultSorting);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: defaultPageSize,
  });

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn,
    enableRowSelection: rowSelection !== undefined,
    onRowSelectionChange,
    state: {
      sorting,
      pagination,
      globalFilter,
      ...(rowSelection !== undefined ? { rowSelection } : {}),
    },
  });

  const totalRows = table.getFilteredRowModel().rows.length;
  const pageCount = table.getPageCount();
  const currentPage = table.getState().pagination.pageIndex + 1;

  return (
    <div className="flex flex-col gap-4">
      {(showSearch || filterSlot) && (
        <div className="flex items-center gap-2">
          {showSearch && (
            <Input
              placeholder={searchPlaceholder ?? t("common.search")}
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="max-w-sm"
            />
          )}
          {filterSlot}
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader className="bg-muted/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-muted/50">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-left">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={onRowClick ? "cursor-pointer" : undefined}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t("common.noResults")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {showPagination && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{t("common.rowsPerPage")}</span>
            <Select
              value={
                pagination.pageSize >= data.length && data.length > 0
                  ? "all"
                  : String(pagination.pageSize)
              }
              onValueChange={(value) => {
                if (value === "all") {
                  table.setPageSize(data.length || 1000);
                } else {
                  table.setPageSize(Number(value));
                }
              }}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size === "all" ? t("common.all") : size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="ml-4">
              {t("common.showingOf", {
                showing: table.getRowModel().rows.length,
                total: totalRows,
              })}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {t("common.pageOf", {
                current: currentPage,
                total: pageCount || 1,
              })}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
