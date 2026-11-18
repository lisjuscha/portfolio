interface Props {
  value: number
  max: number
  color?: string
  label?: string
  sublabel?: string
  hidden?: boolean
}

export function ProgressBar({ value, max, color = '#2563eb', label, sublabel, hidden = false }: Props) {
  const pct = max === 0 ? 0 : Math.min(100, (value / max) * 100)

  return (
    <div className="space-y-1">
      {(label || sublabel) && (
        <div className="flex justify-between items-baseline">
          {label && <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>}
          {sublabel && <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">{hidden ? '••••' : sublabel}</span>}
        </div>
      )}
      <div className="h-2 bg-gray-200 dark:bg-[#2c2c2e] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}
