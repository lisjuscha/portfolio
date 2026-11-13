import { useRef, useState } from 'react'
import { Download, Upload, Key, Building2, AlertTriangle, Pencil, Trash2, Plus } from 'lucide-react'
import type { AppData } from '../hooks/useAppData'
import { exportEncrypted, importEncrypted, importAllData } from '../db'
import { KontoForm } from '../forms/KontoForm'
import { Sheet } from '../components/Sheet'
import type { Konto } from '../types'

interface Props extends AppData {
  hidden: boolean
  onToggleHidden: () => void
}

export function EinstellungenPage({ hidden, onToggleHidden, konten, saveKonto, removeKonto }: Props) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('portfolioApiKey') ?? '')
  const [apiKeySaved, setApiKeySaved] = useState(false)
  const [backupStatus, setBackupStatus] = useState<string | null>(null)
  const [exportPass, setExportPass] = useState('')
  const [importPass, setImportPass] = useState('')
  const [importPreview, setImportPreview] = useState<string | null>(null)
  const [pendingImport, setPendingImport] = useState<string | null>(null)
  const [kontoFormOpen, setKontoFormOpen] = useState(false)
  const [editKonto, setEditKonto] = useState<Konto | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const lastBackup = localStorage.getItem('lastBackup')

  const inputCls = "w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-[#38383a] bg-white dark:bg-[#2c2c2e] text-sm"

  function saveApiKey() {
    if (apiKey.trim()) {
      localStorage.setItem('portfolioApiKey', apiKey.trim())
    } else {
      localStorage.removeItem('portfolioApiKey')
    }
    setApiKeySaved(true)
    setTimeout(() => setApiKeySaved(false), 2000)
  }

  async function handleExport(e: React.FormEvent) {
    e.preventDefault()
    if (!exportPass) return
    try {
      setBackupStatus('Verschlüssele…')
      const encrypted = await exportEncrypted(exportPass)
      const blob = new Blob([encrypted], { type: 'application/json' })
      const filename = `portfolio-backup-${new Date().toISOString().slice(0, 10)}.json.enc`
      if (navigator.share) {
        try {
          await navigator.share({ files: [new File([blob], filename, { type: 'application/json' })] })
          setBackupStatus('Backup gespeichert')
          setExportPass('')
          return
        } catch { /* Fallback */ }
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      setBackupStatus('Backup gespeichert')
      setExportPass('')
    } catch (err) {
      setBackupStatus(`Fehler: ${String(err)}`)
    }
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    setPendingImport(text)
    e.target.value = ''
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault()
    if (!pendingImport || !importPass) return
    try {
      setBackupStatus('Entschlüssele…')
      const payload = await importEncrypted(pendingImport, importPass)
      setImportPreview(
        `${payload.konten?.length ?? 0} Konten, ${payload.positionen?.length ?? 0} Positionen, ${payload.vertraege?.length ?? 0} Verträge`
      )
    } catch (err) {
      setBackupStatus(`Fehler: ${String(err)}`)
    }
  }

  async function confirmImport() {
    if (!pendingImport || !importPass) return
    try {
      const payload = await importEncrypted(pendingImport, importPass)
      await importAllData(payload)
      setBackupStatus('Importiert — App wird neu geladen…')
      setTimeout(() => window.location.reload(), 1200)
    } catch (err) {
      setBackupStatus(`Fehler: ${String(err)}`)
    }
  }

  return (
    <div className="px-4 py-4 pb-8 space-y-5">
      <h1 className="text-xl font-bold">Einstellungen</h1>

      {/* Hide amounts */}
      <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Beträge verbergen</p>
          <p className="text-xs text-gray-400 mt-0.5">Alle Beträge in der App maskieren</p>
        </div>
        <button onClick={onToggleHidden}
          className={`w-12 h-6 rounded-full transition-colors ${hidden ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
          <div className={`w-5 h-5 rounded-full bg-white m-0.5 transition-transform ${hidden ? 'translate-x-6' : ''}`} />
        </button>
      </div>

      {/* API Key */}
      <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <Key size={16} className="text-blue-600" />
          <h2 className="text-sm font-semibold">Kurse: Twelve Data API-Key</h2>
        </div>
        <p className="text-xs text-gray-400">
          Kostenloser Account auf <span className="font-medium">twelvedata.com</span> → API Key → hier eintragen. Nur für Aktien/ETF-Kurse nötig. 800 Abfragen/Tag, 8/Minute im Free-Tier.
        </p>
        <div className="flex gap-2">
          <input
            className={`${inputCls} flex-1`}
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="dein_api_key"
            autoComplete="off"
          />
          <button onClick={saveApiKey} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium shrink-0">
            {apiKeySaved ? '✓' : 'Speichern'}
          </button>
        </div>
        <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
          <AlertTriangle size={12} /> Der Key wird lokal gespeichert und ist nur im verschlüsselten Backup enthalten.
        </p>
      </div>

      {/* Konten */}
      <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-[#38383a]">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-blue-600" />
            <h2 className="text-sm font-semibold">Konten &amp; Depots</h2>
          </div>
          <button onClick={() => { setEditKonto(null); setKontoFormOpen(true) }}
            className="flex items-center gap-1 text-blue-600 dark:text-blue-400 text-sm font-medium">
            <Plus size={14} /> Neu
          </button>
        </div>
        {konten.length === 0 ? (
          <div className="px-4 py-3 text-sm text-gray-400">Noch keine Konten.</div>
        ) : (
          konten.map((k, i) => (
            <div key={k.id} className={`flex items-center gap-3 px-4 py-3 ${i < konten.length - 1 ? 'border-b border-gray-100 dark:border-[#38383a]' : ''}`}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{k.name}</p>
                <p className="text-xs text-gray-400">{k.typ}</p>
              </div>
              <button onClick={() => { setEditKonto(k); setKontoFormOpen(true) }} className="p-1.5 text-gray-400">
                <Pencil size={14} />
              </button>
              <button onClick={() => { if (confirm(`"${k.name}" löschen?`)) void removeKonto(k.id) }} className="p-1.5 text-red-400">
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Backup Export */}
      <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <Download size={16} className="text-blue-600" />
          <h2 className="text-sm font-semibold">Backup exportieren</h2>
        </div>
        {lastBackup && (
          <p className="text-xs text-gray-400">Letztes Backup: {new Date(lastBackup).toLocaleDateString('de-DE')}</p>
        )}
        <form onSubmit={e => void handleExport(e)} className="flex gap-2">
          <input
            className={`${inputCls} flex-1`}
            type="password"
            value={exportPass}
            onChange={e => setExportPass(e.target.value)}
            placeholder="Backup-Passwort"
            required
            autoComplete="new-password"
          />
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium shrink-0">
            Export
          </button>
        </form>
        <p className="text-xs text-gray-400">AES-GCM 256-bit verschlüsselt. Ein vergessenes Passwort ist nicht wiederherstellbar.</p>
      </div>

      {/* Backup Import */}
      <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <Upload size={16} className="text-blue-600" />
          <h2 className="text-sm font-semibold">Backup importieren</h2>
        </div>
        <button onClick={() => fileRef.current?.click()}
          className="w-full py-2.5 border-2 border-dashed border-gray-200 dark:border-[#38383a] rounded-xl text-sm text-gray-400">
          {pendingImport ? '✓ Datei geladen' : 'Backup-Datei auswählen'}
        </button>
        <input ref={fileRef} type="file" accept=".json,.enc" onChange={e => void handleFileSelected(e)} className="hidden" />
        {pendingImport && (
          <form onSubmit={e => void handleImport(e)} className="flex gap-2">
            <input
              className={`${inputCls} flex-1`}
              type="password"
              value={importPass}
              onChange={e => setImportPass(e.target.value)}
              placeholder="Backup-Passwort"
              required
            />
            <button type="submit" className="px-4 py-2 border border-gray-200 dark:border-[#38383a] rounded-xl text-sm font-medium shrink-0">
              Prüfen
            </button>
          </form>
        )}
        {importPreview && (
          <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-xl">
            <p className="text-xs text-green-800 dark:text-green-300 mb-2">Vorschau: {importPreview}</p>
            <div className="flex gap-2">
              <button onClick={() => { setPendingImport(null); setImportPreview(null); setImportPass('') }}
                className="flex-1 py-2 border border-gray-200 dark:border-[#38383a] rounded-xl text-sm font-medium">
                Abbrechen
              </button>
              <button onClick={() => void confirmImport()}
                className="flex-1 py-2 bg-red-600 text-white rounded-xl text-sm font-medium">
                Alle Daten ersetzen
              </button>
            </div>
          </div>
        )}
        <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
          <AlertTriangle size={12} /> Import überschreibt alle lokalen Daten.
        </p>
      </div>

      {/* Status */}
      {backupStatus && (
        <p className="text-sm text-center text-gray-500 dark:text-gray-400">{backupStatus}</p>
      )}

      {/* Info */}
      <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 shadow-sm space-y-2">
        <h2 className="text-sm font-semibold">Datenschutz</h2>
        <p className="text-xs text-gray-400 leading-relaxed">
          Alle Daten liegen ausschließlich lokal auf diesem Gerät. Kein Server, keine Accounts, keine Analytik. Backups sind AES-GCM 256-bit verschlüsselt und können nur mit dem gewählten Passwort wiederhergestellt werden.
        </p>
        <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
          Diese App dient rein privaten Zwecken und stellt keine Anlage-, Steuer- oder Rechtsberatung dar. Berechnungen sind Näherungen ohne Gewähr.
        </p>
      </div>

      {/* Konto Sheet */}
      <Sheet open={kontoFormOpen} onClose={() => setKontoFormOpen(false)}
        title={editKonto ? 'Konto bearbeiten' : 'Neues Konto'}>
        <KontoForm
          initial={editKonto ?? undefined}
          onSave={k => { void saveKonto(k); setKontoFormOpen(false) }}
          onCancel={() => setKontoFormOpen(false)}
        />
      </Sheet>
    </div>
  )
}
