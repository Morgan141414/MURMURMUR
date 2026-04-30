import { useEffect, useState, type ChangeEvent } from 'react'
import { Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DateRange {
  from: string
  to: string
}

interface DateRangePickerProps {
  value?: DateRange
  onChange: (range: DateRange) => void
  className?: string
  placeholder?: string
}

export function DateRangePicker({
  value,
  onChange,
  className,
  placeholder = 'Select date range',
}: DateRangePickerProps) {
  const [localFrom, setLocalFrom] = useState(value?.from ?? '')
  const [localTo, setLocalTo] = useState(value?.to ?? '')

  useEffect(() => {
    setLocalFrom(value?.from ?? '')
    setLocalTo(value?.to ?? '')
  }, [value?.from, value?.to])

  function handleFromChange(e: ChangeEvent<HTMLInputElement>) {
    const from = e.target.value
    setLocalFrom(from)
    if (from && localTo) onChange({ from, to: localTo })
  }

  function handleToChange(e: ChangeEvent<HTMLInputElement>) {
    const to = e.target.value
    setLocalTo(to)
    if (localFrom && to) onChange({ from: localFrom, to })
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative">
        <Calendar className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          type="date"
          value={localFrom}
          onChange={handleFromChange}
          className="h-8 rounded-lg border border-border bg-background pl-8 pr-2 text-sm text-foreground focus:border-ring focus:outline-none"
          placeholder={placeholder}
        />
      </div>
      <span className="text-xs text-muted-foreground">&ndash;</span>
      <input
        type="date"
        value={localTo}
        onChange={handleToChange}
        min={localFrom}
        className="h-8 rounded-lg border border-border bg-background px-2 text-sm text-foreground focus:border-ring focus:outline-none"
      />
    </div>
  )
}
