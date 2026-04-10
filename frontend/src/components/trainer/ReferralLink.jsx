import { useMemo, useState } from 'react'
import { useAuthStore } from '@/store/authStore'

export default function ReferralLink() {
  const user = useAuthStore((s) => s.user)
  const [copied, setCopied] = useState(false)

  const link = useMemo(() => {
    const code = user?.trainer_profile?.referral_code ?? user?.trainerProfile?.referral_code ?? ''
    if (!code) return ''
    return `${window.location.origin}/register?ref=${encodeURIComponent(code)}`
  }, [user])

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="font-medium">Referral Link</div>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          value={link}
          readOnly
          className="w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
        />
        <button
          type="button"
          className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)]"
          disabled={!link}
          onClick={async () => {
            if (!link) return
            await navigator.clipboard.writeText(link)
            setCopied(true)
            setTimeout(() => setCopied(false), 1000)
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  )
}
