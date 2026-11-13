import { useCallback, useEffect, useRef, useState } from 'react'
import type { Konto, Position, Sparplan, Sparziel, Vertrag, WertSnapshot, Kauf, AktieETFPosition } from '../types'
import {
  getAllKonten, putKonto, deleteKonto,
  getAllPositionen, putPosition, deletePosition,
  getAllSparplaene, putSparplan, deleteSparplan,
  getAllSparziele, putSparziel, deleteSparziel,
  getAllVertraege, putVertrag, deleteVertrag,
  getAllSnapshots, putSnapshot, getSnapshotForDate,
  getAllKaeufe, putKauf, deleteKauf,
} from '../db'
import { gesamtwertNachAnlageklasse, positionCurrentValue } from '../utils/calc'
import { toISODate, today } from '../utils/format'
import { fetchFxWithCache, fetchQuoteWithCache } from '../providers/quotes'

export interface AppData {
  ready: boolean
  konten: Konto[]
  positionen: Position[]
  sparplaene: Sparplan[]
  sparziele: Sparziel[]
  vertraege: Vertrag[]
  snapshots: WertSnapshot[]
  kaeufe: Kauf[]
  fxRates: Record<string, number>

  saveKonto(k: Konto): Promise<void>
  removeKonto(id: string): Promise<void>
  savePosition(p: Position): Promise<void>
  removePosition(id: string): Promise<void>
  saveSparplan(s: Sparplan): Promise<void>
  removeSparplan(id: string): Promise<void>
  saveSparziel(z: Sparziel): Promise<void>
  removeSparziel(id: string): Promise<void>
  saveVertrag(v: Vertrag): Promise<void>
  removeVertrag(id: string): Promise<void>
  saveKauf(k: Kauf): Promise<void>
  removeKauf(id: string): Promise<void>
  refreshQuotes(): Promise<void>
}

export function useAppData(): AppData {
  const [ready, setReady] = useState(false)
  const [konten, setKonten] = useState<Konto[]>([])
  const [positionen, setPositionen] = useState<Position[]>([])
  const [sparplaene, setSparplaene] = useState<Sparplan[]>([])
  const [sparziele, setSparziele] = useState<Sparziel[]>([])
  const [vertraege, setVertraege] = useState<Vertrag[]>([])
  const [snapshots, setSnapshots] = useState<WertSnapshot[]>([])
  const [kaeufe, setKaeufe] = useState<Kauf[]>([])
  const [fxRates, setFxRates] = useState<Record<string, number>>({})
  const loadedRef = useRef(false)

  const load = useCallback(async () => {
    const [k, p, sp, sz, v, sn, ka] = await Promise.all([
      getAllKonten(), getAllPositionen(), getAllSparplaene(),
      getAllSparziele(), getAllVertraege(), getAllSnapshots(), getAllKaeufe(),
    ])
    setKonten(k)
    setPositionen(p)
    setSparplaene(sp)
    setSparziele(sz)
    setVertraege(v)
    setSnapshots(sn.sort((a, b) => a.datum.localeCompare(b.datum)))
    setKaeufe(ka)
    setReady(true)
    return p
  }, [])

  const refreshQuotes = useCallback(async () => {
    const allPos = await getAllPositionen()
    const wertpapiere = allPos.filter((p): p is AktieETFPosition =>
      p.anlageklasse === 'Aktie' || p.anlageklasse === 'ETF'
    )

    // Fetch FX rates for all non-EUR currencies
    const currencies = [...new Set(wertpapiere.map(p => p.waehrung).filter(c => c !== 'EUR'))]
    const rates: Record<string, number> = {}
    await Promise.allSettled(currencies.map(async c => {
      rates[c] = await fetchFxWithCache(c, 'EUR')
    }))
    setFxRates(rates)

    // Fetch quotes for positions with a ticker
    const updated: Position[] = [...allPos]
    await Promise.allSettled(
      wertpapiere.filter(p => p.ticker).map(async p => {
        try {
          const quote = await fetchQuoteWithCache(p.ticker!)
          const idx = updated.findIndex(u => u.id === p.id)
          if (idx !== -1) {
            const up: AktieETFPosition = { ...p, aktuellerKurs: quote.price, kursZeitstempel: new Date(quote.timestamp).toISOString() }
            updated[idx] = up
            await putPosition(up)
          }
        } catch {
          // Keep last known price on error
        }
      })
    )
    setPositionen(updated)
  }, [])

  const maybeSnapshot = useCallback(async (pos: Position[]) => {
    const todayStr = toISODate(today())
    const existing = await getSnapshotForDate(todayStr)
    if (existing) return
    const snapshot: WertSnapshot = {
      id: crypto.randomUUID(),
      datum: todayStr,
      gesamtwert: pos.reduce((sum, p) => sum + positionCurrentValue(p, fxRates), 0),
      wertNachAnlageklasse: gesamtwertNachAnlageklasse(pos, fxRates),
    }
    await putSnapshot(snapshot)
    setSnapshots(prev => [...prev, snapshot].sort((a, b) => a.datum.localeCompare(b.datum)))
  }, [fxRates])

  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true

    void navigator.storage?.persist()

    load().then(pos => {
      void refreshQuotes()
      void maybeSnapshot(pos)
    })
  }, [load, refreshQuotes, maybeSnapshot])

  const saveKonto = useCallback(async (k: Konto) => {
    await putKonto(k)
    setKonten(prev => { const next = prev.filter(x => x.id !== k.id); return [...next, k] })
  }, [])
  const removeKonto = useCallback(async (id: string) => {
    await deleteKonto(id)
    setKonten(prev => prev.filter(x => x.id !== id))
  }, [])

  const savePosition = useCallback(async (p: Position) => {
    await putPosition(p)
    setPositionen(prev => { const next = prev.filter(x => x.id !== p.id); return [...next, p] })
  }, [])
  const removePosition = useCallback(async (id: string) => {
    await deletePosition(id)
    setPositionen(prev => prev.filter(x => x.id !== id))
    setSparplaene(prev => prev.filter(x => x.positionId !== id))
    setKaeufe(prev => prev.filter(x => x.positionId !== id))
  }, [])

  const saveSparplan = useCallback(async (s: Sparplan) => {
    await putSparplan(s)
    setSparplaene(prev => { const next = prev.filter(x => x.id !== s.id); return [...next, s] })
  }, [])
  const removeSparplan = useCallback(async (id: string) => {
    await deleteSparplan(id)
    setSparplaene(prev => prev.filter(x => x.id !== id))
  }, [])

  const saveSparziel = useCallback(async (z: Sparziel) => {
    await putSparziel(z)
    setSparziele(prev => { const next = prev.filter(x => x.id !== z.id); return [...next, z] })
  }, [])
  const removeSparziel = useCallback(async (id: string) => {
    await deleteSparziel(id)
    setSparziele(prev => prev.filter(x => x.id !== id))
  }, [])

  const saveVertrag = useCallback(async (v: Vertrag) => {
    await putVertrag(v)
    setVertraege(prev => { const next = prev.filter(x => x.id !== v.id); return [...next, v] })
  }, [])
  const removeVertrag = useCallback(async (id: string) => {
    await deleteVertrag(id)
    setVertraege(prev => prev.filter(x => x.id !== id))
  }, [])

  const saveKauf = useCallback(async (k: Kauf) => {
    await putKauf(k)
    setKaeufe(prev => { const next = prev.filter(x => x.id !== k.id); return [...next, k] })
    // Update position's average cost and quantity
    const pos = positionen.find(p => p.id === k.positionId)
    if (pos?.anlageklasse === 'Aktie' || pos?.anlageklasse === 'ETF') {
      const p = pos as import('../types').AktieETFPosition
      const allKaeufe = await getAllKaeufe()
      const posKaeufe = allKaeufe.filter(kauf => kauf.positionId === p.id)
      if (posKaeufe.length > 0) {
        const totalStk = posKaeufe.reduce((sum, kauf) => sum + (kauf.stueckzahl ?? 0), 0)
        const totalCost = posKaeufe.reduce((sum, kauf) => sum + (kauf.stueckzahl ?? 0) * kauf.kurs, 0)
        const updated: typeof p = {
          ...p,
          stueckzahl: totalStk,
          einstandskurs: totalStk > 0 ? totalCost / totalStk : p.einstandskurs,
        }
        await putPosition(updated)
        setPositionen(prev => prev.map(x => x.id === updated.id ? updated : x))
      }
    }
  }, [positionen])

  const removeKauf = useCallback(async (id: string) => {
    await deleteKauf(id)
    setKaeufe(prev => prev.filter(x => x.id !== id))
  }, [])

  return {
    ready, konten, positionen, sparplaene, sparziele, vertraege, snapshots, kaeufe, fxRates,
    saveKonto, removeKonto, savePosition, removePosition,
    saveSparplan, removeSparplan, saveSparziel, removeSparziel,
    saveVertrag, removeVertrag, saveKauf, removeKauf, refreshQuotes,
  }
}
