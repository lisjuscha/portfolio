import { fmtEuroCompact, fmtDateMonth } from '../utils/format'
import type { WertSnapshot } from '../types'

interface Props {
  snapshots: WertSnapshot[]
  height?: number
  hidden?: boolean
}

export function LineChart({ snapshots, height = 120, hidden = false }: Props) {
  if (snapshots.length < 2) {
    return (
      <div className="flex items-center justify-center text-sm text-gray-400" style={{ height }}>
        Noch nicht genug Daten
      </div>
    )
  }

  const values = snapshots.map(s => s.gesamtwert)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const W = 320
  const H = height
  const PAD = { top: 8, right: 12, bottom: 22, left: 48 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom

  const xs = snapshots.map((_, i) => PAD.left + (i / (snapshots.length - 1)) * plotW)
  const ys = values.map(v => PAD.top + plotH - ((v - min) / range) * plotH)

  const pathD = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x} ${ys[i]}`).join(' ')
  const fillD = `${pathD} L ${xs[xs.length - 1]} ${PAD.top + plotH} L ${xs[0]} ${PAD.top + plotH} Z`

  // Y-axis labels (3 ticks)
  const yTicks = [min, min + range / 2, max]

  // X-axis labels (first, last, maybe middle)
  const labelIndices = snapshots.length <= 3
    ? snapshots.map((_, i) => i)
    : [0, Math.floor(snapshots.length / 2), snapshots.length - 1]

  const isPositive = values[values.length - 1] >= values[0]

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      className="overflow-visible"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={isPositive ? '#2563eb' : '#ef4444'} stopOpacity="0.18" />
          <stop offset="100%" stopColor={isPositive ? '#2563eb' : '#ef4444'} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Fill */}
      <path d={fillD} fill="url(#lineGrad)" />
      {/* Line */}
      <path
        d={pathD}
        fill="none"
        stroke={isPositive ? '#2563eb' : '#ef4444'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Y-axis labels */}
      {!hidden && yTicks.map((v, i) => (
        <text
          key={i}
          x={PAD.left - 4}
          y={PAD.top + plotH - (i / 2) * plotH + 4}
          textAnchor="end"
          fontSize={9}
          fill="currentColor"
          className="fill-gray-400 dark:fill-gray-500"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {fmtEuroCompact.format(v)}
        </text>
      ))}
      {/* X-axis labels */}
      {labelIndices.map(i => (
        <text
          key={i}
          x={xs[i]}
          y={H - 2}
          textAnchor="middle"
          fontSize={9}
          fill="currentColor"
          className="fill-gray-400 dark:fill-gray-500"
        >
          {fmtDateMonth.format(new Date(snapshots[i].datum))}
        </text>
      ))}
    </svg>
  )
}
