import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, Download, Calendar } from 'lucide-react'
import type { AppData } from '../hooks/useAppData'
import type { Vertrag } from '../types'
import { spaetesterKuendigungstermin, naechsteAbbuchungAb, intervallZuMonatsbetrag } from '../utils/calc'
import { formatEuro, formatDate, daysBetween, today } from '../utils/format'
import { Sheet } from '../components/Sheet'
import { VertragForm } from '../forms/VertragForm'
import { generateVertragIcs, generateAlleTermineIcs } from '../utils/ics'
import type { ZinsPosition, VLPosition } from '../types'

type SortBy = 'abbuchung' | 'kuendigung' | 'kategorie'

interface Props extends AppData {
  hidden: boolean
}

const KATEGORIE_COLORS: Record<string, string> = {
  Versicherung: '#0891b2',
  'Internet/Mobilfunk': '#7c3aed',
  Abo: '#d97706',
  Fitness: '#059669',
  'Strom/Energie': '#dc2626',
  'Miete/Wohnen': '#2563eb',
  Sonstiges: '#6b7280',
}

function downloadIcs(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const share = async () => {
    if (navigator.share) {
      try {
        const file = new File([blob], filename, { type: 'text/calendar' })
        await navigator.share({ files: [file] })
        return
      } catch {
        // Fallback to download
      }
    }
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }
  void share()
}

export function VertraegePage({ hidden, vertraege, positionen, sparplaene, saveVertrag, removeVertrag }: Props) {
  const [sortBy, setSortBy] = useState<SortBy>('abbuchung')
  const [editVertrag, setEditVertrag] = useState<Vertrag | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [monatDetail, setMonatDetail] = useState(false)

  const now = today()

  const sorted = useMemo(() => {
    const list = [...vertraege]
    if (sortBy === 'abbuchung') {
      return list.sort((a, b) => naechsteAbbuchungAb(a).getTime() - naechsteAbbuchungAb(b).getTime())
    }
    if (sortBy === 'kuendigung') {
      return list.sort((a, b) => {
        const da = spaetesterKuendigungstermin(a)?.getTime() ?? Infinity
        const db = spaetesterKuendigungstermin(b)?.getTime() ?? Infinity
        return da - db
      })
    }
    return list.sort((a, b) => a.kategorie.localeCompare(b.kategorie))
  }, [vertraege, sortBy])

  const aktiveVertraege = sorted.filter(v => v.status === 'aktiv')
  const gekundigte = sorted.filter(v => v.status === 'gekündigt')

  const fixkostenMonat = aktiveVertraege.reduce((s, v) => s + intervallZuMonatsbetrag(v.betrag, v.zahlungsintervall), 0)
  const fixkostenJahr = fixkostenMonat * 12

  // Monthly breakdown: which contracts pay in which month
  const monateUebersicht = useMemo(() => {
    const months: { label: string; summe: number; vertraege: { name: string; betrag: number }[] }[] = []
    const refDate = new Date(now)
    for (let m = 0; m < 12; m++) {
      const d = new Date(refDate.getFullYear(), refDate.getMonth() + m, 1)
      const label = d.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })
      const entries: { name: string; betrag: number }[] = []
      let summe = 0
      for (const v of aktiveVertraege) {
        let abbuchung = naechsteAbbuchungAb(v)
        while (abbuchung.getFullYear() === d.getFullYear() && abbuchung.getMonth() === d.getMonth()) {
          entries.push({ name: v.name, betrag: v.betrag })
          summe += v.betrag
          abbuchung = naechsteAbbuchungAb(v, new Date(abbuchung.getTime() + 86_400_000))
        }
      }
      months.push({ label, summe, vertraege: entries })
    }
    return months
  }, [aktiveVertraege, now])

  function exportSingle(v: Vertrag) {
    downloadIcs(generateVertragIcs(v), `${v.name.replace(/\s+/g, '-')}.ics`)
  }

  function exportAll() {
    const zinsPoz = positionen.filter((p): p is ZinsPosition =>
      p.anlageklasse === 'Zinssparen' || p.anlageklasse === 'Sparbrief' || p.anlageklasse === 'Festgeld'
    )
    const vlPoz = positionen.filter((p): p is VLPosition => p.anlageklasse === 'VL')
    downloadIcs(generateAlleTermineIcs(vertraege, sparplaene, [...zinsPoz, ...vlPoz]), 'portfolio-termine.ics')
  }

  function renderVertrag(v: Vertrag) {
    const abbuchung = naechsteAbbuchungAb(v)
    const kuendigungsDeadline = spaetesterKuendigungstermin(v)
    const daysToKuendigung = kuendigungsDeadline ? daysBetween(now, kuendigungsDeadline) : null
    const urgent = daysToKuendigung !== null && daysToKuendigung <= 30
    const color = KATEGORIE_COLORS[v.kategorie] ?? '#6b7280'

    return (
      <div key={v.id} className="border-b border-gray-100 dark:border-[#38383a] last:border-0">
        <div className="px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ backgroundColor: color }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{v.name}</p>
                  <p className="text-xs text-gray-400">{v.anbieter} · {v.kategorie}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold tabular-nums">{hidden ? '••••' : formatEuro(v.betrag)}</p>
                  <p className="text-xs text-gray-400">{v.zahlungsintervall}</p>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-xs">
                <span className="text-gray-500">
                  Nächste Abbuchung: <span className="tabular-nums font-medium">{formatDate(abbuchung.toISOString())}</span>
                </span>
                {kuendigungsDeadline && (
                  <span className={urgent ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-gray-500'}>
                    Kündigung bis: <span className="tabular-nums">{formatDate(kuendigungsDeadline.toISOString())}</span>
                    {daysToKuendigung !== null && daysToKuendigung <= 60 && (
                      <span className={`ml-1 px-1.5 py-0.5 rounded ${urgent ? 'bg-red-100 dark:bg-red-900/40' : 'bg-gray-100 dark:bg-[#2c2c2e]'}`}>
                        {daysToKuendigung}d
                      </span>
                    )}
                  </span>
                )}
              </div>
              <div className="mt-2 flex gap-2">
                <button onClick={() => exportSingle(v)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-[#38383a] text-xs font-medium">
                  <Calendar size={12} /> Kalender
                </button>
                <button onClick={() => { setEditVertrag(v); setFormOpen(true) }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-[#38383a] text-xs font-medium">
                  <Pencil size={12} /> Bearbeiten
                </button>
                <button onClick={() => { if (confirm(`"${v.name}" löschen?`)) void removeVertrag(v.id) }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-medium">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-4 pb-8 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Verträge</h1>
        <button onClick={() => { setEditVertrag(null); setFormOpen(true) }}
          className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium">
          <Plus size={16} /> Vertrag
        </button>
      </div>

      {/* Sort */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['abbuchung', 'kuendigung', 'kategorie'] as SortBy[]).map(s => (
          <button key={s} onClick={() => setSortBy(s)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${sortBy === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 dark:border-[#38383a] text-gray-600 dark:text-gray-400'}`}>
            {s === 'abbuchung' ? 'Abbuchung' : s === 'kuendigung' ? 'Kündigung' : 'Kategorie'}
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Monatlich</p>
          <p className="text-2xl font-bold tabular-nums">{hidden ? '••••' : formatEuro(fixkostenMonat)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400 mb-0.5">Jährlich</p>
          <p className="text-lg font-semibold tabular-nums">{hidden ? '••••' : formatEuro(fixkostenJahr)}</p>
        </div>
        <button onClick={exportAll} className="flex items-center gap-1 text-blue-600 dark:text-blue-400 text-sm font-medium">
          <Download size={16} /> ICS
        </button>
      </div>

      {/* Active contracts */}
      {aktiveVertraege.length > 0 && (
        <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-sm overflow-hidden">
          {aktiveVertraege.map(v => renderVertrag(v))}
        </div>
      )}

      {aktiveVertraege.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">Noch keine Verträge.</p>
          <button onClick={() => setFormOpen(true)} className="mt-3 text-blue-600 dark:text-blue-400 text-sm font-medium">
            Ersten Vertrag anlegen
          </button>
        </div>
      )}

      {/* Monthly overview */}
      <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-sm overflow-hidden">
        <button onClick={() => setMonatDetail(v => !v)} className="w-full flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-[#38383a]">
          <h2 className="text-sm font-semibold">Monatsübersicht (12 Monate)</h2>
          <span className="text-xs text-blue-600">{monatDetail ? 'Weniger' : 'Details'}</span>
        </button>
        {monatDetail && (
          <div>
            {monateUebersicht.map((m, i) => (
              <div key={i} className="border-b border-gray-100 dark:border-[#38383a] last:border-0">
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-sm font-medium">{m.label}</span>
                  <span className="text-sm tabular-nums font-semibold">{hidden ? '••••' : formatEuro(m.summe)}</span>
                </div>
                {m.vertraege.map((e, j) => (
                  <div key={j} className="px-7 pb-1.5 flex justify-between text-xs text-gray-400">
                    <span>{e.name}</span>
                    <span className="tabular-nums">{hidden ? '••' : formatEuro(e.betrag)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cancelled */}
      {gekundigte.length > 0 && (
        <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-sm overflow-hidden opacity-60">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-[#38383a]">
            <h2 className="text-sm font-semibold text-gray-400">Gekündigt</h2>
          </div>
          {gekundigte.map(v => renderVertrag(v))}
        </div>
      )}

      {/* Sheet */}
      <Sheet open={formOpen} onClose={() => setFormOpen(false)}
        title={editVertrag ? 'Vertrag bearbeiten' : 'Neuer Vertrag'} fullscreen>
        <VertragForm
          initial={editVertrag ?? undefined}
          onSave={v => { void saveVertrag(v); setFormOpen(false) }}
          onCancel={() => setFormOpen(false)}
        />
      </Sheet>
    </div>
  )
}
