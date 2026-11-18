import { useState } from 'react'
import type { Sparziel, Position, Konto } from '../types'

interface Props {
  initial?: Sparziel
  positionen: Position[]
  konten: Konto[]
  onSave: (z: Sparziel) => void
  onCancel: () => void
}

export function SparzielForm({ initial, positionen, konten, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [zielbetrag, setZielbetrag] = useState(String(initial?.zielbetrag ?? ''))
  const [zieldatum, setZieldatum] = useState(initial?.zieldatum ?? '')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initial?.verknuepfteIds ?? []))

  function toggle(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      name: name.trim(),
      zielbetrag: Number(zielbetrag),
      zieldatum: zieldatum || undefined,
      verknuepfteIds: [...selectedIds],
    })
  }

  const inputCls = "w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-[#38383a] bg-white dark:bg-[#2c2c2e] text-sm"
  const labelCls = "block text-sm font-medium mb-1"

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className={labelCls}>Name</label>
        <input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="z. B. Notgroschen" required autoFocus />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Zielbetrag €</label>
          <input className={inputCls} type="number" min="1" step="0.01" value={zielbetrag} onChange={e => setZielbetrag(e.target.value)} required />
        </div>
        <div>
          <label className={labelCls}>Zieldatum (optional)</label>
          <input className={inputCls} type="date" value={zieldatum} onChange={e => setZieldatum(e.target.value)} />
        </div>
      </div>
      {(konten.length > 0 || positionen.length > 0) && (
        <div>
          <label className={labelCls}>Verknüpfte Konten / Positionen</label>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {konten.map(k => (
              <label key={k.id} className="flex items-center gap-2 cursor-pointer py-1">
                <input type="checkbox" checked={selectedIds.has(k.id)} onChange={() => toggle(k.id)} className="accent-blue-600" />
                <span className="text-sm">{k.name} <span className="text-xs text-gray-400">({k.typ})</span></span>
              </label>
            ))}
            {positionen.map(p => (
              <label key={p.id} className="flex items-center gap-2 cursor-pointer py-1">
                <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggle(p.id)} className="accent-blue-600" />
                <span className="text-sm">{p.name} <span className="text-xs text-gray-400">({p.anlageklasse})</span></span>
              </label>
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-[#38383a] text-sm font-medium">Abbrechen</button>
        <button type="submit" className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-medium">Speichern</button>
      </div>
    </form>
  )
}
