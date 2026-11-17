import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import type { Ausgabe, AusgabenKategorie } from '../types'
import { DonutChart } from '../components/DonutChart'
import { AUSGABEN_KATEGORIEN, AUSGABEN_FARBEN } from '../forms/AusgabeForm'

const MONATE = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
]

function formatEuro(n: number) {
  return n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

function formatDatumLang(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'long' })
}

interface Props {
  ausgaben: Ausgabe[]
  onAdd: () => void
  onRemove: (id: string) => void
}

export function BudgetPage({ ausgaben, onAdd, onRemove }: Props) {
  const now = new Date()
  const [monat, setMonat] = useState(now.getMonth())
  const [jahr, setJahr] = useState(now.getFullYear())

  function vorMonat() {
    if (monat === 0) { setMonat(11); setJahr(j => j - 1) }
    else setMonat(m => m - 1)
  }
  function naechsterMonat() {
    if (monat === 11) { setMonat(0); setJahr(j => j + 1) }
    else setMonat(m => m + 1)
  }

  const monatPrefix = `${jahr}-${String(monat + 1).padStart(2, '0')}`

  const monatAusgaben = useMemo(
    () => ausgaben.filter(a => a.datum.startsWith(monatPrefix)),
    [ausgaben, monatPrefix]
  )

  const gesamt = useMemo(
    () => monatAusgaben.reduce((s, a) => s + a.betrag, 0),
    [monatAusgaben]
  )

  const donutSegments = useMemo(() => {
    const byKat = new Map<AusgabenKategorie, number>()
    for (const a of monatAusgaben) {
      byKat.set(a.kategorie, (byKat.get(a.kategorie) ?? 0) + a.betrag)
    }
    return AUSGABEN_KATEGORIEN
      .filter(k => (byKat.get(k) ?? 0) > 0)
      .map(k => ({ label: k, value: byKat.get(k)!, color: AUSGABEN_FARBEN[k] }))
      .sort((a, b) => b.value - a.value)
  }, [monatAusgaben])

  // Group by day, newest first
  const grouped = useMemo(() => {
    const map = new Map<string, Ausgabe[]>()
    const sorted = [...monatAusgaben].sort((a, b) => b.datum.localeCompare(a.datum))
    for (const a of sorted) {
      const day = a.datum
      if (!map.has(day)) map.set(day, [])
      map.get(day)!.push(a)
    }
    return [...map.entries()]
  }, [monatAusgaben])

  return (
    <div className="pb-safe">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-50 dark:bg-black px-4 pt-4 pb-3 border-b border-gray-200 dark:border-[#38383a]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={vorMonat} className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 active:bg-gray-200 dark:active:bg-[#2c2c2e]">
              <ChevronLeft size={20} />
            </button>
            <span className="text-base font-semibold w-36 text-center">
              {MONATE[monat]} {jahr}
            </span>
            <button onClick={naechsterMonat} className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 active:bg-gray-200 dark:active:bg-[#2c2c2e]">
              <ChevronRight size={20} />
            </button>
          </div>
          <button
            onClick={onAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-sm font-medium"
          >
            <Plus size={16} />
            Ausgabe
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Monthly total */}
        <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500 dark:text-[#8e8e93] font-medium uppercase tracking-wide">Ausgaben {MONATE[monat]}</div>
            <div className="text-2xl font-bold mt-0.5">{formatEuro(gesamt)}</div>
          </div>
          <div className="text-sm text-gray-400">{monatAusgaben.length} Einträge</div>
        </div>

        {/* Donut chart */}
        {donutSegments.length > 0 && (
          <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4">
            <div className="text-sm font-semibold mb-3">Nach Kategorie</div>
            <div className="flex items-center gap-4">
              <DonutChart segments={donutSegments} size={120} strokeWidth={26} />
              <div className="flex-1 space-y-1.5 min-w-0">
                {donutSegments.map(seg => (
                  <div key={seg.label} className="flex items-center gap-2 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                    <span className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1">{seg.label}</span>
                    <span className="text-xs font-medium tabular-nums shrink-0">{formatEuro(seg.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {monatAusgaben.length === 0 && (
          <div className="text-center py-12 text-gray-400 dark:text-[#8e8e93]">
            <div className="text-4xl mb-3">💸</div>
            <div className="text-sm">Noch keine Ausgaben für {MONATE[monat]}</div>
            <button onClick={onAdd} className="mt-3 text-sm text-blue-600 font-medium">
              Erste Ausgabe eintragen
            </button>
          </div>
        )}

        {/* Expense list grouped by day */}
        {grouped.map(([day, eintraege]) => (
          <div key={day}>
            <div className="text-xs font-semibold text-gray-500 dark:text-[#8e8e93] uppercase tracking-wide mb-2 px-1">
              {formatDatumLang(day)}
            </div>
            <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl divide-y divide-gray-100 dark:divide-[#38383a]">
              {eintraege.map(a => (
                <div key={a.id} className="flex items-center px-4 py-3 gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: AUSGABEN_FARBEN[a.kategorie] + '22' }}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: AUSGABEN_FARBEN[a.kategorie] }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {a.beschreibung || a.kategorie}
                    </div>
                    {a.beschreibung && (
                      <div className="text-xs text-gray-500 dark:text-[#8e8e93] truncate">{a.kategorie}</div>
                    )}
                  </div>
                  <div className="text-sm font-semibold tabular-nums shrink-0">{formatEuro(a.betrag)}</div>
                  <button
                    onClick={() => onRemove(a.id)}
                    className="p-1 text-gray-300 dark:text-[#48484a] active:text-red-500 shrink-0"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
