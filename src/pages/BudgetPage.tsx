import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import type { Ausgabe, AusgabenKategorie, Einnahme, WiederkehrendeEinnahme, Vertrag } from '../types'
import { DonutChart } from '../components/DonutChart'
import { AUSGABEN_KATEGORIEN, AUSGABEN_FARBEN } from '../forms/AusgabeForm'
import { EINNAHME_FARBEN } from '../forms/EinnahmeForm'
import { naechsteAbbuchungAb, intervallZuMonatsbetrag } from '../utils/calc'
import { formatEuro } from '../utils/format'

const MONATE = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
]

const VERTRAG_FARBE = '#5856d6'

function formatDatumLang(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'long' })
}

function vertraegeImMonat(vertraege: Vertrag[], monat: number, jahr: number): Vertrag[] {
  const firstDay = new Date(jahr, monat, 1)
  const lastDay = new Date(jahr, monat + 1, 0)
  return vertraege.filter(v => {
    if (v.status !== 'aktiv') return false
    const abbuchung = naechsteAbbuchungAb(v, firstDay)
    return abbuchung <= lastDay
  })
}

function weImMonatsbetrag(we: WiederkehrendeEinnahme[]): number {
  return we
    .filter(w => w.status === 'aktiv')
    .reduce((s, w) => s + intervallZuMonatsbetrag(w.betrag, w.zahlungsintervall), 0)
}

interface Props {
  ausgaben: Ausgabe[]
  einnahmen: Einnahme[]
  wiederkehrendeEinnahmen: WiederkehrendeEinnahme[]
  vertraege: Vertrag[]
  onAdd: () => void
  onRemove: (id: string) => void
  onAddEinnahme: () => void
  onRemoveEinnahme: (id: string) => void
}

export function BudgetPage({
  ausgaben, einnahmen, wiederkehrendeEinnahmen, vertraege,
  onAdd, onRemove, onAddEinnahme, onRemoveEinnahme,
}: Props) {
  const now = new Date()
  const [monat, setMonat] = useState(now.getMonth())
  const [jahr, setJahr] = useState(now.getFullYear())
  const [view, setView] = useState<'ausgaben' | 'einnahmen'>('ausgaben')

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

  const monatEinnahmen = useMemo(
    () => einnahmen.filter(e => e.datum.startsWith(monatPrefix)),
    [einnahmen, monatPrefix]
  )

  const monatVertraege = useMemo(
    () => vertraegeImMonat(vertraege, monat, jahr),
    [vertraege, monat, jahr]
  )

  const ausgabenGesamt = useMemo(
    () => monatAusgaben.reduce((s, a) => s + a.betrag, 0),
    [monatAusgaben]
  )

  const fixkostenGesamt = useMemo(
    () => monatVertraege.reduce((s, v) => s + v.betrag, 0),
    [monatVertraege]
  )

  const variableEinnahmenGesamt = useMemo(
    () => monatEinnahmen.reduce((s, e) => s + e.betrag, 0),
    [monatEinnahmen]
  )

  const weGesamt = useMemo(
    () => weImMonatsbetrag(wiederkehrendeEinnahmen),
    [wiederkehrendeEinnahmen]
  )

  const einnahmenGesamt = variableEinnahmenGesamt + weGesamt
  const bilanz = einnahmenGesamt - ausgabenGesamt - fixkostenGesamt
  const sparquote = einnahmenGesamt > 0 ? (bilanz / einnahmenGesamt) * 100 : null

  const donutSegments = useMemo(() => {
    const byKat = new Map<AusgabenKategorie, number>()
    for (const a of monatAusgaben) {
      byKat.set(a.kategorie, (byKat.get(a.kategorie) ?? 0) + a.betrag)
    }
    const segments: { label: string; value: number; color: string }[] = AUSGABEN_KATEGORIEN
      .filter(k => (byKat.get(k) ?? 0) > 0)
      .map(k => ({ label: k, value: byKat.get(k)!, color: AUSGABEN_FARBEN[k] }))
    if (fixkostenGesamt > 0) {
      segments.push({ label: 'Fixkosten', value: fixkostenGesamt, color: VERTRAG_FARBE })
    }
    return segments.sort((a, b) => b.value - a.value)
  }, [monatAusgaben, fixkostenGesamt])

  const grouped = useMemo(() => {
    const map = new Map<string, Ausgabe[]>()
    const sorted = [...monatAusgaben].sort((a, b) => b.datum.localeCompare(a.datum))
    for (const a of sorted) {
      if (!map.has(a.datum)) map.set(a.datum, [])
      map.get(a.datum)!.push(a)
    }
    return [...map.entries()]
  }, [monatAusgaben])

  const groupedEinnahmen = useMemo(() => {
    const map = new Map<string, Einnahme[]>()
    const sorted = [...monatEinnahmen].sort((a, b) => b.datum.localeCompare(a.datum))
    for (const e of sorted) {
      if (!map.has(e.datum)) map.set(e.datum, [])
      map.get(e.datum)!.push(e)
    }
    return [...map.entries()]
  }, [monatEinnahmen])

  const aktiveWE = useMemo(
    () => wiederkehrendeEinnahmen.filter(w => w.status === 'aktiv'),
    [wiederkehrendeEinnahmen]
  )

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-50 dark:bg-black px-4 pb-3 border-b border-gray-200 dark:border-[#38383a]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex items-center justify-between pt-2">
          <div className="flex gap-1 bg-gray-100 dark:bg-[#2c2c2e] rounded-xl p-1">
            {(['ausgaben', 'einnahmen'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  view === v
                    ? 'bg-white dark:bg-[#38383a] text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-[#8e8e93]'
                }`}
              >
                {v === 'ausgaben' ? 'Ausgaben' : 'Einnahmen'}
              </button>
            ))}
          </div>
          <button
            onClick={view === 'ausgaben' ? onAdd : onAddEinnahme}
            className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium"
          >
            <Plus size={16} /> {view === 'ausgaben' ? 'Ausgabe' : 'Einnahme'}
          </button>
        </div>
        <div className="flex items-center justify-center gap-2 pt-2">
          <button onClick={vorMonat} className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 active:bg-gray-200 dark:active:bg-[#2c2c2e]">
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-semibold w-36 text-center">
            {MONATE[monat]} {jahr}
          </span>
          <button onClick={naechsterMonat} className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 active:bg-gray-200 dark:active:bg-[#2c2c2e]">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {view === 'ausgaben' ? (
        <div className="px-4 pt-4 space-y-4 pb-8">
          {/* Monatsbilanz (wenn Einnahmen vorhanden) */}
          {einnahmenGesamt > 0 && (
            <div className={`rounded-2xl px-4 py-3 flex items-center justify-between ${bilanz >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
              <div>
                <div className={`text-xs font-medium ${bilanz >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>Monatsbilanz</div>
                <div className={`text-xl font-bold mt-0.5 ${bilanz >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>{bilanz >= 0 ? '+' : ''}{formatEuro(bilanz)}</div>
              </div>
              {sparquote !== null && (
                <div className="text-right">
                  <div className="text-xs text-gray-500 dark:text-[#8e8e93]">Sparquote</div>
                  <div className={`text-lg font-bold ${sparquote >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>{sparquote.toFixed(1)}%</div>
                </div>
              )}
            </div>
          )}

          {/* Monthly totals */}
          <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl divide-y divide-gray-100 dark:divide-[#38383a]">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="text-xs text-gray-500 dark:text-[#8e8e93] font-medium">Variable Ausgaben</div>
                <div className="text-xl font-bold mt-0.5">{formatEuro(ausgabenGesamt)}</div>
              </div>
              <div className="text-xs text-gray-400">{monatAusgaben.length} Einträge</div>
            </div>
            {fixkostenGesamt > 0 && (
              <>
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="text-xs text-gray-500 dark:text-[#8e8e93] font-medium">Fixkosten (Verträge)</div>
                    <div className="text-xl font-bold mt-0.5">{formatEuro(fixkostenGesamt)}</div>
                  </div>
                  <div className="text-xs text-gray-400">{monatVertraege.length} Verträge</div>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">Gesamt</div>
                  <div className="text-base font-bold">{formatEuro(ausgabenGesamt + fixkostenGesamt)}</div>
                </div>
              </>
            )}
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

          {/* Fixkosten aus Verträgen */}
          {monatVertraege.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-500 dark:text-[#8e8e93] uppercase tracking-wide mb-2 px-1">
                Fixkosten diesen Monat
              </div>
              <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl divide-y divide-gray-100 dark:divide-[#38383a]">
                {monatVertraege.map(v => (
                  <div key={v.id} className="flex items-center px-4 py-3 gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: VERTRAG_FARBE + '22' }}>
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: VERTRAG_FARBE }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{v.name}</div>
                      <div className="text-xs text-gray-500 dark:text-[#8e8e93] truncate">{v.anbieter} · {v.kategorie}</div>
                    </div>
                    <div className="text-sm font-semibold tabular-nums shrink-0">{formatEuro(v.betrag)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {monatAusgaben.length === 0 && monatVertraege.length === 0 && (
            <div className="text-center py-12 text-gray-400 dark:text-[#8e8e93]">
              <div className="text-4xl mb-3">💸</div>
              <div className="text-sm">Noch keine Ausgaben für {MONATE[monat]}</div>
              <button onClick={onAdd} className="mt-3 text-sm text-blue-600 font-medium">
                Erste Ausgabe eintragen
              </button>
            </div>
          )}

          {/* Expense list grouped by day */}
          {grouped.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-500 dark:text-[#8e8e93] uppercase tracking-wide mb-2 px-1">
                Variable Ausgaben
              </div>
              {grouped.map(([day, eintraege]) => (
                <div key={day} className="mb-4">
                  <div className="text-xs text-gray-400 dark:text-[#8e8e93] mb-1.5 px-1">
                    {formatDatumLang(day)}
                  </div>
                  <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl divide-y divide-gray-100 dark:divide-[#38383a]">
                    {eintraege.map(a => (
                      <div key={a.id} className="flex items-center px-4 py-3 gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: AUSGABEN_FARBEN[a.kategorie] + '22' }}>
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: AUSGABEN_FARBEN[a.kategorie] }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{a.beschreibung || a.kategorie}</div>
                          {a.beschreibung && (
                            <div className="text-xs text-gray-500 dark:text-[#8e8e93] truncate">{a.kategorie}</div>
                          )}
                        </div>
                        <div className="text-sm font-semibold tabular-nums shrink-0">{formatEuro(a.betrag)}</div>
                        <button onClick={() => onRemove(a.id)} className="p-1 text-gray-300 dark:text-[#48484a] active:text-red-500 shrink-0">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Einnahmen-View */
        <div className="px-4 pt-4 space-y-4 pb-8">
          {/* Summary */}
          <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl divide-y divide-gray-100 dark:divide-[#38383a]">
            {weGesamt > 0 && (
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="text-xs text-gray-500 dark:text-[#8e8e93] font-medium">Fixeinnahmen</div>
                  <div className="text-xl font-bold mt-0.5">{formatEuro(weGesamt)}</div>
                </div>
                <div className="text-xs text-gray-400">{aktiveWE.length} wiederkehrend</div>
              </div>
            )}
            {variableEinnahmenGesamt > 0 && (
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="text-xs text-gray-500 dark:text-[#8e8e93] font-medium">Variable Einnahmen</div>
                  <div className="text-xl font-bold mt-0.5">{formatEuro(variableEinnahmenGesamt)}</div>
                </div>
                <div className="text-xs text-gray-400">{monatEinnahmen.length} Einträge</div>
              </div>
            )}
            {einnahmenGesamt > 0 && (weGesamt > 0 || variableEinnahmenGesamt > 0) && weGesamt > 0 && variableEinnahmenGesamt > 0 && (
              <div className="flex items-center justify-between px-4 py-3">
                <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">Gesamt</div>
                <div className="text-base font-bold text-green-600 dark:text-green-400">{formatEuro(einnahmenGesamt)}</div>
              </div>
            )}
          </div>

          {/* Fixeinnahmen */}
          {aktiveWE.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-500 dark:text-[#8e8e93] uppercase tracking-wide mb-2 px-1">
                Fixeinnahmen
              </div>
              <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl divide-y divide-gray-100 dark:divide-[#38383a]">
                {aktiveWE.map(w => {
                  const color = EINNAHME_FARBEN[w.kategorie]
                  return (
                    <div key={w.id} className="flex items-center px-4 py-3 gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: color + '22' }}>
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{w.name}</div>
                        <div className="text-xs text-gray-500 dark:text-[#8e8e93] truncate">{w.kategorie} · {w.zahlungsintervall}</div>
                      </div>
                      <div className="text-sm font-semibold tabular-nums shrink-0 text-green-600 dark:text-green-400">+{formatEuro(w.betrag)}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Variable Einnahmen grouped by day */}
          {groupedEinnahmen.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-500 dark:text-[#8e8e93] uppercase tracking-wide mb-2 px-1">
                Variable Einnahmen
              </div>
              {groupedEinnahmen.map(([day, eintraege]) => (
                <div key={day} className="mb-4">
                  <div className="text-xs text-gray-400 dark:text-[#8e8e93] mb-1.5 px-1">
                    {formatDatumLang(day)}
                  </div>
                  <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl divide-y divide-gray-100 dark:divide-[#38383a]">
                    {eintraege.map(e => {
                      const color = EINNAHME_FARBEN[e.kategorie]
                      return (
                        <div key={e.id} className="flex items-center px-4 py-3 gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: color + '22' }}>
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{e.beschreibung || e.kategorie}</div>
                            {e.beschreibung && (
                              <div className="text-xs text-gray-500 dark:text-[#8e8e93] truncate">{e.kategorie}</div>
                            )}
                          </div>
                          <div className="text-sm font-semibold tabular-nums shrink-0 text-green-600 dark:text-green-400">+{formatEuro(e.betrag)}</div>
                          <button onClick={() => onRemoveEinnahme(e.id)} className="p-1 text-gray-300 dark:text-[#48484a] active:text-red-500 shrink-0">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {einnahmenGesamt === 0 && (
            <div className="text-center py-12 text-gray-400 dark:text-[#8e8e93]">
              <div className="text-4xl mb-3">💰</div>
              <div className="text-sm">Noch keine Einnahmen für {MONATE[monat]}</div>
              <button onClick={onAddEinnahme} className="mt-3 text-sm text-blue-600 font-medium">
                Erste Einnahme eintragen
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
