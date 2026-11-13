import { openDB } from 'idb'
import type { DBSchema, IDBPDatabase } from 'idb'
import type { Konto, Position, Sparplan, Sparziel, Vertrag, WertSnapshot, Kauf } from '../types'
import { encryptBackup, decryptBackup } from '../utils/crypto'

interface PortfolioDB extends DBSchema {
  konten: { key: string; value: Konto }
  positionen: { key: string; value: Position }
  sparplaene: { key: string; value: Sparplan; indexes: { 'by-position': string } }
  sparziele: { key: string; value: Sparziel }
  vertraege: { key: string; value: Vertrag }
  snapshots: { key: string; value: WertSnapshot; indexes: { 'by-datum': string } }
  kaeufe: { key: string; value: Kauf; indexes: { 'by-position': string } }
}

let dbInstance: IDBPDatabase<PortfolioDB> | null = null

export async function getDB(): Promise<IDBPDatabase<PortfolioDB>> {
  if (dbInstance) return dbInstance
  dbInstance = await openDB<PortfolioDB>('portfolio', 1, {
    upgrade(db) {
      db.createObjectStore('konten', { keyPath: 'id' })
      db.createObjectStore('positionen', { keyPath: 'id' })
      const sparplaeneStore = db.createObjectStore('sparplaene', { keyPath: 'id' })
      sparplaeneStore.createIndex('by-position', 'positionId')
      db.createObjectStore('sparziele', { keyPath: 'id' })
      db.createObjectStore('vertraege', { keyPath: 'id' })
      const snapshotStore = db.createObjectStore('snapshots', { keyPath: 'id' })
      snapshotStore.createIndex('by-datum', 'datum')
      const kaufStore = db.createObjectStore('kaeufe', { keyPath: 'id' })
      kaufStore.createIndex('by-position', 'positionId')
    },
  })
  return dbInstance
}

// ─── Konten ───────────────────────────────────────────────────────────────────

export async function getAllKonten(): Promise<Konto[]> {
  return (await getDB()).getAll('konten')
}
export async function putKonto(k: Konto): Promise<void> {
  await (await getDB()).put('konten', k)
}
export async function deleteKonto(id: string): Promise<void> {
  await (await getDB()).delete('konten', id)
}

// ─── Positionen ───────────────────────────────────────────────────────────────

export async function getAllPositionen(): Promise<Position[]> {
  return (await getDB()).getAll('positionen')
}
export async function putPosition(p: Position): Promise<void> {
  await (await getDB()).put('positionen', p)
}
export async function deletePosition(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('positionen', id)
  // Also delete related sparplans and purchases
  const sparplaene = await db.getAllFromIndex('sparplaene', 'by-position', id)
  await Promise.all(sparplaene.map(s => db.delete('sparplaene', s.id)))
  const kaeufe = await db.getAllFromIndex('kaeufe', 'by-position', id)
  await Promise.all(kaeufe.map(k => db.delete('kaeufe', k.id)))
}

// ─── Sparplaene ───────────────────────────────────────────────────────────────

export async function getAllSparplaene(): Promise<Sparplan[]> {
  return (await getDB()).getAll('sparplaene')
}
export async function getSparplaeneForPosition(positionId: string): Promise<Sparplan[]> {
  return (await getDB()).getAllFromIndex('sparplaene', 'by-position', positionId)
}
export async function putSparplan(s: Sparplan): Promise<void> {
  await (await getDB()).put('sparplaene', s)
}
export async function deleteSparplan(id: string): Promise<void> {
  await (await getDB()).delete('sparplaene', id)
}

// ─── Sparziele ────────────────────────────────────────────────────────────────

export async function getAllSparziele(): Promise<Sparziel[]> {
  return (await getDB()).getAll('sparziele')
}
export async function putSparziel(z: Sparziel): Promise<void> {
  await (await getDB()).put('sparziele', z)
}
export async function deleteSparziel(id: string): Promise<void> {
  await (await getDB()).delete('sparziele', id)
}

// ─── Vertraege ────────────────────────────────────────────────────────────────

export async function getAllVertraege(): Promise<Vertrag[]> {
  return (await getDB()).getAll('vertraege')
}
export async function putVertrag(v: Vertrag): Promise<void> {
  await (await getDB()).put('vertraege', v)
}
export async function deleteVertrag(id: string): Promise<void> {
  await (await getDB()).delete('vertraege', id)
}

// ─── Snapshots ────────────────────────────────────────────────────────────────

export async function getAllSnapshots(): Promise<WertSnapshot[]> {
  return (await getDB()).getAll('snapshots')
}
export async function putSnapshot(s: WertSnapshot): Promise<void> {
  await (await getDB()).put('snapshots', s)
}
export async function getSnapshotForDate(datum: string): Promise<WertSnapshot | undefined> {
  return (await getDB()).getFromIndex('snapshots', 'by-datum', datum)
}

// ─── Käufe ────────────────────────────────────────────────────────────────────

export async function getAllKaeufe(): Promise<Kauf[]> {
  return (await getDB()).getAll('kaeufe')
}
export async function getKaeufeForPosition(positionId: string): Promise<Kauf[]> {
  return (await getDB()).getAllFromIndex('kaeufe', 'by-position', positionId)
}
export async function putKauf(k: Kauf): Promise<void> {
  await (await getDB()).put('kaeufe', k)
}
export async function deleteKauf(id: string): Promise<void> {
  await (await getDB()).delete('kaeufe', id)
}

// ─── Backup ───────────────────────────────────────────────────────────────────

export interface BackupPayload {
  version: 2
  exportedAt: string
  apiKey: string | null
  konten: Konto[]
  positionen: Position[]
  sparplaene: Sparplan[]
  sparziele: Sparziel[]
  vertraege: Vertrag[]
  snapshots: WertSnapshot[]
  kaeufe: Kauf[]
}

export async function exportAllData(): Promise<BackupPayload> {
  const db = await getDB()
  const [konten, positionen, sparplaene, sparziele, vertraege, snapshots, kaeufe] = await Promise.all([
    db.getAll('konten'),
    db.getAll('positionen'),
    db.getAll('sparplaene'),
    db.getAll('sparziele'),
    db.getAll('vertraege'),
    db.getAll('snapshots'),
    db.getAll('kaeufe'),
  ])
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    apiKey: localStorage.getItem('portfolioApiKey'),
    konten, positionen, sparplaene, sparziele, vertraege, snapshots, kaeufe,
  }
}

export async function importAllData(payload: BackupPayload): Promise<void> {
  const db = await getDB()
  const stores = ['konten', 'positionen', 'sparplaene', 'sparziele', 'vertraege', 'snapshots', 'kaeufe'] as const
  const clearTx = db.transaction(stores, 'readwrite')
  await Promise.all(stores.map(s => clearTx.objectStore(s).clear()))
  await clearTx.done

  const writeTx = db.transaction(stores, 'readwrite')
  await Promise.all([
    ...(payload.konten ?? []).map(r => writeTx.objectStore('konten').put(r)),
    ...(payload.positionen ?? []).map(r => writeTx.objectStore('positionen').put(r)),
    ...(payload.sparplaene ?? []).map(r => writeTx.objectStore('sparplaene').put(r)),
    ...(payload.sparziele ?? []).map(r => writeTx.objectStore('sparziele').put(r)),
    ...(payload.vertraege ?? []).map(r => writeTx.objectStore('vertraege').put(r)),
    ...(payload.snapshots ?? []).map(r => writeTx.objectStore('snapshots').put(r)),
    ...(payload.kaeufe ?? []).map(r => writeTx.objectStore('kaeufe').put(r)),
  ])
  await writeTx.done

  if (payload.apiKey) localStorage.setItem('portfolioApiKey', payload.apiKey)
}

export async function exportEncrypted(password: string): Promise<string> {
  const payload = await exportAllData()
  const json = JSON.stringify(payload)
  const encrypted = await encryptBackup(json, password)
  localStorage.setItem('lastBackup', new Date().toISOString())
  return encrypted
}

export async function importEncrypted(ciphertext: string, password: string): Promise<BackupPayload> {
  const json = await decryptBackup(ciphertext, password)
  const payload = JSON.parse(json) as BackupPayload
  if (payload.version !== 2 && (payload as { version: number }).version !== 1) {
    throw new Error('Unbekanntes Backup-Format')
  }
  return payload
}
