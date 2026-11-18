import { useState } from 'react'
import type { Schuld, SchuldKategorie } from '../types'
import { formatEuro } from '../utils/format'

const KATEGORIEN: SchuldKategorie[] = ['Hypothek', 'Ratenkredit', 'Dispokredit', 'Studentenkredit', 'Sonstiges']

interface Props {
  initial?: Schuld
  onSave: (s: Schuld) => void
  onCancel: () => void
}

export function SchuldForm({ initial, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [glaeubiger, setGlaeubiger] = useState(initial?.glaeubiger ?? '')
  const [restbetrag, setRestbetrag] = useState(String(initial?.restbetrag ?? ''))
  const [zinssatz, setZinssatz] = useState(String(initial?.zinssatz ?? ''))
  const [monatlicheRate, setMonatlicheRate] = useState(String(initial?.monatlicheRate ?? ''))
  const [startDatum, setStartDatum] = useState(initial?.startDatum ?? '')
  const [endDatum, setEndDatum] = useState(initial?.endDatum ?? '')
  const [kategorie, setKategorie] = useState<SchuldKategorie>(initial?.kategorie ?? 'Ratenkredit')

  const restlaufzeit = restbetrag && monatlicheRate && Number(monatlicheRate) > 0
    ? Math.ceil(Number(restbetrag) / Number(monatlicheRate))
    : null

  function submit(e: React.FormEvent) {
    e.preventDefault()
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      name: name.trim(),
      glaeubiger: glaeubiger.trim(),
      restbetrag: Number(restbetrag),
      zinssatz: Number(zinssatz),
      monatlicheRate: Number(monatlicheRate),
      startDatum,
      endDatum: endDatum || undefined,
      kategorie,
    })
  }

  const inputCls = "w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-[#4f3220] bg-white dark:bg-[#3d2718] text-sm"
  const labelCls = "block text-sm font-medium mb-1"

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Bezeichnung</label>
          <input
            className={inputCls}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="z. B. Autokredit"
            required
            autoFocus
          />
        </div>
        <div>
          <label className={labelCls}>Gläubiger</label>
          <input
            className={inputCls}
            value={glaeubiger}
            onChange={e => setGlaeubiger(e.target.value)}
            placeholder="z. B. Sparkasse"
            required
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>Kategorie</label>
        <div className="flex flex-wrap gap-2">
          {KATEGORIEN.map(k => (
            <button
              key={k}
              type="button"
              onClick={() => setKategorie(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                kategorie === k
                  ? 'bg-red-600 text-white border-red-600'
                  : 'border-gray-200 dark:border-[#4f3220] text-gray-600 dark:text-gray-400'
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Restbetrag €</label>
          <input
            className={inputCls}
            type="number"
            min="0.01"
            step="0.01"
            value={restbetrag}
            onChange={e => setRestbetrag(e.target.value)}
            required
          />
        </div>
        <div>
          <label className={labelCls}>Zinssatz % p.a.</label>
          <input
            className={inputCls}
            type="number"
            min="0"
            step="0.01"
            value={zinssatz}
            onChange={e => setZinssatz(e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>Monatliche Rate €</label>
        <input
          className={inputCls}
          type="number"
          min="0.01"
          step="0.01"
          value={monatlicheRate}
          onChange={e => setMonatlicheRate(e.target.value)}
          required
        />
        {restlaufzeit !== null && (
          <div className="mt-1.5 text-xs text-gray-500 dark:text-[#8e8e93]">
            Geschätzte Restlaufzeit: ca. {restlaufzeit} Monat{restlaufzeit !== 1 ? 'e' : ''} ·{' '}
            Gesamtrate: {formatEuro(restlaufzeit * Number(monatlicheRate))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Startdatum</label>
          <input
            className={inputCls}
            type="date"
            value={startDatum}
            onChange={e => setStartDatum(e.target.value)}
            required
          />
        </div>
        <div>
          <label className={labelCls}>Enddatum (optional)</label>
          <input
            className={inputCls}
            type="date"
            value={endDatum}
            onChange={e => setEndDatum(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-[#4f3220] text-sm font-medium">
          Abbrechen
        </button>
        <button type="submit"
          className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium">
          Speichern
        </button>
      </div>
    </form>
  )
}
