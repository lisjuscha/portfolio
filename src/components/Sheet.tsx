import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  fullscreen?: boolean
}

export function Sheet({ open, onClose, title, children, fullscreen = false }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60" />
      <div
        className={`relative bg-white dark:bg-[#1c1c1e] rounded-t-2xl flex flex-col ${
          fullscreen ? 'flex-1 mt-12' : 'max-h-[92dvh]'
        }`}
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
      >
        {/* Handle */}
        {!fullscreen && (
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
          </div>
        )}
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-[#38383a]">
            <h2 className="text-base font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 -mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full"
            >
              <X size={20} />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-4 py-3 overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  )
}
