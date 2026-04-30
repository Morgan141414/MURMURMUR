import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

export interface AccColumn {
  key: string
  label: string
  width?: number
  align?: 'left' | 'right' | 'center'
  render?: (value: any, row: any) => ReactNode
}

interface AccListProps {
  columns: AccColumn[]
  data: any[]
  onRowClick?: (row: any) => void
  page?: number
  pageSize?: number
  total?: number
  onPageChange?: (page: number) => void
  emptyTitle?: string
  emptyAction?: { label: string; onClick: () => void }
}

export function AccList({
  columns,
  data,
  onRowClick,
  page = 1,
  pageSize = 50,
  total,
  onPageChange,
  emptyTitle,
  emptyAction,
}: AccListProps) {
  const gridCols = columns.map((c) => `${c.width ?? 1}fr`).join(' ')
  const totalItems = total ?? data.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  if (data.length === 0) {
    return (
      <div className="acc-empty">
        <div className="acc-empty-bars">
          {[40, 56, 32, 48].map((h, i) => (
            <div key={i} className="acc-empty-bar" style={{ height: h }} />
          ))}
        </div>
        <p className="acc-empty-text">{emptyTitle ?? 'No entries found'}</p>
        {emptyAction && (
          <button className="acc-btn acc-btn--primary" onClick={emptyAction.onClick}>
            {emptyAction.label}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="acc-list-header" style={{ gridTemplateColumns: `2rem ${gridCols}` }}>
        <span>#</span>
        {columns.map((col) => (
          <span key={col.key} style={{ textAlign: col.align ?? 'left' }}>{col.label}</span>
        ))}
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto">
        {data.map((row, idx) => (
          <div
            key={row.id ?? idx}
            onClick={() => onRowClick?.(row)}
            className="acc-list-row"
            style={{ gridTemplateColumns: `2rem ${gridCols}` }}
          >
            <span style={{ color: 'var(--acc-gray-400)', fontSize: 12 }}>{(page - 1) * pageSize + idx + 1}</span>
            {columns.map((col) => (
              <span key={col.key} style={{ textAlign: col.align ?? 'left' }}>
                {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
              </span>
            ))}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && onPageChange && (
        <div className="acc-pagination">
          <span>{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalItems)} of {totalItems}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => onPageChange(page - 1)} disabled={page <= 1} className="acc-btn acc-btn--icon" style={{ height: 28, width: 28 }}>
              <ChevronLeft size={14} />
            </button>
            <span style={{ padding: '0 8px' }}>{page} / {totalPages}</span>
            <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} className="acc-btn acc-btn--icon" style={{ height: 28, width: 28 }}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
