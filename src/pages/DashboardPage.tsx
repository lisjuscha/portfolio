import { useState, useMemo } from 'react'
import { Eye, EyeOff, TrendingUp, TrendingDown, Plus, RefreshCw, AlertCircle } from 'lucide-react'
import type { AppData } from '../hooks/useAppData'
import type { ZeitraumFilter, SparzielFortschritt as SparzielFortschrittType } from '../utils/calc'
import { filterSnapshots, positionCurrentValue, sparzielFortschritt, gesamtwertNachAnlageklasse, intervallZuMonatsbetrag, intervallZuMonatsbetrag as weMonat, erwarteterZinsertrag } from '../utils/calc'
import { formatEuro, formatPct, formatDate, daysBetween, today } from '../utils/format'
import { DonutChart, ANLAGEKLASSE_COLORS } from '../components/DonutChart'
import { LineChart } from '../components/LineChart'
import { ProgressBar } from '../components/ProgressBar'
import type { ZinsPosition, VLPosition, AktieETFPosition } from '../types'
import { collectTermine } from '../utils/ics'

interface Props extends AppData {
  hidden: boolean
  onToggleHidden: () => void
  onRefreshQuotes: () => void
  onOpenPositionForm: () => void
  onOpenVertragForm: () => void
}

const ZEITRAEUME: ZeitraumFilter[] = ['1M', '6M', '1J', 'Max']

export function DashboardPage({ hidden, onToggleHidden, onRefreshQuotes, positionen, sparplaene, vertraege, snapshots, sparziele, konten, fxRates, onOpenPositionForm, onOpenVertragForm, schulden, einnahmen, wiederkehrendeEinnahmen, ausgaben }: Props) {
  const [zeitraum, setZeitraum] = useState<ZeitraumFilter>('1M')
  const [refreshing, setRefreshing] = useState(false)

  const gesamtwert = useMemo(
    () => positionen.reduce((s, p) => s + positionCurrentValue(p, fxRates), 0),
    [positionen, fxRates]
  )

  const schuldenGesamt = useMemo(
    () => schulden.reduce((s, d) => s + d.restbetrag, 0),
    [schulden]
  )

  const nettovermoegen = gesamtwert - schuldenGesamt

  const filteredSnapshots = useMemo(() => filterSnapshots(snapshots, zeitraum), [snapshots, zeitraum])

  const delta = useMemo(() => {
    if (filteredSnapshots.length < 2) return null
    const first = filteredSnapshots[0].gesamtwert
    return { absolut: gesamtwert - first, prozent: first === 0 ? 0 : ((gesamtwert - first) / first) * 100 }
  }, [filteredSnapshots, gesamtwert])

  const wertNachKlasse = useMemo(() => gesamtwertNachAnlageklasse(positionen, fxRates), [positionen, fxRates])

  const donutSegments = useMemo(() =>
    Object.entries(wertNachKlasse)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({ label: k, value: v as number, color: ANLAGEKLASSE_COLORS[k as keyof typeof ANLAGEKLASSE_COLORS] }))
      .sort((a, b) => b.value - a.value),
    [wertNachKlasse]
  )

  const zielFortschritte = useMemo(() =>
    sparziele.map(z => ({
      ziel: z,
      fortschritt: sparzielFortschritt(z, positionen, konten, fxRates) as SparzielFortschrittType,
    })),
    [sparziele, positionen, konten, fxRates]
  )

  const naechsteTermine = useMemo(() => {
    const zinsPoz = positionen.filter((p): p is ZinsPosition =>
      p.anlageklasse === 'Zinssparen' || p.anlageklasse === 'Sparbrief' || p.anlageklasse === 'Festgeld'
    )
    const vlPoz = positionen.filter((p): p is VLPosition => p.anlageklasse === 'VL')
    return collectTermine(vertraege, sparplaene, [...zinsPoz, ...vlPoz], 30)
  }, [vertraege, sparplaene, positionen])

  const fixkostenMonat = useMemo(() =>
    vertraege.filter(v => v.status === 'aktiv').reduce((sum, v) => sum + intervallZuMonatsbetrag(v.betrag, v.zahlungsintervall), 0),
    [vertraege]
  )

  // ─── Monatsbilanz-Mini ────────────────────────────────────────────────────────
  const monatsbilanz = useMemo(() => {
    const now = new Date()
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const varEinnahmen = einnahmen.filter(e => e.datum.startsWith(prefix)).reduce((s, e) => s + e.betrag, 0)
    const weGesamt = wiederkehrendeEinnahmen
      .filter(w => w.status === 'aktiv')
      .reduce((s, w) => s + weMonat(w.betrag, w.zahlungsintervall), 0)
    const einnahmenGesamt = varEinnahmen + weGesamt
    if (einnahmenGesamt === 0) return null
    const ausgabenMonat = ausgaben.filter(a => a.datum.startsWith(prefix)).reduce((s, a) => s + a.betrag, 0)
    const bilanz = einnahmenGesamt - ausgabenMonat - fixkostenMonat
    const sparquote = einnahmenGesamt > 0 ? (bilanz / einnahmenGesamt) * 100 : 0
    return { einnahmen: einnahmenGesamt, ausgaben: ausgabenMonat + fixkostenMonat, bilanz, sparquote }
  }, [einnahmen, wiederkehrendeEinnahmen, ausgaben, fixkostenMonat])

  // ─── Notfallrücklage-Mini ─────────────────────────────────────────────────────
  const notfallMini = useMemo(() => {
    const tgKonten = konten.filter(k => k.typ === 'Tagesgeld').map(k => k.id)
    const tgWert = positionen
      .filter(p => tgKonten.includes(p.kontoId))
      .reduce((s, p) => s + positionCurrentValue(p, fxRates), 0)
    if (tgKonten.length === 0) return null
    const zielMonate = Number(localStorage.getItem('notfallMonatsziel') || 3)
    const now = new Date()
    let sum = 0; let count = 0
    for (let i = 1; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const pfx = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const total = ausgaben.filter(a => a.datum.startsWith(pfx)).reduce((s, a) => s + a.betrag, 0)
      if (total > 0) { sum += total; count++ }
    }
    const avg = count > 0 ? sum / count : 0
    if (avg === 0) return { tgWert, zielMonate, ziel: 0 }
    return { tgWert, zielMonate, ziel: zielMonate * avg }
  }, [konten, positionen, ausgaben, fxRates])

  // ─── Freistellungsauftrag-Mini ────────────────────────────────────────────────
  const freistellungMini = useMemo(() => {
    const gemeinsam = localStorage.getItem('freistellungGemeinsam') === '1'
    const limit = gemeinsam ? 2000 : 1000
    const now = new Date()
    const jahresanfang = new Date(now.getFullYear(), 0, 1)
    const zinsen = positionen
      .filter((p): p is ZinsPosition =>
        p.anlageklasse === 'Zinssparen' || p.anlageklasse === 'Sparbrief' || p.anlageklasse === 'Festgeld'
      )
      .reduce((s, p) => {
        const jahresBeginn = erwarteterZinsertrag(p, jahresanfang)
        const jahresJetzt = erwarteterZinsertrag(p, now)
        return s + Math.max(0, jahresJetzt - jahresBeginn)
      }, 0)
    const dividenden = positionen
      .filter((p): p is AktieETFPosition =>
        (p.anlageklasse === 'Aktie' || p.anlageklasse === 'ETF') && p.jaehresDividende != null
      )
      .reduce((s, p) => s + (p.jaehresDividende! * (now.getMonth() + 1) / 12), 0)
    const ertraege = zinsen + dividenden
    if (ertraege === 0) return null
    return { ertraege, limit, pct: Math.min(100, (ertraege / limit) * 100) }
  }, [positionen])

  const lastBackup = localStorage.getItem('lastBackup')
  const backupWarning = !lastBackup || daysBetween(new Date(lastBackup), today()) < -30

  async function handleRefresh() {
    setRefreshing(true)
    try { await onRefreshQuotes() } finally { setRefreshing(false) }
  }

  return (
    <div>
      {/* Sticky nav bar — solid background covers Dynamic Island zone */}
      <div
        className="sticky top-0 z-10 bg-gray-50 dark:bg-black px-4 pb-3"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex items-center justify-between pt-2">
          <h1 className="text-xl font-bold">Portfolio</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => void handleRefresh()} className="p-2 text-gray-500 dark:text-gray-400 rounded-xl" aria-label="Kurse aktualisieren">
              <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <button onClick={onToggleHidden} className="p-2 text-gray-500 dark:text-gray-400 rounded-xl" aria-label={hidden ? 'Beträge anzeigen' : 'Beträge verbergen'}>
              {hidden ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
      </div>
      <div className="px-4 pt-2 space-y-5 pb-8">

      {/* Gesamtwert */}
      <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-5 shadow-sm">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Gesamtvermögen</p>
        <p className="text-4xl font-bold tabular-nums tracking-tight">
          {formatEuro(gesamtwert, hidden)}
        </p>
        {schuldenGesamt > 0 && (
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-[#38383a]">
            <span className="text-xs text-gray-400">Nettovermögen (nach Schulden)</span>
            <span className={`text-sm font-semibold tabular-nums ${nettovermoegen >= 0 ? 'text-gray-800 dark:text-gray-200' : 'text-red-500'}`}>
              {hidden ? '••••' : formatEuro(nettovermoegen)}
            </span>
          </div>
        )}
        {delta !== null && !hidden && (
          <div className={`flex items-center gap-1 mt-2 text-sm font-medium ${delta.absolut >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {delta.absolut >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span className="tabular-nums">{formatEuro(delta.absolut)}</span>
            <span className="tabular-nums">({formatPct(delta.prozent)})</span>
            <span className="text-gray-400 font-normal">seit {zeitraum}</span>
          </div>
        )}
      </div>

      {/* Monatsbilanz-Mini */}
      {monatsbilanz && (
        <div className={`bg-white dark:bg-[#1c1c1e] rounded-2xl px-4 py-3 shadow-sm ${monatsbilanz.bilanz >= 0 ? 'border-l-4 border-green-500' : 'border-l-4 border-red-500'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Monatsbilanz</p>
              <p className={`text-lg font-bold tabular-nums ${monatsbilanz.bilanz >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {monatsbilanz.bilanz >= 0 ? '+' : ''}{hidden ? '••••' : formatEuro(monatsbilanz.bilanz)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 mb-0.5">Sparquote</p>
              <p className={`text-lg font-bold tabular-nums ${monatsbilanz.sparquote >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                {monatsbilanz.sparquote.toFixed(0)} %
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Notfallrücklage-Mini */}
      {notfallMini && notfallMini.ziel > 0 && (
        <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Notfallrücklage</p>
            <p className="text-xs text-gray-400">{notfallMini.zielMonate} Monate Ziel</p>
          </div>
          <ProgressBar
            value={notfallMini.tgWert}
            max={notfallMini.ziel}
            sublabel={`${hidden ? '••••' : formatEuro(notfallMini.tgWert)} / ${hidden ? '••••' : formatEuro(notfallMini.ziel)}`}
            hidden={hidden}
          />
        </div>
      )}

      {/* Freistellungsauftrag-Mini */}
      {freistellungMini && (
        <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold">Freistellungsauftrag</p>
            <p className="text-xs text-gray-400">{hidden ? '••••' : formatEuro(freistellungMini.ertraege)} / {formatEuro(freistellungMini.limit)}</p>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-[#38383a] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${freistellungMini.pct}%`,
                backgroundColor: freistellungMini.pct >= 90 ? '#ff3b30' : freistellungMini.pct >= 70 ? '#ff9500' : '#34c759'
              }}
            />
          </div>
        </div>
      )}

      {/* Verlauf */}
      <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Verlauf</h2>
          <div className="flex gap-1">
            {ZEITRAEUME.map(z => (
              <button key={z} onClick={() => setZeitraum(z)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${zeitraum === z ? 'bg-blue-600 text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                {z}
              </button>
            ))}
          </div>
        </div>
        <LineChart snapshots={filteredSnapshots} height={110} hidden={hidden} />
      </div>

      {/* Verteilung */}
      {donutSegments.length > 0 && (
        <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold mb-3">Verteilung</h2>
          <div className="flex items-center gap-4">
            <DonutChart segments={donutSegments} size={130} strokeWidth={28} hidden={hidden} />
            <div className="flex-1 space-y-2 min-w-0">
              {donutSegments.map(seg => (
                <div key={seg.label} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                  <span className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1">{seg.label}</span>
                  <span className="text-xs tabular-nums text-gray-500 dark:text-gray-400">
                    {hidden ? '••' : `${((seg.value / Math.max(1, gesamtwert)) * 100).toFixed(0)} %`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sparziele */}
      {zielFortschritte.length > 0 && (
        <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold mb-3">Sparziele</h2>
          <div className="space-y-4">
            {zielFortschritte.map(({ ziel, fortschritt }) => (
              <ProgressBar
                key={ziel.id}
                value={fortschritt.aktuell}
                max={ziel.zielbetrag}
                label={ziel.name}
                sublabel={`${formatEuro(fortschritt.aktuell, hidden)} / ${formatEuro(ziel.zielbetrag, hidden)}`}
                hidden={hidden}
              />
            ))}
          </div>
        </div>
      )}

      {/* Fixkosten */}
      <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Fixkosten / Monat</p>
          <p className="text-2xl font-bold tabular-nums">{formatEuro(fixkostenMonat, hidden)}</p>
        </div>
        <button onClick={onOpenVertragForm} className="flex items-center gap-1 text-blue-600 dark:text-blue-400 text-sm font-medium">
          <Plus size={16} /> Vertrag
        </button>
      </div>

      {/* Nächste Termine */}
      <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Nächste 30 Tage</h2>
          <button onClick={onOpenPositionForm} className="flex items-center gap-1 text-blue-600 dark:text-blue-400 text-sm font-medium">
            <Plus size={16} /> Position
          </button>
        </div>
        {naechsteTermine.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">Keine Termine in den nächsten 30 Tagen</p>
        ) : (
          <div className="space-y-2">
            {naechsteTermine.slice(0, 10).map((t, i) => {
              const days = daysBetween(today(), t.datum)
              const isUrgent = t.typ === 'kuendigung' && days <= 30
              return (
                <div key={i} className="flex items-start gap-3 py-1.5">
                  <div className={`text-xs tabular-nums w-14 shrink-0 pt-0.5 ${isUrgent ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-gray-400'}`}>
                    {formatDate(t.datum.toISOString())}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.titel}</p>
                    <p className="text-xs text-gray-400 truncate">{t.beschreibung}</p>
                  </div>
                  {days <= 7 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${isUrgent ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' : 'bg-gray-100 dark:bg-[#2c2c2e] text-gray-500'}`}>
                      {days === 0 ? 'heute' : `${days}d`}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Backup-Hinweis */}
      {backupWarning && (
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-2xl text-sm">
          <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="text-amber-800 dark:text-amber-300">
            {lastBackup ? `Letztes Backup: ${formatDate(lastBackup)} — bitte sichern.` : 'Noch kein Backup erstellt — bitte sichern.'}
          </span>
        </div>
      )}

      {/* Kurse: Hinweis verzögert */}
      {positionen.some(p => (p.anlageklasse === 'Aktie' || p.anlageklasse === 'ETF') && (p as import('../types').AktieETFPosition).kursZeitstempel) && (
        <p className="text-xs text-gray-400 text-center">Kurse können verzögert sein. Frühestens alle 15 Min. aktualisiert.</p>
      )}
    </div>
    </div>
  )
}
