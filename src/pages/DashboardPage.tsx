import { useState, useMemo } from 'react'
import { Eye, EyeOff, TrendingUp, TrendingDown, Plus, RefreshCw, AlertCircle } from 'lucide-react'
import type { AppData } from '../hooks/useAppData'
import type { ZeitraumFilter, SparzielFortschritt as SparzielFortschrittType } from '../utils/calc'
import { filterSnapshots, positionCurrentValue, sparzielFortschritt, gesamtwertNachAnlageklasse, intervallZuMonatsbetrag } from '../utils/calc'
import { formatEuro, formatPct, formatDate, daysBetween, today } from '../utils/format'
import { DonutChart, ANLAGEKLASSE_COLORS } from '../components/DonutChart'
import { LineChart } from '../components/LineChart'
import { ProgressBar } from '../components/ProgressBar'
import type { ZinsPosition, VLPosition } from '../types'
import { collectTermine } from '../utils/ics'

interface Props extends AppData {
  hidden: boolean
  onToggleHidden: () => void
  onRefreshQuotes: () => void
  onOpenPositionForm: () => void
  onOpenVertragForm: () => void
}

const ZEITRAEUME: ZeitraumFilter[] = ['1M', '6M', '1J', 'Max']

export function DashboardPage({ hidden, onToggleHidden, onRefreshQuotes, positionen, sparplaene, vertraege, snapshots, sparziele, konten, fxRates, onOpenPositionForm, onOpenVertragForm }: Props) {
  const [zeitraum, setZeitraum] = useState<ZeitraumFilter>('1M')
  const [refreshing, setRefreshing] = useState(false)

  const gesamtwert = useMemo(
    () => positionen.reduce((s, p) => s + positionCurrentValue(p, fxRates), 0),
    [positionen, fxRates]
  )

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

  const lastBackup = localStorage.getItem('lastBackup')
  const backupWarning = !lastBackup || daysBetween(new Date(lastBackup), today()) < -30

  async function handleRefresh() {
    setRefreshing(true)
    try { await onRefreshQuotes() } finally { setRefreshing(false) }
  }

  return (
    <div className="px-4 py-4 space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
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

      {/* Gesamtwert */}
      <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-5 shadow-sm">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Gesamtvermögen</p>
        <p className="text-4xl font-bold tabular-nums tracking-tight">
          {formatEuro(gesamtwert, hidden)}
        </p>
        {delta !== null && !hidden && (
          <div className={`flex items-center gap-1 mt-2 text-sm font-medium ${delta.absolut >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {delta.absolut >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span className="tabular-nums">{formatEuro(delta.absolut)}</span>
            <span className="tabular-nums">({formatPct(delta.prozent)})</span>
            <span className="text-gray-400 font-normal">seit {zeitraum}</span>
          </div>
        )}
      </div>

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
  )
}
