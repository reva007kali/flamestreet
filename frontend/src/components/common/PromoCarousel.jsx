import { useEffect, useMemo, useRef, useState } from 'react'

export default function PromoCarousel({ slides, intervalMs = 4500 }) {
  const items = useMemo(() => slides ?? [], [slides])
  const [index, setIndex] = useState(0)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!items.length) return
    if (timerRef.current) window.clearInterval(timerRef.current)
    timerRef.current = window.setInterval(() => {
      setIndex((i) => (i + 1) % items.length)
    }, intervalMs)
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
    }
  }, [items.length, intervalMs])

  if (!items.length) return null

  return (
    <div className="relative overflow-hidden border border-zinc-800 bg-zinc-900 sm:rounded-2xl">
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {items.map((s, i) => (
          <div key={i} className="h-[200px] w-full shrink-0">
            <div
              className={[
                'relative h-full w-full overflow-hidden',
                s.className ?? 'bg-zinc-950',
              ].join(' ')}
            >
              {s.imageUrl ? (
                <img
                  src={s.imageUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-black/10" />
              <div className="relative z-10 flex h-full w-full items-end p-5 sm:p-7">
                <div className="max-w-[520px]">
                  <div className="text-xs font-medium tracking-wide text-zinc-200">{s.kicker}</div>
                  <div className="mt-2 text-xl font-semibold text-white sm:text-2xl">{s.title}</div>
                  {s.subtitle ? <div className="mt-2 text-sm text-zinc-200">{s.subtitle}</div> : null}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 sm:bottom-3">
        {items.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            className={[
              'h-1.5 w-1.5 rounded-full transition-colors',
              i === index ? 'bg-[var(--accent)]' : 'bg-zinc-600 hover:bg-zinc-500',
            ].join(' ')}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
