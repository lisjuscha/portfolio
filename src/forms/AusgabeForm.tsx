import { useState } from 'react'
import type { Ausgabe, AusgabenKategorie } from '../types'

export const AUSGABEN_KATEGORIEN: AusgabenKategorie[] = [
  'Lebensmittel', 'Shopping', 'Restaurant & Café', 'Transport',
  'Freizeit', 'Gesundheit', 'Haushalt', 'Sonstiges',
]

export const AUSGABEN_FARBEN: Record<AusgabenKategorie, string> = {
  'Lebensmittel': '#34c759',
  'Shopping': '#007aff',
  'Restaurant & Café': '#4A2E27',
  'Transport': '#af52de',
  'Freizeit': '#ff2d55',
  'Gesundheit': '#ff3b30',
  'Haushalt': '#5ac8fa',
  'Sonstiges': '#8e8e93',
}

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface Props {
  onSave: (a: Ausgabe) => void
  onCancel: () => void
}

export function AusgabeForm({ onSave, onCancel }: Props) {
  const [betrag, setBetrag] = useState('')
  const [kategorie, setKategorie] = useState<AusgabenKategorie>('Lebensmittel')
  const [beschreibung, setBeschreibung] = useState('')
  const [datum, setDatum] = useState(todayISO())

  function submit(e: React.FormEvent) {
    e.preventDefault()
    onSave({
      id: crypto.randomUUID(),
      datum,
      betrag: Number(betrag),
      kategorie,
      beschreibung: beschreibung.trim() || undefined,
    })
  }

  const inputCls = "w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-[#38383a] bg-white dark:bg-[#2c2c2e] text-sm"
  const labelCls = "block text-sm font-medium mb-1"

  return (
    <form onSubmit={submit} className="space-y-4">
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
            placeholder="0,00"
            required
            autoFocus
          />
        </div>
        <div>
          <label className={labelCls}>Datum</label>
          <input
            className={inputCls}
            type="date"
            value={datum}
            onChange={e => setDatum(e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>Kategorie</label>
        <div className="flex flex-wrap gap-2">
          {AUSGABEN_KATEGORIEN.map(k => {
            const isActive = kategorie === k
            const color = AUSGABEN_FARBEN[k]
            return (
              <button
                key={k}
                type="button"
                onClick={() => setKategorie(k)}
                style={isActive ? { backgroundColor: color, borderColor: color } : {}}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  isActive
                    ? 'text-white'
                    : 'border-gray-200 dark:border-[#38383a] text-gray-600 dark:text-gray-400'
                }`}
              >
                {k}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label className={labelCls}>Beschreibung (optional)</label>
        <input
          className={inputCls}
          value={beschreibung}
          onChange={e => setBeschreibung(e.target.value)}
          placeholder="z. B. Rewe Wocheneinkauf"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-[#38383a] text-sm font-medium">
          Abbrechen
        </button>
        <button type="submit"
          className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium">
          Speichern
        </button>
      </div>
    </form>
  )
}
