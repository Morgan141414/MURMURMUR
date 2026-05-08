import { useState, useMemo, type ComponentType, type ReactNode } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
  type ColumnFiltersState,
  type FilterFn,
} from '@tanstack/react-table'
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EmptyState } from './EmptyState'
import { TableSkeleton } from './LoadingState'
import { ErrorState } from './ErrorState'

/* Re-export ColumnDef for consumers */
export type { ColumnDef }

/* ── Bulk action bar ── */
interface BulkAction {
  label: string
  icon?: ReactNode
  variant?: 'default' | 'destructive'
  onClick: (selectedIds: string[]) => void
}

/* ── Props ── */
interface DataTableProps<T> {
  columns: ColumnDef<T, unknown>[]
  data: T[]
  loading?: boolean
  error?: string
  onRetry?: () => void
  emptyTitle?: string
  emptyDescription?: string
  emptyIcon?: ComponentType<{ className?: string }>
  emptyAction?: ReactNode
  onRowClick?: (row: T) => void
  pageSize?: number
  searchable?: boolean
  searchPlaceholder?: string
  globalFilter?: string
  onGlobalFilterChange?: (value: string) => void
  bulkActions?: BulkAction[]
  getRowId?: (row: T) => string
  stickyHeader?: boolean
  className?: string
}

export function DataTable<T>({
  columns,
  data,
  loading,
  error,
  onRetry,
  emptyTitle = 'Нет данных',
  emptyDescription,
  emptyIcon,
  emptyAction,
  onRowClick,
  pageSize = 10,
  searchable = false,
  searchPlaceholder = 'Поиск...',
  globalFilter: externalFilter,
  onGlobalFilterChange,
  bulkActions,
  getRowId,
  stickyHeader = true,
  className,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [internalFilter, setInternalFilter] = useState('')

  const globalFilter = externalFilter ?? internalFilter
  const setGlobalFilter = onGlobalFilterChange ?? setInternalFilter

  const enableSelection = !!bulkActions?.length
  const globalFilterFn = useMemo<FilterFn<T>>(
    () => (row, _, filterValue) => {
      const query = String(filterValue ?? '').trim().toLowerCase()
      if (!query) return true

      return row
        .getVisibleCells()
        .some((cell) => String(cell.getValue() ?? '').toLowerCase().includes(query))
    },
    [],
  )

  const allColumns = useMemo(() => {
    if (!enableSelection) return columns

    const selectCol: ColumnDef<T, unknown> = {
      id: '_select',
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          className="h-3.5 w-3.5 rounded border-border accent-primary"
          aria-label="Выбрать все строки"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          onClick={(e) => e.stopPropagation()}
          className="h-3.5 w-3.5 rounded border-border accent-primary"
          aria-label="Select row"
        />
      ),
      size: 40,
      enableSorting: false,
    }
    return [selectCol, ...columns]
  }, [columns, enableSelection])

  const table = useReactTable({
    data,
    columns: allColumns,
    state: { sorting, rowSelection, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn,
    getRowId: getRowId as never,
    enableRowSelection: enableSelection,
    initialState: { pagination: { pageSize } },
  })

  const selectedIds = Object.keys(rowSelection).filter((k) => rowSelection[k])
  const filteredCount = table.getFilteredRowModel().rows.length
  const pageIndex = table.getState().pagination.pageIndex
  const pageSizeState = table.getState().pagination.pageSize
  const showPagination = filteredCount > pageSizeState

  if (loading) return <TableSkeleton rows={pageSize > 5 ? 5 : pageSize} cols={columns.length} />
  if (error) return <ErrorState title="Failed to load data" message={error} onRetry={onRetry} variant="server" />

  return (
    <div className={cn('space-y-3', className)}>
      {/* Search & bulk bar */}
      {(searchable || selectedIds.length > 0) && (
        <div className="flex items-center justify-between gap-3">
          {searchable && selectedIds.length === 0 && (
            <input
              type="text"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-8 w-full max-w-xs rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
            />
          )}
          {selectedIds.length > 0 && bulkActions && (
            <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5">
              <span className="text-xs font-medium text-primary">
                {selectedIds.length} selected
              </span>
              <div className="h-4 w-px bg-border" />
              {bulkActions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => action.onClick(selectedIds)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                    action.variant === 'destructive'
                      ? 'text-destructive hover:bg-destructive/10'
                      : 'text-foreground hover:bg-accent',
                  )}
                >
                  {action.icon}
                  {action.label}
                </button>
              ))}
              <button
                onClick={() => setRowSelection({})}
                className="ml-1 text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      {filteredCount === 0 ? (
        <EmptyState
          icon={emptyIcon}
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-border bg-muted/40">
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort()
                    const sorted = header.column.getIsSorted()
                    return (
                      <th
                        key={header.id}
                        className={cn(
                          'px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground',
                          stickyHeader && 'sticky top-0 z-10 bg-muted/40 backdrop-blur-sm',
                          canSort && 'cursor-pointer select-none hover:text-foreground transition-colors',
                        )}
                        style={header.column.getSize() !== 150 ? { width: header.column.getSize() } : undefined}
                        onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      >
                        <span className="flex items-center gap-1">
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort && (
                            sorted === 'asc' ? <ChevronUp className="h-3 w-3" />
                            : sorted === 'desc' ? <ChevronDown className="h-3 w-3" />
                            : <ChevronsUpDown className="h-3 w-3 opacity-30" />
                          )}
                        </span>
                      </th>
                    )
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    'border-b border-border last:border-0 transition-colors',
                    onRowClick && 'cursor-pointer',
                    row.getIsSelected() ? 'bg-primary/5' : 'hover:bg-surface-hover',
                  )}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-foreground">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {showPagination && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-muted-foreground">
            Showing {pageIndex * pageSizeState + 1}
            &ndash;
            {Math.min((pageIndex + 1) * pageSizeState, filteredCount)}
            {' '}of {filteredCount}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            {Array.from({ length: table.getPageCount() }, (_, i) => (
              <button
                key={i}
                onClick={() => table.setPageIndex(i)}
                className={cn(
                  'flex h-7 min-w-7 items-center justify-center rounded-md px-2 text-xs font-medium transition-colors',
                  i === table.getState().pagination.pageIndex
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                {i + 1}
              </button>
            )).slice(
              Math.max(0, table.getState().pagination.pageIndex - 2),
              Math.min(table.getPageCount(), table.getState().pagination.pageIndex + 3),
            )}
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
