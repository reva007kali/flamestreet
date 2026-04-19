export default function ModifierSelector({ modifiers, value, onChange }) {
  const selected = new Set(value ?? [])

  function toggle(optionId, checked) {
    const next = new Set(selected)
    if (checked) next.add(optionId)
    else next.delete(optionId)
    onChange?.(Array.from(next))
  }

  return (
    <div className="space-y-4">
      {(modifiers ?? []).map((m) => (
        <div key={m.id} className="rounded-3xl bg-linear-to-br from-emerald-900 to-black p-3">
          <div className="flex items-center justify-between">
            <div className="font-medium">{m.name}</div>
            {m.is_required ? (
              <div className="text-xs text-amber-300">Wajib</div>
            ) : (
              <div className="text-xs text-zinc-500">Opsional</div>
            )}
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {(m.options ?? []).map((opt) => {
              const checked = selected.has(opt.id)
              const isSingle = m.type === 'single'
              return (
                <label
                  key={opt.id}
                  className="flex cursor-pointer items-center gap-2 rounded-3xl border border-zinc-800 bg-black px-3 py-2 text-sm hover:border-zinc-700"
                >
                  <input
                    type={isSingle ? 'radio' : 'checkbox'}
                    name={`modifier-${m.id}`}
                    checked={checked}
                    onChange={(e) => {
                      if (isSingle) {
                        const next = new Set(selected)
                        for (const o of m.options ?? []) next.delete(o.id)
                        if (e.target.checked) next.add(opt.id)
                        onChange?.(Array.from(next))
                      } else {
                        toggle(opt.id, e.target.checked)
                      }
                    }}
                  />
                  <div className="flex-1">
                    <div>{opt.name}</div>
                    {Number(opt.additional_price ?? 0) > 0 ? (
                      <div className="text-xs text-zinc-500">
                        + Rp {Number(opt.additional_price).toLocaleString('id-ID')}
                      </div>
                    ) : null}
                  </div>
                </label>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
