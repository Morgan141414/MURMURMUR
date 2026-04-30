const colorMap: Record<string, { bg: string; text: string }> = {
  Draft:       { bg: 'var(--acc-gray-100)',   text: 'var(--acc-gray-600)' },
  Submitted:   { bg: 'var(--acc-blue-100)',   text: 'var(--acc-blue-600)' },
  Paid:        { bg: 'var(--acc-green-100)',   text: 'var(--acc-green-600)' },
  Unpaid:      { bg: 'var(--acc-orange-100)',  text: 'var(--acc-orange-500)' },
  'Partly Paid': { bg: 'var(--acc-yellow-100)', text: 'var(--acc-yellow-500)' },
  Cancelled:   { bg: 'var(--acc-red-100)',    text: 'var(--acc-red-600)' },
  Return:      { bg: 'var(--acc-violet-50)',  text: 'var(--acc-violet-500)' },
}

export function AccStatusPill({ status }: { status: string }) {
  const c = colorMap[status] ?? colorMap.Draft
  return (
    <span className="acc-pill" style={{ background: c.bg, color: c.text }}>
      {status}
    </span>
  )
}
