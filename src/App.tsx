import { useState } from 'react'
import { BottomNav } from './components/BottomNav'
import type { Tab } from './components/BottomNav'
import { DashboardPage } from './pages/DashboardPage'
import { AnlagenPage } from './pages/AnlagenPage'
import { VertraegePage } from './pages/VertraegePage'
import { TerminePage } from './pages/TerminePage'
import { BudgetPage } from './pages/BudgetPage'
import { EinstellungenPage } from './pages/EinstellungenPage'
import { useAppData } from './hooks/useAppData'
import { Sheet } from './components/Sheet'
import { PositionForm } from './forms/PositionForm'
import { VertragForm } from './forms/VertragForm'
import { AusgabeForm } from './forms/AusgabeForm'

export function App() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const [hidden, setHidden] = useState(false)
  const [positionFormOpen, setPositionFormOpen] = useState(false)
  const [vertragFormOpen, setVertragFormOpen] = useState(false)
  const [ausgabeFormOpen, setAusgabeFormOpen] = useState(false)

  const appData = useAppData()

  if (!appData.ready) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden max-w-2xl mx-auto bg-gray-50 dark:bg-black">
      {/* Non-scrolling safe-area spacer — sits outside scroll, covers Dynamic Island */}
      <div className="shrink-0" style={{ height: 'env(safe-area-inset-top)' }} />
      {/* Content */}
      <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain pb-safe">
        {tab === 'dashboard' && (
          <DashboardPage
            {...appData}
            hidden={hidden}
            onToggleHidden={() => setHidden(h => !h)}
            onRefreshQuotes={appData.refreshQuotes}
            onOpenPositionForm={() => setPositionFormOpen(true)}
            onOpenVertragForm={() => setVertragFormOpen(true)}
          />
        )}
        {tab === 'anlagen' && (
          <AnlagenPage {...appData} hidden={hidden} />
        )}
        {tab === 'vertraege' && (
          <VertraegePage {...appData} hidden={hidden} />
        )}
        {tab === 'termine' && (
          <TerminePage {...appData} />
        )}
        {tab === 'budget' && (
          <BudgetPage
            ausgaben={appData.ausgaben}
            vertraege={appData.vertraege}
            onAdd={() => setAusgabeFormOpen(true)}
            onRemove={id => void appData.removeAusgabe(id)}
          />
        )}
        {tab === 'einstellungen' && (
          <EinstellungenPage
            {...appData}
            hidden={hidden}
            onToggleHidden={() => setHidden(h => !h)}
          />
        )}
      </main>

      {/* Bottom nav */}
      <BottomNav active={tab} onChange={setTab} />

      {/* Global sheets (opened from Dashboard quick-add buttons) */}
      <Sheet open={positionFormOpen} onClose={() => setPositionFormOpen(false)}
        title="Neue Position" fullscreen>
        <PositionForm
          konten={appData.konten}
          onSave={p => { void appData.savePosition(p); setPositionFormOpen(false) }}
          onCancel={() => setPositionFormOpen(false)}
        />
      </Sheet>

      <Sheet open={vertragFormOpen} onClose={() => setVertragFormOpen(false)}
        title="Neuer Vertrag" fullscreen>
        <VertragForm
          onSave={v => { void appData.saveVertrag(v); setVertragFormOpen(false) }}
          onCancel={() => setVertragFormOpen(false)}
        />
      </Sheet>

      <Sheet open={ausgabeFormOpen} onClose={() => setAusgabeFormOpen(false)}
        title="Ausgabe erfassen">
        <AusgabeForm
          onSave={a => { void appData.saveAusgabe(a); setAusgabeFormOpen(false) }}
          onCancel={() => setAusgabeFormOpen(false)}
        />
      </Sheet>
    </div>
  )
}
