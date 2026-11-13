import type { Anlageklasse } from '../types'

export const ANLAGEKLASSE_COLORS: Record<Anlageklasse, string> = {
  Aktie: '#2563eb',
  ETF: '#7c3aed',
  VL: '#059669',
  Zinssparen: '#0891b2',
  Sparbrief: '#0e7490',
  Festgeld: '#1d4ed8',
  Sonstiges: '#6b7280',
}

interface Segment {
  label: string
  value: number
  color: string
}

interface Props {
  segments: Segment[]
  size?: number
  strokeWidth?: number
  hidden?: boolean
}

export function DonutChart({ segments, size = 180, strokeWidth = 32, hidden = false }: Props) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  if (total === 0 || hidden) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={(size - strokeWidth) / 2}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200 dark:text-[#2c2c2e]"
        />
        {hidden && (
          <text x={size / 2} y={size / 2 + 6} textAnchor="middle" fontSize={size * 0.12} fill="currentColor" className="fill-gray-400 dark:fill-gray-500">
            ••••
          </text>
        )}
      </svg>
    )
  }

  const r = (size - strokeWidth) / 2
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * r

  let offset = 0
  const arcs = segments.map(seg => {
    const pct = seg.value / total
    const dash = pct * circumference
    const arc = { ...seg, pct, dash, offset }
    offset += dash
    return arc
  })

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-gray-100 dark:text-[#2c2c2e]"
      />
      {arcs.map((arc, i) => (
        <circle
          key={i}
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={arc.color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${arc.dash} ${circumference - arc.dash}`}
          strokeDashoffset={-arc.offset}
          strokeLinecap="butt"
        />
      ))}
    </svg>
  )
}
