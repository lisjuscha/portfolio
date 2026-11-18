import { useState } from 'react'
import type { Vertrag, VertragKategorie, Zahlungsintervall, KuendigungsfristEinheit, VertragStatus } from '../types'

const KATEGORIEN: VertragKategorie[] = ['Versicherung', 'Internet/Mobilfunk', 'Abo', 'Fitness', 'Strom/Energie', 'Miete/Wohnen', 'Sonstiges']
const INTERVALLE: Zahlungsintervall[] = ['monatlich', 'vierteljährlich', 'halbjährlich', 'jährlich']
const FRIST_EINHEITEN: KuendigungsfristEinheit[] = ['Tage', 'Wochen', 'Monate']

interface Props {
  initial?: Vertrag
  onSave: (v: Vertrag) => void
  onCancel: () => void
}

export function VertragForm({ initial, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [anbieter, setAnbieter] = useState(initial?.anbieter ?? '')
  const [kategorie, setKategorie] = useState<VertragKategorie>(initial?.kategorie ?? 'Sonstiges')
  const [betrag, setBetrag] = useState(String(initial?.betrag ?? ''))
  const [zahlungsintervall, setZahlungsintervall] = useState<Zahlungsintervall>(initial?.zahlungsintervall ?? 'monatlich')
  const [naechsteAbbuchung, setNaechsteAbbuchung] = useState(initial?.naechsteAbbuchung ?? '')
  const [vertragsbeginn, setVertragsbeginn] = useState(initial?.vertragsbeginn ?? '')
  const [vertragsende, setVertragsende] = useState(initial?.vertragsende ?? '')
  const [kuendigungsfrist, setKuendigungsfrist] = useState(String(initial?.kuendigungsfrist ?? '1'))
  const [kuendigungsfristEinheit, setKuendigungsfristEinheit] = useState<KuendigungsfristEinheit>(initial?.kuendigungsfristEinheit ?? 'Monate')
  const [autoVerlaengerung, setAutoVerlaengerung] = useState(initial?.automatischeVerlaengerung ?? true)
  const [verlaengerungsdauer, setVerlaengerungsdauer] = useState(String(initial?.verlaengerungsdauer ?? '12'))
  const [status, setStatus] = useState<VertragStatus>(initial?.status ?? 'aktiv')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      name: name.trim(),
      anbieter: anbieter.trim(),
      kategorie,
      betrag: Number(betrag),
      zahlungsintervall,
      naechsteAbbuchung,
      vertragsbeginn,
      vertragsende: vertragsende || undefined,
      kuendigungsfrist: Number(kuendigungsfrist),
      kuendigungsfristEinheit,
      automatischeVerlaengerung: autoVerlaengerung,
      verlaengerungsdauer: autoVerlaengerung ? Number(verlaengerungsdauer) : undefined,
      status,
    })
  }

  const inputCls = "w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-[#38383a] bg-white dark:bg-[#2c2c2e] text-sm"
  const labelCls = "block text-sm font-medium mb-1"

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Bezeichnung</label>
          <input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="z. B. Netflix" required autoFocus />
        </div>
        <div>
          <label className={labelCls}>Anbieter</label>
          <input className={inputCls} value={anbieter} onChange={e => setAnbieter(e.target.value)} placeholder="Netflix Inc." />
        </div>
      </div>

      <div>
        <label className={labelCls}>Kategorie</label>
        <div className="flex flex-wrap gap-2">
          {KATEGORIEN.map(k => (
            <button key={k} type="button" onClick={() => setKategorie(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${kategorie === k ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 dark:border-[#38383a] text-gray-600 dark:text-gray-400'}`}>
              {k}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Betrag €</label>
          <input className={inputCls} type="number" min="0.01" step="0.01" value={betrag} onChange={e => setBetrag(e.target.value)} required />
        </div>
        <div>
          <label className={labelCls}>Zahlungsintervall</label>
          <select className={inputCls} value={zahlungsintervall} onChange={e => setZahlungsintervall(e.target.value as Zahlungsintervall)}>
            {INTERVALLE.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Nächste Abbuchung</label>
          <input className={inputCls} type="date" value={naechsteAbbuchung} onChange={e => setNaechsteAbbuchung(e.target.value)} required />
        </div>
        <div>
          <label className={labelCls}>Vertragsbeginn</label>
          <input className={inputCls} type="date" value={vertragsbeginn} onChange={e => setVertragsbeginn(e.target.value)} required />
        </div>
      </div>

      <div>
        <label className={labelCls}>Vertragsende (leer = unbefristet)</label>
        <input className={inputCls} type="date" value={vertragsende} onChange={e => setVertragsende(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Kündigungsfrist</label>
          <input className={inputCls} type="number" min="0" value={kuendigungsfrist} onChange={e => setKuendigungsfrist(e.target.value)} required />
        </div>
        <div>
          <label className={labelCls}>Einheit</label>
          <select className={inputCls} value={kuendigungsfristEinheit} onChange={e => setKuendigungsfristEinheit(e.target.value as KuendigungsfristEinheit)}>
            {FRIST_EINHEITEN.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between py-1">
        <span className="text-sm font-medium">Automatische Verlängerung</span>
        <button type="button" onClick={() => setAutoVerlaengerung(v => !v)}
          className={`w-12 h-6 rounded-full transition-colors ${autoVerlaengerung ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
          <div className={`w-5 h-5 rounded-full bg-white m-0.5 transition-transform ${autoVerlaengerung ? 'translate-x-6' : ''}`} />
        </button>
      </div>

      {autoVerlaengerung && (
        <div>
          <label className={labelCls}>Verlängerungsdauer (Monate)</label>
          <input className={inputCls} type="number" min="1" value={verlaengerungsdauer} onChange={e => setVerlaengerungsdauer(e.target.value)} required />
        </div>
      )}

      <div className="flex items-center justify-between py-1">
        <span className="text-sm font-medium">Status</span>
        <div className="flex gap-2">
          {(['aktiv', 'gekündigt'] as VertragStatus[]).map(s => (
            <button key={s} type="button" onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${status === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 dark:border-[#38383a] text-gray-600 dark:text-gray-400'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-[#38383a] text-sm font-medium">Abbrechen</button>
        <button type="submit" className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-medium">Speichern</button>
      </div>
    </form>
  )
}
