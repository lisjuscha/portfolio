import { LayoutDashboard, TrendingUp, FileText, Calendar, Settings, Wallet } from 'lucide-react'

export type Tab = 'dashboard' | 'anlagen' | 'vertraege' | 'termine' | 'budget' | 'einstellungen'

const TABS: { id: Tab; icon: typeof LayoutDashboard; label: string }[] = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'anlagen', icon: TrendingUp, label: 'Anlagen' },
  { id: 'vertraege', icon: FileText, label: 'Verträge' },
  { id: 'termine', icon: Calendar, label: 'Termine' },
  { id: 'budget', icon: Wallet, label: 'Budget' },
  { id: 'einstellungen', icon: Settings, label: 'Mehr' },
]

interface Props {
  active: Tab
  onChange: (tab: Tab) => void
}

export function BottomNav({ active, onChange }: Props) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-10 bg-white dark:bg-black border-t border-gray-200 dark:border-[#38383a]">
      <div className="flex">
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = tab.id === active
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 gap-0.5 text-[9px] font-medium transition-colors ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-400 dark:text-[#8e8e93]'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              {tab.label}
            </button>
          )
        })}
      </div>
      <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
    </nav>
  )
}
