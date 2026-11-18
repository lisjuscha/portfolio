import { useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, Settings } from 'lucide-react'
import type { AppData } from '../hooks/useAppData'
import type { Sparziel, Schuld, AktieETFPosition, ZinsPosition } from '../types'
import { sparzielFortschritt, positionCurrentValue, erwarteterZinsertrag } from '../utils/calc'
import { formatEuro } from '../utils/format'
import { Sheet } from '../components/Sheet'
import { SparzielForm } from '../forms/SparzielForm'
import { SchuldForm } from '../forms/SchuldForm'
import { EinstellungenPage } from './EinstellungenPage'

interface Props extends AppData {
  hidden: boolean
  onToggleHidden: () => void
}

function ProgressBar({ value, max, color = '#4D0E12' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="h-2 bg-gray-100 dark:bg-[#4f3220] rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  )
}

function Sektion({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-1 py-2"
      >
        <span className="text-xs font-semibold text-gray-500 dark:text-[#8e8e93] uppercase tracking-wide">{title}</span>
        {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
      </button>
      {open && children}
    </div>
  )
}

export function MehrPage({
  hidden, onToggleHidden,
  sparziele, schulden, positionen, konten, ausgaben, fxRates,
  saveSparziel, removeSparziel, saveSchuld, removeSchuld,
  ...rest
}: Props) {
  const [sparzielFormOpen, setSparzielFormOpen] = useState(false)
  const [editSparziel, setEditSparziel] = useState<Sparziel | null>(null)
  const [schuldFormOpen, setSchuldFormOpen] = useState(false)
  const [editSchuld, setEditSchuld] = useState<Schuld | null>(null)

  // ─── Notfallrücklage ────────────────────────────────────────────────────────

  const [notfallMonate, setNotfallMonate] = useState<number>(() => {
    const v = Number(localStorage.getItem('notfallMonatsziel'))
    return v > 0 ? v : 3
  })

  function setNotfallMonateAndSave(v: number) {
    setNotfallMonate(v)
    localStorage.setItem('notfallMonatsziel', String(v))
  }

  const tagesgeldWert = useMemo(() => {
    const tgKonten = konten.filter(k => k.typ === 'Tagesgeld').map(k => k.id)
    return positionen
      .filter(p => tgKonten.includes(p.kontoId))
      .reduce((s, p) => s + positionCurrentValue(p, fxRates), 0)
  }, [konten, positionen, fxRates])

  const avgMonatsausgaben = useMemo(() => {
    const now = new Date()
    let sum = 0
    let count = 0
    for (let i = 1; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const total = ausgaben.filter(a => a.datum.startsWith(prefix)).reduce((s, a) => s + a.betrag, 0)
      if (total > 0) { sum += total; count++ }
    }
    return count > 0 ? sum / count : 0
  }, [ausgaben])

  const notfallZiel = notfallMonate * avgMonatsausgaben

  // ─── Freistellungsauftrag ───────────────────────────────────────────────────

  const [gemeinsam, setGemeinsam] = useState(() => localStorage.getItem('freistellungGemeinsam') === '1')

  function toggleGemeinsam() {
    const next = !gemeinsam
    setGemeinsam(next)
    localStorage.setItem('freistellungGemeinsam', next ? '1' : '0')
  }

  const freistellungLimit = gemeinsam ? 2000 : 1000

  const jahresErtraege = useMemo(() => {
    const now = new Date()
    const jahresanfang = new Date(now.getFullYear(), 0, 1)
    const jahresende = new Date(now.getFullYear(), 11, 31)

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
      .reduce((s, p) => {
        const p2 = p as AktieETFPosition
        const monthsElapsed = now.getMonth() + 1
        return s + (p2.jaehresDividende! * monthsElapsed / 12)
      }, 0)

    // also count full-year dividends from positions with end-year payment
    const _ = jahresende // suppress unused warning
    void _

    return zinsen + dividenden
  }, [positionen])

  // ─── Schulden Summe ─────────────────────────────────────────────────────────

  const schuldenGesamt = useMemo(
    () => schulden.reduce((s, d) => s + d.restbetrag, 0),
    [schulden]
  )

  return (
    <div>
      {/* Header */}
      <div
        className="sticky top-0 z-10 bg-gray-50 dark:bg-black px-4 pb-3 border-b border-gray-200 dark:border-[#4f3220]"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <h1 className="text-xl font-bold pt-2">Mehr</h1>
      </div>

      <div className="px-4 pt-4 pb-8 space-y-6">

        {/* ─── 1. Sparziele ──────────────────────────────────────────────── */}
        <Sektion title="Sparziele">
          <div className="space-y-3">
            {sparziele.length === 0 ? (
              <div className="bg-white dark:bg-[#2d1c16] rounded-2xl p-4 text-center text-sm text-gray-400">
                Noch keine Sparziele.
              </div>
            ) : (
              sparziele.map(z => {
                const fp = sparzielFortschritt(z, positionen, konten, fxRates)
                return (
                  <div key={z.id} className="bg-white dark:bg-[#2d1c16] rounded-2xl p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold">{z.name}</div>
                        {z.zieldatum && (
                          <div className="text-xs text-gray-400 mt-0.5">Ziel: {new Date(z.zieldatum).toLocaleDateString('de-DE')}</div>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => { setEditSparziel(z); setSparzielFormOpen(true) }} className="p-1.5 text-gray-400 active:text-blue-600">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => { if (confirm(`"${z.name}" löschen?`)) void removeSparziel(z.id) }} className="p-1.5 text-gray-300 active:text-red-500">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <ProgressBar value={fp.aktuell} max={z.zielbetrag} color="#007aff" />
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">{hidden ? '••••' : formatEuro(fp.aktuell)}</span>
                      <span className="font-medium">{fp.prozent.toFixed(0)}%</span>
                      <span className="text-gray-500">{hidden ? '••••' : formatEuro(z.zielbetrag)}</span>
                    </div>
                    {fp.fehlend > 0 && (
                      <div className="text-xs text-gray-400">
                        Fehlend: {hidden ? '••••' : formatEuro(fp.fehlend)}
                        {fp.monatlicheSparrate && ` · ${hidden ? '••••' : formatEuro(fp.monatlicheSparrate)}/Monat`}
                      </div>
                    )}
                  </div>
                )
              })
            )}
            <button
              onClick={() => { setEditSparziel(null); setSparzielFormOpen(true) }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-gray-200 dark:border-[#4f3220] text-sm text-blue-600 dark:text-blue-400 font-medium"
            >
              <Plus size={16} /> Sparziel hinzufügen
            </button>
          </div>
        </Sektion>

        {/* ─── 2. Schulden ───────────────────────────────────────────────── */}
        <Sektion title="Schulden & Verbindlichkeiten">
          <div className="space-y-3">
            {schulden.length > 0 && (
              <div className="bg-white dark:bg-[#2d1c16] rounded-2xl px-4 py-3 flex items-center justify-between">
                <div className="text-xs text-gray-500 dark:text-[#8e8e93] font-medium">Gesamtschulden</div>
                <div className="text-lg font-bold text-red-600 dark:text-red-400">{hidden ? '••••' : formatEuro(schuldenGesamt)}</div>
              </div>
            )}
            {schulden.length === 0 ? (
              <div className="bg-white dark:bg-[#2d1c16] rounded-2xl p-4 text-center text-sm text-gray-400">
                Keine Verbindlichkeiten.
              </div>
            ) : (
              schulden.map(s => {
                const restMonate = s.monatlicheRate > 0 ? Math.ceil(s.restbetrag / s.monatlicheRate) : null
                return (
                  <div key={s.id} className="bg-white dark:bg-[#2d1c16] rounded-2xl p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold">{s.name}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{s.glaeubiger} · {s.kategorie}</div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => { setEditSchuld(s); setSchuldFormOpen(true) }} className="p-1.5 text-gray-400 active:text-blue-600">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => { if (confirm(`"${s.name}" löschen?`)) void removeSchuld(s.id) }} className="p-1.5 text-gray-300 active:text-red-500">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <div className="text-gray-400">Restbetrag</div>
                        <div className="font-semibold text-red-600 dark:text-red-400 mt-0.5">{hidden ? '••••' : formatEuro(s.restbetrag)}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Zinssatz</div>
                        <div className="font-semibold mt-0.5">{s.zinssatz.toFixed(2)} %</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Monatl. Rate</div>
                        <div className="font-semibold mt-0.5">{hidden ? '••••' : formatEuro(s.monatlicheRate)}</div>
                      </div>
                    </div>
                    {restMonate !== null && (
                      <div className="text-xs text-gray-400">
                        Restlaufzeit: ca. {restMonate} Monat{restMonate !== 1 ? 'e' : ''}
                      </div>
                    )}
                  </div>
                )
              })
            )}
            <button
              onClick={() => { setEditSchuld(null); setSchuldFormOpen(true) }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-gray-200 dark:border-[#4f3220] text-sm text-red-600 dark:text-red-400 font-medium"
            >
              <Plus size={16} /> Schuld hinzufügen
            </button>
          </div>
        </Sektion>

        {/* ─── 3. Notfallrücklage ────────────────────────────────────────── */}
        <Sektion title="Notfallrücklage">
          <div className="bg-white dark:bg-[#2d1c16] rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 dark:text-[#8e8e93] font-medium">Tagesgeld-Guthaben</div>
                <div className="text-xl font-bold mt-0.5">{hidden ? '••••' : formatEuro(tagesgeldWert)}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500 dark:text-[#8e8e93] font-medium">Ziel ({notfallMonate} Monate)</div>
                <div className="text-base font-semibold mt-0.5">
                  {hidden ? '••••' : avgMonatsausgaben > 0 ? formatEuro(notfallZiel) : '—'}
                </div>
              </div>
            </div>
            {notfallZiel > 0 && (
              <>
                <ProgressBar
                  value={tagesgeldWert}
                  max={notfallZiel}
                  color={tagesgeldWert >= notfallZiel ? '#34c759' : '#ff9500'}
                />
                <div className="text-xs text-gray-400 text-center">
                  {((tagesgeldWert / notfallZiel) * 100).toFixed(0)}% · {' '}
                  {tagesgeldWert >= notfallZiel
                    ? 'Ziel erreicht'
                    : `${hidden ? '••••' : formatEuro(notfallZiel - tagesgeldWert)} fehlen noch`}
                </div>
              </>
            )}
            <div>
              <div className="text-xs text-gray-500 mb-2">Zielmonate ({notfallMonate})</div>
              <div className="flex gap-1.5 flex-wrap">
                {[1, 2, 3, 4, 6, 8, 10, 12].map(m => (
                  <button
                    key={m}
                    onClick={() => setNotfallMonateAndSave(m)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      notfallMonate === m
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'border-gray-200 dark:border-[#4f3220] text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {m}M
                  </button>
                ))}
              </div>
            </div>
            {avgMonatsausgaben === 0 && (
              <div className="text-xs text-gray-400 text-center">Noch keine Ausgaben der letzten 3 Monate — Basis fehlt.</div>
            )}
          </div>
        </Sektion>

        {/* ─── 4. Freistellungsauftrag ───────────────────────────────────── */}
        <Sektion title="Freistellungsauftrag">
          <div className="bg-white dark:bg-[#2d1c16] rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Zusammenveranlagung</span>
              <button
                onClick={toggleGemeinsam}
                className={`w-12 h-6 rounded-full transition-colors ${gemeinsam ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white m-0.5 transition-transform ${gemeinsam ? 'translate-x-6' : ''}`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 dark:text-[#8e8e93] font-medium">Kapitalerträge lfd. Jahr</div>
                <div className="text-xl font-bold mt-0.5">{hidden ? '••••' : formatEuro(jahresErtraege)}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500 dark:text-[#8e8e93] font-medium">Freistellungsbetrag</div>
                <div className="text-base font-semibold mt-0.5">{formatEuro(freistellungLimit)}</div>
              </div>
            </div>
            <ProgressBar
              value={jahresErtraege}
              max={freistellungLimit}
              color={jahresErtraege >= freistellungLimit * 0.9 ? '#ff3b30' : jahresErtraege >= freistellungLimit * 0.7 ? '#ff9500' : '#34c759'}
            />
            <div className="text-xs text-gray-400 text-center">
              {((jahresErtraege / freistellungLimit) * 100).toFixed(1)}% ausgeschöpft
              {jahresErtraege >= freistellungLimit
                ? ' — Freibetrag überschritten!'
                : ` · ${hidden ? '••••' : formatEuro(freistellungLimit - jahresErtraege)} verbleibend`}
            </div>
          </div>
        </Sektion>

        {/* ─── 5. Einstellungen ──────────────────────────────────────────── */}
        <div className="border-t-2 border-gray-200 dark:border-[#4f3220] pt-6">
          <div className="flex items-center gap-2 px-1 mb-4">
            <Settings size={16} className="text-gray-500 dark:text-[#8e8e93]" />
            <span className="text-xs font-semibold text-gray-500 dark:text-[#8e8e93] uppercase tracking-wide">Einstellungen</span>
          </div>
          <EinstellungenPage
            embedded
            hidden={hidden}
            onToggleHidden={onToggleHidden}
            konten={konten}
            positionen={positionen}
            ausgaben={ausgaben}
            fxRates={fxRates}
            sparziele={sparziele}
            schulden={schulden}
            saveSparziel={saveSparziel}
            removeSparziel={removeSparziel}
            saveSchuld={saveSchuld}
            removeSchuld={removeSchuld}
            {...rest}
          />
        </div>
      </div>

      {/* Sheets */}
      <Sheet open={sparzielFormOpen} onClose={() => setSparzielFormOpen(false)}
        title={editSparziel ? 'Sparziel bearbeiten' : 'Neues Sparziel'} fullscreen>
        <SparzielForm
          initial={editSparziel ?? undefined}
          positionen={positionen}
          konten={konten}
          onSave={z => { void saveSparziel(z); setSparzielFormOpen(false) }}
          onCancel={() => setSparzielFormOpen(false)}
        />
      </Sheet>

      <Sheet open={schuldFormOpen} onClose={() => setSchuldFormOpen(false)}
        title={editSchuld ? 'Schuld bearbeiten' : 'Neue Verbindlichkeit'} fullscreen>
        <SchuldForm
          initial={editSchuld ?? undefined}
          onSave={s => { void saveSchuld(s); setSchuldFormOpen(false) }}
          onCancel={() => setSchuldFormOpen(false)}
        />
      </Sheet>
    </div>
  )
}
