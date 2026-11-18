import { useState } from 'react'
import type { Konto, KontoTyp } from '../types'

const TYPEN: KontoTyp[] = ['Depot', 'Tagesgeld', 'Festgeld', 'Bausparen', 'Sonstiges']

interface Props {
  initial?: Konto
  onSave: (k: Konto) => void
  onCancel: () => void
}

export function KontoForm({ initial, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [typ, setTyp] = useState<KontoTyp>(initial?.typ ?? 'Depot')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    onSave({ id: initial?.id ?? crypto.randomUUID(), name: name.trim(), typ })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Name</label>
        <input
          className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-[#38383a] bg-white dark:bg-[#2c2c2e] text-sm"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="z. B. Comdirect Depot"
          required
          autoFocus
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Typ</label>
        <div className="flex flex-wrap gap-2">
          {TYPEN.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTyp(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                typ === t
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-200 dark:border-[#38383a] text-gray-600 dark:text-gray-400'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-[#38383a] text-sm font-medium">
          Abbrechen
        </button>
        <button type="submit" className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-medium">
          Speichern
        </button>
      </div>
    </form>
  )
}
