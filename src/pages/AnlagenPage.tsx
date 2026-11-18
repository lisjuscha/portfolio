import { useState, useMemo } from 'react'
import { Plus, ChevronRight, Pencil, Trash2, ShoppingCart, LayoutList, Building2, TrendingUp, TrendingDown } from 'lucide-react'
import type { AppData } from '../hooks/useAppData'
import type { Position, AktieETFPosition, ZinsPosition, Kauf, Anlageklasse } from '../types'
import { positionCurrentValue, positionPerformance, erwarteterZinsertrag, sparzielFortschritt, gesamtwertNachAnlageklasse } from '../utils/calc'
import { formatEuro, formatPct, formatDate, today } from '../utils/format'
import { Sheet } from '../components/Sheet'
import { PositionForm } from '../forms/PositionForm'
import { SparplanForm } from '../forms/SparplanForm'
import { SparzielForm } from '../forms/SparzielForm'
import { ProgressBar } from '../components/ProgressBar'
import { ANLAGEKLASSE_COLORS } from '../components/DonutChart'

type GroupBy = 'konto' | 'klasse'
type AnlagenView = 'liste' | 'rebalancing' | 'ertraege'

interface Props extends AppData {
  hidden: boolean
}

const MONATE_KURZ = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

export function AnlagenPage({ hidden, positionen, konten, sparplaene, sparziele, fxRates, savePosition, removePosition, saveSparplan, saveSparziel, removeSparziel, saveKauf }: Props) {
  const [view, setView] = useState<AnlagenView>('liste')
  const [groupBy, setGroupBy] = useState<GroupBy>('konto')
  const [editPosition, setEditPosition] = useState<Position | null>(null)
  const [positionFormOpen, setPositionFormOpen] = useState(false)
  const [detailPosition, setDetailPosition] = useState<Position | null>(null)
  const [sparplanFormOpen, setSparplanFormOpen] = useState(false)
  const [sparzielFormOpen, setSparzielFormOpen] = useState(false)
  const [editSparziel, setEditSparziel] = useState<import('../types').Sparziel | null>(null)
  const [kaufOpen, setKaufOpen] = useState(false)
  const [kaufStk, setKaufStk] = useState('')
  const [kaufKurs, setKaufKurs] = useState('')
  const [kaufDatum, setKaufDatum] = useState(today().toISOString().slice(0, 10))

  const gesamtwert = useMemo(() => positionen.reduce((s, p) => s + positionCurrentValue(p, fxRates), 0), [positionen, fxRates])

  // ─── Rebalancing ─────────────────────────────────────────────────────────────
  const istAllokation = useMemo(() => gesamtwertNachAnlageklasse(positionen, fxRates), [positionen, fxRates])

  const [zielAllokation, setZielAllokation] = useState<Partial<Record<Anlageklasse, string>>>(() => {
    try {
      const raw = localStorage.getItem('zielallokation')
      return raw ? JSON.parse(raw) : {}
    } catch { return {} }
  })

  function setZiel(klasse: Anlageklasse, val: string) {
    const next = { ...zielAllokation, [klasse]: val }
    setZielAllokation(next)
    localStorage.setItem('zielallokation', JSON.stringify(next))
  }

  const rebalancingRows = useMemo(() => {
    const klassen = Object.keys(istAllokation) as Anlageklasse[]
    return klassen.map(k => {
      const istWert = istAllokation[k] ?? 0
      const istPct = gesamtwert > 0 ? (istWert / gesamtwert) * 100 : 0
      const sollPct = Number(zielAllokation[k] ?? 0)
      const delta = sollPct > 0 ? (sollPct - istPct) * gesamtwert / 100 : 0
      const deltaPct = sollPct - istPct
      return { klasse: k, istWert, istPct, sollPct, delta, deltaPct }
    }).sort((a, b) => b.istWert - a.istWert)
  }, [istAllokation, zielAllokation, gesamtwert])

  // ─── Ertragskalender ──────────────────────────────────────────────────────────
  const ertragskalender = useMemo(() => {
    const now = new Date()
    const months: { monat: number; jahr: number; label: string; eintraege: { name: string; betrag: number; typ: 'Zinsen' | 'Dividende' }[] }[] = []

    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
      months.push({ monat: d.getMonth(), jahr: d.getFullYear(), label: `${MONATE_KURZ[d.getMonth()]} ${d.getFullYear()}`, eintraege: [] })
    }

    // Zinsen aus ZinsPositionen
    const zinsPoz = positionen.filter((p): p is ZinsPosition =>
      p.anlageklasse === 'Zinssparen' || p.anlageklasse === 'Sparbrief' || p.anlageklasse === 'Festgeld'
    )
    for (const pos of zinsPoz) {
      const faelligkeitDate = new Date(pos.laufzeitEnde)
      for (const entry of months) {
        if (faelligkeitDate.getFullYear() === entry.jahr && faelligkeitDate.getMonth() === entry.monat) {
          const zins = erwarteterZinsertrag(pos)
          if (zins > 0) {
            entry.eintraege.push({ name: pos.name, betrag: zins, typ: 'Zinsen' })
          }
        }
      }
    }

    // Dividenden aus AktieETF (Q1-Q4 gleichverteilt = je 1/4 im März, Juni, Sep, Dez)
    const divPoz = positionen.filter((p): p is AktieETFPosition =>
      (p.anlageklasse === 'Aktie' || p.anlageklasse === 'ETF') && (p as AktieETFPosition).jaehresDividende != null
    ) as AktieETFPosition[]
    const divMonate = [2, 5, 8, 11] // März=2, Jun=5, Sep=8, Dez=11
    for (const pos of divPoz) {
      const quartalDiv = pos.jaehresDividende! / 4
      for (const entry of months) {
        if (divMonate.includes(entry.monat)) {
          entry.eintraege.push({ name: pos.name, betrag: quartalDiv, typ: 'Dividende' })
        }
      }
    }

    return months.filter(m => m.eintraege.length > 0)
  }, [positionen])

  // Group by konto or anlageklasse
  const groups = useMemo(() => {
    if (groupBy === 'konto') {
      const map = new Map<string, { label: string; positionen: Position[] }>()
      for (const k of konten) map.set(k.id, { label: k.name, positionen: [] })
      map.set('', { label: 'Ohne Konto', positionen: [] })
      for (const p of positionen) {
        const entry = map.get(p.kontoId) ?? map.get('')!
        entry.positionen.push(p)
      }
      return [...map.values()].filter(g => g.positionen.length > 0)
    } else {
      const map = new Map<string, { label: string; positionen: Position[] }>()
      for (const p of positionen) {
        const k = p.anlageklasse
        if (!map.has(k)) map.set(k, { label: k, positionen: [] })
        map.get(k)!.positionen.push(p)
      }
      return [...map.values()]
    }
  }, [positionen, konten, groupBy])

  const faelligkeiten = useMemo(() =>
    positionen.filter((p): p is ZinsPosition =>
      p.anlageklasse === 'Sparbrief' || p.anlageklasse === 'Festgeld'
    ).sort((a, b) => a.laufzeitEnde.localeCompare(b.laufzeitEnde)),
    [positionen]
  )

  function openKaufForPosition(p: Position) {
    setDetailPosition(p)
    const akp = p as AktieETFPosition
    setKaufKurs(String(akp.aktuellerKurs ?? akp.einstandskurs ?? ''))
    setKaufStk('')
    setKaufDatum(today().toISOString().slice(0, 10))
    setKaufOpen(true)
  }

  async function handleKaufSave(e: React.FormEvent) {
    e.preventDefault()
    if (!detailPosition) return
    const kauf: Kauf = {
      id: crypto.randomUUID(),
      positionId: detailPosition.id,
      datum: kaufDatum,
      stueckzahl: Number(kaufStk),
      kurs: Number(kaufKurs),
    }
    await saveKauf(kauf)
    setKaufOpen(false)
  }

  function confirmDelete(p: Position) {
    if (confirm(`"${p.name}" wirklich löschen?`)) void removePosition(p.id)
  }

  const inputCls = "w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-[#4f3220] bg-white dark:bg-[#3d2718] text-sm"

  return (
    <div>
      <div
        className="sticky top-0 z-10 bg-gray-50 dark:bg-black px-4 pb-3 border-b border-gray-200 dark:border-[#4f3220]"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex items-center justify-between pt-2">
          <div className="flex gap-1 bg-gray-100 dark:bg-[#3d2718] rounded-xl p-1">
            {(['liste', 'rebalancing', 'ertraege'] as AnlagenView[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  view === v
                    ? 'bg-white dark:bg-[#4f3220] text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-[#8e8e93]'
                }`}
              >
                {v === 'liste' ? 'Liste' : v === 'rebalancing' ? 'Rebalancing' : 'Erträge'}
              </button>
            ))}
          </div>
          {view === 'liste' && (
            <button onClick={() => { setEditPosition(null); setPositionFormOpen(true) }}
              className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium">
              <Plus size={16} /> Position
            </button>
          )}
        </div>
      </div>

      {view === 'liste' ? (
      <div className="px-4 pt-3 pb-8 space-y-5">
        {/* Group toggle */}
        <div className="flex gap-2">
          {(['konto', 'klasse'] as GroupBy[]).map(g => (
            <button key={g} onClick={() => setGroupBy(g)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${groupBy === g ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 dark:border-[#4f3220] text-gray-600 dark:text-gray-400'}`}>
              {g === 'konto' ? <Building2 size={14} /> : <LayoutList size={14} />}
              {g === 'konto' ? 'nach Konto' : 'nach Klasse'}
            </button>
          ))}
        </div>

      {/* Position list */}
      {groups.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">Noch keine Positionen.</p>
          <button onClick={() => setPositionFormOpen(true)} className="mt-3 text-blue-600 dark:text-blue-400 text-sm font-medium">
            Erste Position anlegen
          </button>
        </div>
      ) : (
        groups.map(group => (
          <div key={group.label} className="bg-white dark:bg-[#2d1c16] rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-[#4f3220] flex items-center justify-between">
              <h2 className="text-sm font-semibold">{group.label}</h2>
              <span className="text-xs text-gray-400 tabular-nums">
                {hidden ? '••••' : formatEuro(group.positionen.reduce((s, p) => s + positionCurrentValue(p, fxRates), 0))}
              </span>
            </div>
            {group.positionen.map((pos, i) => {
              const wert = positionCurrentValue(pos, fxRates)
              const color = ANLAGEKLASSE_COLORS[pos.anlageklasse]
              const isAktieETF = pos.anlageklasse === 'Aktie' || pos.anlageklasse === 'ETF'
              const perf = isAktieETF ? positionPerformance(pos as AktieETFPosition, fxRates) : null
              return (
                <div key={pos.id}>
                  <button
                    onClick={() => setDetailPosition(detailPosition?.id === pos.id ? null : pos)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-[#2c2c2e] transition-colors"
                  >
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{pos.name}</p>
                      {isAktieETF && (
                        <p className="text-xs text-gray-400 tabular-nums">
                          {(pos as AktieETFPosition).stueckzahl} Stk. · Ø {formatEuro((pos as AktieETFPosition).einstandskurs)}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold tabular-nums">{hidden ? '••••' : formatEuro(wert)}</p>
                      {perf && !hidden && (
                        <p className={`text-xs tabular-nums flex items-center gap-0.5 justify-end ${perf.absoluteEuro >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                          {perf.absoluteEuro >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                          {formatPct(perf.prozent)}
                        </p>
                      )}
                    </div>
                    <ChevronRight size={16} className={`text-gray-300 shrink-0 transition-transform ${detailPosition?.id === pos.id ? 'rotate-90' : ''}`} />
                  </button>
                  {/* Expanded actions */}
                  {detailPosition?.id === pos.id && (
                    <div className="bg-gray-50 dark:bg-[#3d2718] border-t border-gray-100 dark:border-[#4f3220] px-4 py-3 flex flex-wrap gap-2">
                      {isAktieETF && (
                        <button onClick={() => openKaufForPosition(pos)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium">
                          <ShoppingCart size={12} /> Kauf erfassen
                        </button>
                      )}
                      <button onClick={() => { setEditPosition(pos); setSparplanFormOpen(true) }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-[#5c3a28] text-xs font-medium">
                        Sparplan
                      </button>
                      <button onClick={() => { setEditPosition(pos); setPositionFormOpen(true) }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-[#5c3a28] text-xs font-medium">
                        <Pencil size={12} /> Bearbeiten
                      </button>
                      <button onClick={() => confirmDelete(pos)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-medium">
                        <Trash2 size={12} /> Löschen
                      </button>
                    </div>
                  )}
                  {i < group.positionen.length - 1 && <div className="mx-4 h-px bg-gray-100 dark:bg-[#4f3220]" />}
                </div>
              )
            })}
          </div>
        ))
      )}

      {/* Fälligkeiten */}
      {faelligkeiten.length > 0 && (
        <div className="bg-white dark:bg-[#2d1c16] rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-[#4f3220]">
            <h2 className="text-sm font-semibold">Fälligkeiten</h2>
          </div>
          {faelligkeiten.map((pos, i) => {
            const zins = erwarteterZinsertrag(pos)
            return (
              <div key={pos.id}>
                <div className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{pos.name}</p>
                    <p className="text-xs text-gray-400">{formatDate(pos.laufzeitEnde)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-400">Anlage</p>
                    <p className="text-sm tabular-nums">{hidden ? '••••' : formatEuro(pos.anlagebetrag)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-400">Zinsen</p>
                    <p className="text-sm tabular-nums text-green-600 dark:text-green-400">+{hidden ? '••' : formatEuro(zins)}</p>
                  </div>
                </div>
                {i < faelligkeiten.length - 1 && <div className="mx-4 h-px bg-gray-100 dark:bg-[#4f3220]" />}
              </div>
            )
          })}
        </div>
      )}

      {/* Sparziele */}
      <div className="bg-white dark:bg-[#2d1c16] rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Sparziele</h2>
          <button onClick={() => { setEditSparziel(null); setSparzielFormOpen(true) }}
            className="flex items-center gap-1 text-blue-600 dark:text-blue-400 text-sm font-medium">
            <Plus size={14} /> Neu
          </button>
        </div>
        {sparziele.length === 0 ? (
          <p className="text-sm text-gray-400">Noch keine Sparziele.</p>
        ) : (
          <div className="space-y-4">
            {sparziele.map(z => {
              const f = sparzielFortschritt(z, positionen, konten, fxRates)
              return (
                <div key={z.id}>
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <p className="text-sm font-medium">{z.name}</p>
                      {f.monatlicheSparrate && !hidden && (
                        <p className="text-xs text-gray-400">{formatEuro(f.monatlicheSparrate)} / Monat nötig</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditSparziel(z); setSparzielFormOpen(true) }} className="p-1.5 text-gray-400 rounded">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => { if (confirm(`"${z.name}" löschen?`)) void removeSparziel(z.id) }} className="p-1.5 text-red-400 rounded">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <ProgressBar
                    value={f.aktuell}
                    max={z.zielbetrag}
                    sublabel={`${hidden ? '••••' : formatEuro(f.aktuell)} / ${hidden ? '••••' : formatEuro(z.zielbetrag)}`}
                    hidden={hidden}
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Total */}
      {positionen.length > 0 && (
        <div className="flex justify-between items-center px-2 pt-2 border-t border-gray-200 dark:border-[#4f3220]">
          <span className="text-sm font-medium">Gesamtwert</span>
          <span className="text-lg font-bold tabular-nums">{hidden ? '••••' : formatEuro(gesamtwert)}</span>
        </div>
      )}

      {/* Sheets */}
      <Sheet open={positionFormOpen} onClose={() => setPositionFormOpen(false)}
        title={editPosition ? 'Position bearbeiten' : 'Neue Position'} fullscreen>
        <PositionForm
          initial={editPosition ?? undefined}
          konten={konten}
          onSave={p => { void savePosition(p); setPositionFormOpen(false) }}
          onCancel={() => setPositionFormOpen(false)}
        />
      </Sheet>

      <Sheet open={sparplanFormOpen} onClose={() => setSparplanFormOpen(false)} title="Sparplan">
        <SparplanForm
          positionId={detailPosition?.id ?? editPosition?.id ?? ''}
          initial={detailPosition ? sparplaene.find(s => s.positionId === detailPosition.id) : undefined}
          onSave={s => { void saveSparplan(s); setSparplanFormOpen(false) }}
          onCancel={() => setSparplanFormOpen(false)}
        />
      </Sheet>

      <Sheet open={sparzielFormOpen} onClose={() => setSparzielFormOpen(false)} title={editSparziel ? 'Sparziel bearbeiten' : 'Neues Sparziel'}>
        <SparzielForm
          initial={editSparziel ?? undefined}
          positionen={positionen}
          konten={konten}
          onSave={z => { void saveSparziel(z); setSparzielFormOpen(false) }}
          onCancel={() => setSparzielFormOpen(false)}
        />
      </Sheet>

      <Sheet open={kaufOpen} onClose={() => setKaufOpen(false)} title="Kauf erfassen">
        <form onSubmit={e => void handleKaufSave(e)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Stückzahl</label>
              <input className={inputCls} type="number" min="0.0001" step="0.0001" value={kaufStk} onChange={e => setKaufStk(e.target.value)} required autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Kurs €</label>
              <input className={inputCls} type="number" min="0.0001" step="0.0001" value={kaufKurs} onChange={e => setKaufKurs(e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Datum</label>
            <input className={inputCls} type="date" value={kaufDatum} onChange={e => setKaufDatum(e.target.value)} required />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setKaufOpen(false)} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-[#4f3220] text-sm font-medium">Abbrechen</button>
            <button type="submit" className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-medium">Speichern</button>
          </div>
        </form>
      </Sheet>
      </div>

      ) : view === 'rebalancing' ? (
      <div className="px-4 pt-3 pb-8 space-y-5">
        {positionen.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">Noch keine Positionen für Rebalancing.</div>
        ) : (
          <>
            <div className="bg-white dark:bg-[#2d1c16] rounded-2xl p-4 shadow-sm">
              <p className="text-xs text-gray-400 mb-3">Zielallokation in % pro Anlageklasse eingeben. Delta zeigt, wie viel gekauft (+) oder verkauft (−) werden soll.</p>
              <div className="space-y-3">
                {rebalancingRows.map(row => {
                  const color = ANLAGEKLASSE_COLORS[row.klasse] ?? '#6b7280'
                  return (
                    <div key={row.klasse} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                          <span className="text-sm font-medium">{row.klasse}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={zielAllokation[row.klasse] ?? ''}
                            onChange={e => setZiel(row.klasse, e.target.value)}
                            placeholder="0"
                            className="w-16 px-2 py-1 text-sm text-right rounded-lg border border-gray-200 dark:border-[#4f3220] bg-white dark:bg-[#3d2718]"
                          />
                          <span className="text-xs text-gray-400 w-4">%</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500 pl-4">
                        <span>Ist {row.istPct.toFixed(1)}% · {hidden ? '••••' : formatEuro(row.istWert)}</span>
                        {row.sollPct > 0 && (
                          <span className={`font-semibold tabular-nums ${row.delta >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                            {row.delta >= 0 ? '+' : ''}{hidden ? '••••' : formatEuro(row.delta)} ({row.deltaPct >= 0 ? '+' : ''}{row.deltaPct.toFixed(1)}%)
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="flex justify-between items-center px-2">
              <span className="text-xs text-gray-400">Gesamtwert</span>
              <span className="text-sm font-bold tabular-nums">{hidden ? '••••' : formatEuro(gesamtwert)}</span>
            </div>
          </>
        )}
      </div>

      ) : (
      <div className="px-4 pt-3 pb-8 space-y-5">
        {ertragskalender.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">Keine Erträge in den nächsten 12 Monaten gefunden.</div>
        ) : (
          <>
            <div className="flex justify-between items-center px-1">
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">12-Monats-Vorschau</span>
              <span className="text-sm font-bold tabular-nums">
                {hidden ? '••••' : formatEuro(ertragskalender.reduce((s, m) => s + m.eintraege.reduce((ss, e) => ss + e.betrag, 0), 0))}
              </span>
            </div>
            {ertragskalender.map(m => {
              const monatsTotal = m.eintraege.reduce((s, e) => s + e.betrag, 0)
              return (
                <div key={`${m.jahr}-${m.monat}`} className="bg-white dark:bg-[#2d1c16] rounded-2xl shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-[#4f3220]">
                    <span className="text-sm font-semibold">{m.label}</span>
                    <span className="text-sm font-bold tabular-nums text-green-600 dark:text-green-400">
                      {hidden ? '••••' : `+${formatEuro(monatsTotal)}`}
                    </span>
                  </div>
                  {m.eintraege.map((e, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50 dark:border-[#3d2718] last:border-0">
                      <div>
                        <span className="text-sm">{e.name}</span>
                        <span className={`ml-2 text-xs px-1.5 py-0.5 rounded font-medium ${
                          e.typ === 'Zinsen'
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                            : 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                        }`}>{e.typ}</span>
                      </div>
                      <span className="text-sm tabular-nums font-medium">{hidden ? '••••' : formatEuro(e.betrag)}</span>
                    </div>
                  ))}
                </div>
              )
            })}
          </>
        )}
      </div>
      )}
    </div>
  )
}
