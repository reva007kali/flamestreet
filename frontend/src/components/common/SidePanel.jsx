import { useEffect } from 'react'

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
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[420px] flex-col border-l border-zinc-800 bg-zinc-950">
        <div className="flex h-14 items-center justify-between border-b border-zinc-800 px-4">
          <div className="text-sm font-semibold">{title}</div>
          <button
            type="button"
            className="rounded bg-zinc-800 px-3 py-1 text-sm hover:bg-zinc-700"
            onClick={() => onClose?.()}
          >
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </aside>
    </>
  )
}

