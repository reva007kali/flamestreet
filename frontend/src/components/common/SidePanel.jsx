import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function SidePanel({ open, title, onClose, children }) {
  useEffect(() => {
    if (!open) return
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => onClose?.()} />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[420px] flex-col border-l border-zinc-800 bg-zinc-950 md:max-w-[420px]">
        <div className="flex h-14 items-center justify-between border-b border-zinc-800 px-4">
          <div className="text-sm font-semibold">{title}</div>
        </div>
        <div className="flex items-center justify-end border-b border-zinc-800/50 px-4 py-2">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-all"
            onClick={() => onClose?.()}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </aside>
    </>
  )
}

