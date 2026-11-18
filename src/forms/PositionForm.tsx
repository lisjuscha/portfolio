import { useState } from 'react'
import type {
  Position, Konto, Anlageklasse,
  AktieETFPosition, ZinsPosition, VLPosition, SonstigesPosition,
  ZinsgutschriftArt,
} from '../types'

const ANLAGEKLASSEN: Anlageklasse[] = ['Aktie', 'ETF', 'VL', 'Zinssparen', 'Sparbrief', 'Festgeld', 'Sonstiges']
const ZINSGUTSCHRIFT: ZinsgutschriftArt[] = ['laufend', 'jährlich', 'Ende']
const WAEHRUNGEN = ['EUR', 'USD', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD']

interface Props {
  initial?: Position
  konten: Konto[]
  onSave: (p: Position) => void
  onCancel: () => void
}

export function PositionForm({ initial, konten, onSave, onCancel }: Props) {
  const [anlageklasse, setAnlageklasse] = useState<Anlageklasse>(initial?.anlageklasse ?? 'ETF')
  const [kontoId, setKontoId] = useState(initial?.kontoId ?? konten[0]?.id ?? '')
  const [name, setName] = useState(initial?.name ?? '')
  const [notiz, setNotiz] = useState(initial?.notiz ?? '')

  // Aktie/ETF
  const ini = initial?.anlageklasse === 'Aktie' || initial?.anlageklasse === 'ETF' ? initial as AktieETFPosition : null
  const [isin, setIsin] = useState(ini?.isin ?? '')
  const [ticker, setTicker] = useState(ini?.ticker ?? '')
  const [stueckzahl, setStueckzahl] = useState(String(ini?.stueckzahl ?? ''))
  const [einstandskurs, setEinstandskurs] = useState(String(ini?.einstandskurs ?? ''))
  const [waehrung, setWaehrung] = useState(ini?.waehrung ?? 'EUR')

  // Zins
  const iniz = (initial?.anlageklasse === 'Zinssparen' || initial?.anlageklasse === 'Sparbrief' || initial?.anlageklasse === 'Festgeld') ? initial as ZinsPosition : null
  const [anlagebetrag, setAnlagebetrag] = useState(String(iniz?.anlagebetrag ?? ''))
  const [zinssatz, setZinssatz] = useState(String(iniz?.zinssatz ?? ''))
  const [startDatum, setStartDatum] = useState(iniz?.startDatum ?? '')
  const [laufzeitEnde, setLaufzeitEnde] = useState(iniz?.laufzeitEnde ?? '')
  const [zinsgutschrift, setZinsgutschrift] = useState<ZinsgutschriftArt>(iniz?.zinsgutschrift ?? 'jährlich')

  // VL
  const inivl = initial?.anlageklasse === 'VL' ? initial as VLPosition : null
  const [anbieter, setAnbieter] = useState(inivl?.anbieter ?? '')
  const [monatsBetrag, setMonatsBetrag] = useState(String(inivl?.monatsBetrag ?? ''))
  const [laufzeit, setLaufzeit] = useState(String(inivl?.laufzeit ?? ''))
  const [sperrfristEnde, setSperrfristEnde] = useState(inivl?.sperrfristEnde ?? '')
  const [vlStand, setVlStand] = useState(String(inivl?.aktuellerStand ?? ''))

  // Sonstiges
  const inis = initial?.anlageklasse === 'Sonstiges' ? initial as SonstigesPosition : null
  const [sonstigesWert, setSonstigesWert] = useState(String(inis?.aktuellWert ?? ''))

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const base = { id: initial?.id ?? crypto.randomUUID(), kontoId, name: name.trim(), notiz: notiz.trim() || undefined }

    let pos: Position
    if (anlageklasse === 'Aktie' || anlageklasse === 'ETF') {
      pos = { ...base, anlageklasse, isin: isin || undefined, ticker: ticker || undefined, stueckzahl: Number(stueckzahl), einstandskurs: Number(einstandskurs), waehrung, aktuellerKurs: ini?.aktuellerKurs, kursZeitstempel: ini?.kursZeitstempel }
    } else if (anlageklasse === 'Zinssparen' || anlageklasse === 'Sparbrief' || anlageklasse === 'Festgeld') {
      pos = { ...base, anlageklasse, anlagebetrag: Number(anlagebetrag), zinssatz: Number(zinssatz), startDatum, laufzeitEnde, zinsgutschrift }
    } else if (anlageklasse === 'VL') {
      pos = { ...base, anlageklasse, anbieter, monatsBetrag: Number(monatsBetrag), laufzeit: Number(laufzeit), sperrfristEnde, aktuellerStand: Number(vlStand) }
    } else {
      pos = { ...base, anlageklasse: 'Sonstiges', aktuellWert: Number(sonstigesWert) }
    }
    onSave(pos)
  }

  const inputCls = "w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-[#38383a] bg-white dark:bg-[#2c2c2e] text-sm"
  const labelCls = "block text-sm font-medium mb-1"

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* Anlageklasse */}
      <div>
        <label className={labelCls}>Anlageklasse</label>
        <div className="flex flex-wrap gap-2">
          {ANLAGEKLASSEN.map(k => (
            <button key={k} type="button" onClick={() => setAnlageklasse(k)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${anlageklasse === k ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 dark:border-[#38383a] text-gray-600 dark:text-gray-400'}`}>
              {k}
            </button>
          ))}
        </div>
      </div>

      {/* Konto */}
      {konten.length > 0 && (
        <div>
          <label className={labelCls}>Konto / Depot</label>
          <select className={inputCls} value={kontoId} onChange={e => setKontoId(e.target.value)}>
            {konten.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
          </select>
        </div>
      )}

      {/* Name */}
      <div>
        <label className={labelCls}>Bezeichnung</label>
        <input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="z. B. iShares MSCI World" required autoFocus />
      </div>

      {/* Aktie / ETF */}
      {(anlageklasse === 'Aktie' || anlageklasse === 'ETF') && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>ISIN (optional)</label>
              <input className={inputCls} value={isin} onChange={e => setIsin(e.target.value)} placeholder="IE00B4L5Y983" />
            </div>
            <div>
              <label className={labelCls}>Ticker (optional)</label>
              <input className={inputCls} value={ticker} onChange={e => setTicker(e.target.value)} placeholder="ETR:EXS1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Stückzahl</label>
              <input className={inputCls} type="number" min="0" step="0.0001" value={stueckzahl} onChange={e => setStueckzahl(e.target.value)} required />
            </div>
            <div>
              <label className={labelCls}>Ø Einstand</label>
              <input className={inputCls} type="number" min="0" step="0.01" value={einstandskurs} onChange={e => setEinstandskurs(e.target.value)} required />
            </div>
          </div>
          <div>
            <label className={labelCls}>Währung</label>
            <select className={inputCls} value={waehrung} onChange={e => setWaehrung(e.target.value)}>
              {WAEHRUNGEN.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
        </>
      )}

      {/* Zinssparen / Sparbrief / Festgeld */}
      {(anlageklasse === 'Zinssparen' || anlageklasse === 'Sparbrief' || anlageklasse === 'Festgeld') && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Anlagebetrag €</label>
              <input className={inputCls} type="number" min="0" step="0.01" value={anlagebetrag} onChange={e => setAnlagebetrag(e.target.value)} required />
            </div>
            <div>
              <label className={labelCls}>Zinssatz % p. a.</label>
              <input className={inputCls} type="number" min="0" step="0.01" value={zinssatz} onChange={e => setZinssatz(e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Startdatum</label>
              <input className={inputCls} type="date" value={startDatum} onChange={e => setStartDatum(e.target.value)} required />
            </div>
            <div>
              <label className={labelCls}>Laufzeitende</label>
              <input className={inputCls} type="date" value={laufzeitEnde} onChange={e => setLaufzeitEnde(e.target.value)} required />
            </div>
          </div>
          <div>
            <label className={labelCls}>Zinsgutschrift</label>
            <div className="flex gap-2">
              {ZINSGUTSCHRIFT.map(z => (
                <button key={z} type="button" onClick={() => setZinsgutschrift(z)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${zinsgutschrift === z ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 dark:border-[#38383a] text-gray-600 dark:text-gray-400'}`}>
                  {z}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* VL */}
      {anlageklasse === 'VL' && (
        <>
          <div>
            <label className={labelCls}>Anbieter / Fonds</label>
            <input className={inputCls} value={anbieter} onChange={e => setAnbieter(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Monatsbetrag €</label>
              <input className={inputCls} type="number" min="0" step="0.01" value={monatsBetrag} onChange={e => setMonatsBetrag(e.target.value)} required />
            </div>
            <div>
              <label className={labelCls}>Laufzeit (Monate)</label>
              <input className={inputCls} type="number" min="1" value={laufzeit} onChange={e => setLaufzeit(e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Sperrfristende</label>
              <input className={inputCls} type="date" value={sperrfristEnde} onChange={e => setSperrfristEnde(e.target.value)} required />
            </div>
            <div>
              <label className={labelCls}>Aktueller Stand €</label>
              <input className={inputCls} type="number" min="0" step="0.01" value={vlStand} onChange={e => setVlStand(e.target.value)} required />
            </div>
          </div>
        </>
      )}

      {/* Sonstiges */}
      {anlageklasse === 'Sonstiges' && (
        <div>
          <label className={labelCls}>Aktueller Wert €</label>
          <input className={inputCls} type="number" min="0" step="0.01" value={sonstigesWert} onChange={e => setSonstigesWert(e.target.value)} required />
        </div>
      )}

      {/* Notiz */}
      <div>
        <label className={labelCls}>Notiz (optional)</label>
        <input className={inputCls} value={notiz} onChange={e => setNotiz(e.target.value)} placeholder="Freitext" />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-[#38383a] text-sm font-medium">Abbrechen</button>
        <button type="submit" className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-medium">Speichern</button>
      </div>
    </form>
  )
}
