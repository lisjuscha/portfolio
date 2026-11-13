import { useState, useMemo } from 'react'
import { Download } from 'lucide-react'
import type { AppData } from '../hooks/useAppData'
import type { ZinsPosition, VLPosition } from '../types'
import { collectTermine, generateAlleTermineIcs, type TerminEvent } from '../utils/ics'
import { formatDate, daysBetween, today } from '../utils/format'

type TerminTypFilter = 'alle' | TerminEvent['typ']

const TYP_LABELS: Record<TerminEvent['typ'], string> = {
  kuendigung: 'Kündigung',
  abbuchung: 'Abbuchung',
  sparplan: 'Sparplan',
  faelligkeit: 'Fälligkeit',
  'vl-sperrfrist': 'VL-Sperrfrist',
}

const TYP_COLORS: Record<TerminEvent['typ'], string> = {
  kuendigung: '#dc2626',
  abbuchung: '#2563eb',
  sparplan: '#059669',
  faelligkeit: '#0891b2',
  'vl-sperrfrist': '#7c3aed',
}

interface Props extends AppData {}

export function TerminePage({ positionen, vertraege, sparplaene }: Props) {
  const [filter, setFilter] = useState<TerminTypFilter>('alle')
  const [horizont, setHorizont] = useState(90)

  const now = today()

  const zinsPoz = useMemo(() => positionen.filter((p): p is ZinsPosition =>
    p.anlageklasse === 'Zinssparen' || p.anlageklasse === 'Sparbrief' || p.anlageklasse === 'Festgeld'
  ), [positionen])
  const vlPoz = useMemo(() => positionen.filter((p): p is VLPosition => p.anlageklasse === 'VL'), [positionen])

  const alle = useMemo(() =>
    collectTermine(vertraege, sparplaene, [...zinsPoz, ...vlPoz], horizont),
    [vertraege, sparplaene, zinsPoz, vlPoz, horizont]
  )

  const filtered = useMemo(() =>
    filter === 'alle' ? alle : alle.filter(t => t.typ === filter),
    [alle, filter]
  )

  function exportAll() {
    const ics = generateAlleTermineIcs(vertraege, sparplaene, [...zinsPoz, ...vlPoz])
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
    const share = async () => {
      if (navigator.share) {
        try {
          await navigator.share({ files: [new File([blob], 'portfolio-termine.ics', { type: 'text/calendar' })] })
          return
        } catch { /* Fallback */ }
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'portfolio-termine.ics'
      a.click()
      URL.revokeObjectURL(url)
    }
    void share()
  }

  return (
    <div className="px-4 py-4 pb-8 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Termine</h1>
        <button onClick={exportAll} className="flex items-center gap-1 text-blue-600 dark:text-blue-400 text-sm font-medium">
          <Download size={16} /> ICS
        </button>
      </div>

      {/* Horizon */}
      <div className="flex gap-2">
        {[30, 90, 180, 365].map(d => (
          <button key={d} onClick={() => setHorizont(d)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${horizont === d ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 dark:border-[#38383a] text-gray-600 dark:text-gray-400'}`}>
            {d}d
          </button>
        ))}
      </div>

      {/* Type filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['alle', ...Object.keys(TYP_LABELS)] as TerminTypFilter[]).map(t => (
          <button key={t} onClick={() => setFilter(t)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filter === t ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 dark:border-[#38383a] text-gray-600 dark:text-gray-400'}`}>
            {t === 'alle' ? 'Alle' : TYP_LABELS[t as TerminEvent['typ']]}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">Keine Termine im gewählten Zeitraum.</p>
        </div>
      ) : (
        <div className="space-y-0">
          {filtered.map((termin, i) => {
            const days = daysBetween(now, termin.datum)
            const urgent = termin.typ === 'kuendigung' && days <= 30
            const color = TYP_COLORS[termin.typ]
            const prevDate = i > 0 ? filtered[i - 1].datum.toDateString() : null
            const showDateSeparator = prevDate !== termin.datum.toDateString()

            return (
              <div key={i}>
                {showDateSeparator && (
                  <div className="flex items-center gap-3 py-3">
                    <div className="flex-1 h-px bg-gray-100 dark:bg-[#38383a]" />
                    <span className="text-xs text-gray-400 tabular-nums">{formatDate(termin.datum.toISOString())}</span>
                    <div className="flex-1 h-px bg-gray-100 dark:bg-[#38383a]" />
                  </div>
                )}
                <div className={`bg-white dark:bg-[#1c1c1e] rounded-xl p-3.5 mb-2 flex items-start gap-3 ${urgent ? 'border border-red-200 dark:border-red-800' : 'shadow-sm'}`}>
                  <div className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ backgroundColor: color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-medium ${urgent ? 'text-red-700 dark:text-red-300' : ''}`}>{termin.titel}</p>
                      {days <= 14 && (
                        <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 tabular-nums ${urgent ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 font-semibold' : 'bg-gray-100 dark:bg-[#2c2c2e] text-gray-500'}`}>
                          {days === 0 ? 'heute' : `${days}d`}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{TYP_LABELS[termin.typ]} · {termin.beschreibung}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
