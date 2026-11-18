import { useState } from 'react'
import type { Sparplan, SparplanIntervall } from '../types'

const INTERVALLE: SparplanIntervall[] = ['monatlich', 'vierteljährlich', 'jährlich']

interface Props {
  positionId: string
  initial?: Sparplan
  onSave: (s: Sparplan) => void
  onCancel: () => void
}

export function SparplanForm({ positionId, initial, onSave, onCancel }: Props) {
  const [betrag, setBetrag] = useState(String(initial?.betrag ?? ''))
  const [intervall, setIntervall] = useState<SparplanIntervall>(initial?.intervall ?? 'monatlich')
  const [ausfuehrungstag, setAusfuehrungstag] = useState(String(initial?.ausfuehrungstag ?? '1'))
  const [startDatum, setStartDatum] = useState(initial?.startDatum ?? new Date().toISOString().slice(0, 10))
  const [endDatum, setEndDatum] = useState(initial?.endDatum ?? '')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      positionId,
      betrag: Number(betrag),
      intervall,
      ausfuehrungstag: Number(ausfuehrungstag),
      startDatum,
      endDatum: endDatum || undefined,
    })
  }

  const inputCls = "w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-[#38383a] bg-white dark:bg-[#2c2c2e] text-sm"
  const labelCls = "block text-sm font-medium mb-1"

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Betrag €</label>
          <input className={inputCls} type="number" min="0.01" step="0.01" value={betrag} onChange={e => setBetrag(e.target.value)} required autoFocus />
        </div>
        <div>
          <label className={labelCls}>Ausführungstag</label>
          <input className={inputCls} type="number" min="1" max="31" value={ausfuehrungstag} onChange={e => setAusfuehrungstag(e.target.value)} required />
        </div>
      </div>
      <div>
        <label className={labelCls}>Intervall</label>
        <div className="flex gap-2">
          {INTERVALLE.map(i => (
            <button key={i} type="button" onClick={() => setIntervall(i)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${intervall === i ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 dark:border-[#38383a] text-gray-600 dark:text-gray-400'}`}>
              {i}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Startdatum</label>
          <input className={inputCls} type="date" value={startDatum} onChange={e => setStartDatum(e.target.value)} required />
        </div>
        <div>
          <label className={labelCls}>Enddatum (optional)</label>
          <input className={inputCls} type="date" value={endDatum} onChange={e => setEndDatum(e.target.value)} />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-[#38383a] text-sm font-medium">Abbrechen</button>
        <button type="submit" className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-medium">Speichern</button>
      </div>
    </form>
  )
}
