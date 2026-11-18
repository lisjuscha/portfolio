import { useState } from 'react'
import type { WiederkehrendeEinnahme, Zahlungsintervall, EinnahmeKategorie } from '../types'
import { EINNAHME_KATEGORIEN, EINNAHME_FARBEN } from './EinnahmeForm'

const INTERVALLE: Zahlungsintervall[] = ['monatlich', 'vierteljährlich', 'halbjährlich', 'jährlich']

interface Props {
  initial?: WiederkehrendeEinnahme
  onSave: (w: WiederkehrendeEinnahme) => void
  onCancel: () => void
}

export function WiederkehrendeEinnahmeForm({ initial, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [betrag, setBetrag] = useState(String(initial?.betrag ?? ''))
  const [zahlungsintervall, setZahlungsintervall] = useState<Zahlungsintervall>(initial?.zahlungsintervall ?? 'monatlich')
  const [naechsteZahlung, setNaechsteZahlung] = useState(initial?.naechsteZahlung ?? '')
  const [kategorie, setKategorie] = useState<EinnahmeKategorie>(initial?.kategorie ?? 'Gehalt')
  const [status, setStatus] = useState<'aktiv' | 'inaktiv'>(initial?.status ?? 'aktiv')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      name: name.trim(),
      betrag: Number(betrag),
      zahlungsintervall,
      naechsteZahlung,
      kategorie,
      status,
    })
  }

  const inputCls = "w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-[#4f3220] bg-white dark:bg-[#3d2718] text-sm"
  const labelCls = "block text-sm font-medium mb-1"

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className={labelCls}>Bezeichnung</label>
        <input
          className={inputCls}
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="z. B. Monatsgehalt"
          required
          autoFocus
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Betrag €</label>
          <input
            className={inputCls}
            type="number"
            min="0.01"
            step="0.01"
            value={betrag}
            onChange={e => setBetrag(e.target.value)}
            required
          />
        </div>
        <div>
          <label className={labelCls}>Intervall</label>
          <select
            className={inputCls}
            value={zahlungsintervall}
            onChange={e => setZahlungsintervall(e.target.value as Zahlungsintervall)}
          >
            {INTERVALLE.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className={labelCls}>Nächste Zahlung</label>
        <input
          className={inputCls}
          type="date"
          value={naechsteZahlung}
          onChange={e => setNaechsteZahlung(e.target.value)}
          required
        />
      </div>

      <div>
        <label className={labelCls}>Kategorie</label>
        <div className="flex flex-wrap gap-2">
          {EINNAHME_KATEGORIEN.map(k => {
            const isActive = kategorie === k
            const color = EINNAHME_FARBEN[k]
            return (
              <button
                key={k}
                type="button"
                onClick={() => setKategorie(k)}
                style={isActive ? { backgroundColor: color, borderColor: color } : {}}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  isActive ? 'text-white' : 'border-gray-200 dark:border-[#4f3220] text-gray-600 dark:text-gray-400'
                }`}
              >
                {k}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex items-center justify-between py-1">
        <span className="text-sm font-medium">Status</span>
        <div className="flex gap-2">
          {(['aktiv', 'inaktiv'] as const).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                status === s
                  ? 'bg-green-600 text-white border-green-600'
                  : 'border-gray-200 dark:border-[#4f3220] text-gray-600 dark:text-gray-400'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-[#4f3220] text-sm font-medium">
          Abbrechen
        </button>
        <button type="submit"
          className="flex-1 py-2.5 rounded-xl bg-green-600 text-white text-sm font-medium">
          Speichern
        </button>
      </div>
    </form>
  )
}
