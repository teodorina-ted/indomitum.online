import { useState, useMemo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Filter,
  X,
  GripVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface Column<T> {
  id: string;
  header: string;
  accessorKey?: keyof T;
  accessorFn?: (row: T) => any;
  cell?: (row: T) => React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  minWidth?: number;
  defaultWidth?: number;
  hideOnMobile?: boolean;
  hideOnTablet?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  pageSize?: number;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  getRowId: (row: T) => string;
  onRowAction?: (row: T) => React.ReactNode;
  emptyState?: React.ReactNode;
}

export function DataTable<T>({
  data,
  columns,
  pageSize = 100,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  getRowId,
  onRowAction,
  emptyState,
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [resizing, setResizing] = useState<string | null>(null);
  const [rowsPerPage, setRowsPerPage] = useState<number>(pageSize);
  const tableRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startWidth = useRef(0);

  // Initialize column widths
  useEffect(() => {
    const initialWidths: Record<string, number> = {};
    columns.forEach((col) => {
      initialWidths[col.id] = col.defaultWidth || 150;
    });
    setColumnWidths(initialWidths);
  }, [columns]);

  // Handle column resize
  const handleResizeStart = (e: React.MouseEvent, columnId: string) => {
    e.preventDefault();
    setResizing(columnId);
    startX.current = e.clientX;
    startWidth.current = columnWidths[columnId] || 150;

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startX.current;
      const newWidth = Math.max(80, startWidth.current + diff);
      setColumnWidths((prev) => ({ ...prev, [columnId]: newWidth }));
    };

    const handleMouseUp = () => {
      setResizing(null);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // Get cell value
  const getCellValue = (row: T, column: Column<T>): any => {
    if (column.accessorFn) return column.accessorFn(row);
    if (column.accessorKey) return row[column.accessorKey];
    return null;
  };

  // Filter data
  const filteredData = useMemo(() => {
    let result = [...data];

    // Global search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((row) =>
        columns.some((col) => {
          const value = getCellValue(row, col);
          return value != null && String(value).toLowerCase().includes(query);
        })
      );
    }

    // Column filters
    Object.entries(columnFilters).forEach(([columnId, filterValue]) => {
      if (!filterValue) return;
      const column = columns.find((c) => c.id === columnId);
      if (!column) return;

      const query = filterValue.toLowerCase();
      result = result.filter((row) => {
        const value = getCellValue(row, column);
        return value != null && String(value).toLowerCase().includes(query);
      });
    });

    return result;
  }, [data, searchQuery, columnFilters, columns]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;

    const column = columns.find((c) => c.id === sortColumn);
    if (!column) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = getCellValue(a, column);
      const bValue = getCellValue(b, column);

      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortDirection === "asc" ? 1 : -1;
      if (bValue == null) return sortDirection === "asc" ? -1 : 1;

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      if (aValue instanceof Date && bValue instanceof Date) {
        return sortDirection === "asc"
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime();
      }

      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      const comparison = aStr.localeCompare(bStr);
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredData, sortColumn, sortDirection, columns]);

  // Pagination
  const effectivePageSize = rowsPerPage <= 0 ? sortedData.length || 1 : rowsPerPage;
  const totalPages = Math.ceil(sortedData.length / effectivePageSize);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * effectivePageSize;
    return sortedData.slice(start, start + effectivePageSize);
  }, [sortedData, currentPage, effectivePageSize]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, columnFilters]);

  useEffect(() => {
    setRowsPerPage(pageSize);
  }, [pageSize]);

  const handleSort = (columnId: string) => {
    if (sortColumn === columnId) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(columnId);
      setSortDirection("asc");
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange?.(paginatedData.map(getRowId));
    } else {
      onSelectionChange?.([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange?.([...selectedIds, id]);
    } else {
      onSelectionChange?.(selectedIds.filter((s) => s !== id));
    }
  };

  const SortIcon = ({ columnId }: { columnId: string }) => {
    if (sortColumn !== columnId) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search all columns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {Object.keys(columnFilters).length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setColumnFilters({})}
            className="text-muted-foreground"
          >
            <X className="w-4 h-4 mr-1" />
            Clear Filters
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div
          ref={tableRef}
          className="overflow-x-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
          style={{ maxHeight: "70vh" }}
        >
          <table className="w-full" style={{ minWidth: "900px" }}>
            <thead className="bg-muted sticky top-0 z-10 border-b border-border">
              <tr>
                {selectable && (
                  <th className="w-12 px-4 py-3 text-left sticky left-0 bg-muted">
                    <Checkbox
                      checked={
                        selectedIds.length === paginatedData.length &&
                        paginatedData.length > 0
                      }
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all"
                    />
                  </th>
                )}
                {columns.map((column) => (
                  <th
                    key={column.id}
                    className={`px-4 py-3 text-left relative group ${
                      column.hideOnMobile ? "hidden md:table-cell" : ""
                    } ${column.hideOnTablet ? "hidden lg:table-cell" : ""}`}
                    style={{ width: columnWidths[column.id] || column.defaultWidth || 150 }}
                  >
                    <div className="flex items-center gap-2">
                      {column.sortable !== false ? (
                        <button
                          onClick={() => handleSort(column.id)}
                          className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
                        >
                          {column.header}
                          <SortIcon columnId={column.id} />
                        </button>
                      ) : (
                        <span className="text-sm font-medium text-muted-foreground">
                          {column.header}
                        </span>
                      )}

                      {column.filterable !== false && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className={`p-1 rounded hover:bg-muted ${
                                columnFilters[column.id] ? "text-primary" : "text-muted-foreground opacity-0 group-hover:opacity-100"
                              } transition-opacity`}
                            >
                              <Filter className="w-3 h-3" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-48 p-2">
                            <Input
                              placeholder={`Filter ${column.header}...`}
                              value={columnFilters[column.id] || ""}
                              onChange={(e) =>
                                setColumnFilters((prev) => ({
                                  ...prev,
                                  [column.id]: e.target.value,
                                }))
                              }
                              className="h-8 text-sm"
                            />
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                    {/* Resize Handle */}
                    <div
                      className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 ${
                        resizing === column.id ? "bg-primary" : ""
                      }`}
                      onMouseDown={(e) => handleResizeStart(e, column.id)}
                    >
                      <GripVertical className="w-3 h-3 text-muted-foreground/50 absolute top-1/2 -translate-y-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100" />
                    </div>
                  </th>
                ))}
                {onRowAction && (
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground sticky right-0 bg-muted">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedData.map((row) => {
                const rowId = getRowId(row);
                return (
                  <tr key={rowId} className="hover:bg-muted/30 transition-colors">
                    {selectable && (
                      <td className="px-4 py-3 sticky left-0 bg-card">
                        <Checkbox
                          checked={selectedIds.includes(rowId)}
                          onCheckedChange={(checked) =>
                            handleSelectRow(rowId, checked as boolean)
                          }
                        />
                      </td>
                    )}
                    {columns.map((column) => (
                      <td
                        key={column.id}
                        className={`px-4 py-3 text-sm ${
                          column.hideOnMobile ? "hidden md:table-cell" : ""
                        } ${column.hideOnTablet ? "hidden lg:table-cell" : ""}`}
                        style={{ width: columnWidths[column.id] || column.defaultWidth || 150 }}
                      >
                        {column.cell ? column.cell(row) : String(getCellValue(row, column) ?? "—")}
                      </td>
                    ))}
                    {onRowAction && (
                      <td className="px-4 py-3 sticky right-0 bg-card">
                        <div className="flex items-center justify-end gap-1">
                          {onRowAction(row)}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {paginatedData.length === 0 && (
          <div className="py-12 text-center">
            {emptyState || (
              <p className="text-muted-foreground">No data found</p>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * effectivePageSize + 1}-
            {Math.min(currentPage * effectivePageSize, sortedData.length)} of {sortedData.length}
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  {rowsPerPage <= 0 ? "All" : rowsPerPage} / page
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {[20, 50, 100].map((n) => (
                  <DropdownMenuItem
                    key={n}
                    onClick={() => {
                      setRowsPerPage(n);
                      setCurrentPage(1);
                    }}
                  >
                    {n} / page
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem
                  onClick={() => {
                    setRowsPerPage(0);
                    setCurrentPage(1);
                  }}
                >
                  Show all
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              <ChevronsRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
