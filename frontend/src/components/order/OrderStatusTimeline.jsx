const steps = [
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'delivering', label: 'Delivering' },
  { key: 'delivered', label: 'Delivered' },
]

export default function OrderStatusTimeline({ status }) {
  const activeIndex = Math.max(
    0,
    steps.findIndex((s) => s.key === status),
  )

  return (
    <div className="flex flex-wrap gap-2">
      {steps.map((s, idx) => {
        const active = idx <= activeIndex
        return (
          <div
            key={s.key}
            className={`rounded-full border px-3 py-1 text-xs ${
              active
                ? 'border-[var(--accent-border)] bg-[var(--accent-muted)] text-[var(--accent)]'
                : 'border-zinc-800 bg-zinc-900 text-zinc-400'
            }`}
          >
            {s.label}
          </div>
        )
      })}
    </div>
  )
}
