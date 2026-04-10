import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import {
  ArrowDownLeft,
  ArrowUpRight,
  BadgeCheck,
  Clock,
  Coins,
  HandCoins,
  History,
  Landmark,
  Save,
  XCircle,
} from 'lucide-react'

export default function Points() {
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState(null)
  const [payoutBank, setPayoutBank] = useState('')
  const [payoutAccountNumber, setPayoutAccountNumber] = useState('')

  const pointsQuery = useQuery({
    queryKey: ['trainer', 'points'],
    queryFn: async () => (await api.get('/trainer/points')).data,
  })

  const redeemsQuery = useQuery({
    queryKey: ['trainer', 'redeems'],
    queryFn: async () => (await api.get('/trainer/redeems')).data,
  })

  useEffect(() => {
    const p = pointsQuery.data?.payout
    if (!p) return
    setPayoutBank(p.payout_bank ?? '')
    setPayoutAccountNumber(p.payout_account_number ?? '')
  }, [pointsQuery.data?.payout?.payout_bank, pointsQuery.data?.payout?.payout_account_number])

  const savePayout = useMutation({
    mutationFn: async () =>
      (await api.put('/trainer/payout-account', { payout_bank: payoutBank || null, payout_account_number: payoutAccountNumber })).data,
    onSuccess: () => {
      setMessage('Payout account saved')
      pointsQuery.refetch()
      setTimeout(() => setMessage(null), 1000)
    },
    onError: () => setMessage('Cannot save payout account'),
  })

  const redeem = useMutation({
    mutationFn: async () => (await api.post('/trainer/points/redeem', { amount: Number(amount) })).data,
    onSuccess: () => {
      setAmount('')
      setMessage('Redeem requested')
      pointsQuery.refetch()
      redeemsQuery.refetch()
      setTimeout(() => setMessage(null), 1000)
    },
    onError: () => setMessage('Cannot redeem'),
  })

  const tx = pointsQuery.data?.transactions?.data ?? []
  const redeems = redeemsQuery.data?.data ?? []

  const balance = Number(pointsQuery.data?.balance ?? 0) || 0
  const balanceRupiah = Number(pointsQuery.data?.balance_rupiah ?? 0) || 0
  const pendingCount = useMemo(() => redeems.filter((r) => r.status === 'pending').length, [redeems])
  const pendingReserved = useMemo(
    () =>
      redeems
        .filter((r) => r.status === 'pending' && !r.deducted)
        .reduce((sum, r) => sum + (Number(r.amount ?? 0) || 0), 0),
    [redeems],
  )
  const availableBalance = Math.max(0, balance - pendingReserved)

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950">
              <Coins className="h-5 w-5 text-[var(--accent)]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Points</h1>
              <div className="text-xs text-zinc-500">1 Flame Point = Rp 1</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {pendingCount > 0 ? (
              <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
                {pendingCount} pending • {pendingReserved.toLocaleString('id-ID')} pts
              </span>
            ) : null}
            <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-300">
              Available: <span className="font-semibold">{availableBalance.toLocaleString('id-ID')}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950">
                <Coins className="h-4 w-4 text-zinc-300" />
              </div>
              <div className="font-medium">Balance</div>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-semibold">{availableBalance.toLocaleString('id-ID')}</div>
            <div className="mt-1 text-sm text-zinc-400">
              Rp {availableBalance.toLocaleString('id-ID')}
              {pendingReserved > 0 ? (
                <span className="text-zinc-500">
                  {' '}
                  • Reserved pending:{' '}
                  <span className="text-zinc-300">{pendingReserved.toLocaleString('id-ID')} pts</span>
                </span>
              ) : null}
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-xs text-zinc-400">
            Gunakan poin untuk pembayaran atau ajukan redeem ke rekening pencairan.
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950">
              <Landmark className="h-4 w-4 text-zinc-300" />
            </div>
            <div className="font-medium">Payout Account</div>
          </div>
          <div className="mt-4 grid gap-2">
            <input
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
              placeholder="Bank (optional)"
              value={payoutBank}
              onChange={(e) => setPayoutBank(e.target.value)}
            />
            <input
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
              placeholder="Account number"
              value={payoutAccountNumber}
              onChange={(e) => setPayoutAccountNumber(e.target.value)}
            />
            <button
              type="button"
              className="inline-flex w-full items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800/40 disabled:opacity-50"
              onClick={() => savePayout.mutate()}
              disabled={!payoutAccountNumber || savePayout.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              {savePayout.isPending ? 'Saving...' : 'Save payout'}
            </button>
            <div className="text-xs text-zinc-500">
              Nomor rekening wajib diisi untuk melakukan redeem.
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950">
            <HandCoins className="h-4 w-4 text-zinc-300" />
          </div>
          <div className="font-medium">Redeem Points</div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
          <input
            type="number"
            inputMode="numeric"
            min="1"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
            placeholder="Amount (points)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <button
            type="button"
            className="inline-flex w-full items-center justify-center rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)] disabled:opacity-50 sm:w-auto"
            onClick={() => redeem.mutate()}
            disabled={redeem.isPending || !amount || !payoutAccountNumber}
          >
            {redeem.isPending ? 'Submitting...' : 'Request redeem'}
          </button>
        </div>
        {!payoutAccountNumber ? (
          <div className="mt-2 text-xs text-amber-400">Lengkapi payout account terlebih dahulu.</div>
        ) : null}
        {message ? (
          <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-200">
            {message}
          </div>
        ) : null}
      </div>

      <div className="rounded border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex items-center gap-2 font-medium">
          <Clock className="h-4 w-4 text-zinc-400" />
          Redeem Requests
        </div>
        <div className="mt-3 space-y-2">
          {redeems.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm"
            >
              <div className="min-w-0">
                <div className="text-zinc-200">
                  #{r.id} • {Number(r.amount ?? 0).toLocaleString('id-ID')} points
                </div>
                <div className="mt-0.5 text-xs text-zinc-500">
                  {r.payout_bank ? `${r.payout_bank} • ` : ''}
                  {r.payout_account_number ?? '-'}
                </div>
              </div>
              <div className="shrink-0">
                {r.status === 'approved' ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-500">
                    <BadgeCheck className="h-3.5 w-3.5" /> approved
                  </span>
                ) : r.status === 'rejected' ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-500">
                    <XCircle className="h-3.5 w-3.5" /> rejected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-2.5 py-1 text-xs font-medium text-amber-400">
                    <Clock className="h-3.5 w-3.5" /> pending
                  </span>
                )}
              </div>
            </div>
          ))}
          {redeemsQuery.isLoading ? <div className="text-sm text-zinc-400">Loading...</div> : null}
          {!redeems.length && !redeemsQuery.isLoading ? (
            <div className="text-sm text-zinc-400">No redeem requests.</div>
          ) : null}
        </div>
      </div>

      <div className="rounded border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex items-center gap-2 font-medium">
          <History className="h-4 w-4 text-zinc-400" />
          History
        </div>
        <div className="mt-3 space-y-2">
          {tx.map((t) => (
            <div
              key={t.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm"
            >
              <div className="flex min-w-0 items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900">
                  {Number(t.amount) >= 0 ? (
                    <ArrowUpRight className="h-4 w-4 text-[var(--accent)]" />
                  ) : (
                    <ArrowDownLeft className="h-4 w-4 text-red-300" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-zinc-200">
                    {t.type}
                    {t.description ? ` • ${t.description}` : ''}
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-500">
                    {new Date(t.created_at).toLocaleString('id-ID')}
                  </div>
                </div>
              </div>
              <div className={Number(t.amount) >= 0 ? 'shrink-0 font-semibold text-[var(--accent)]' : 'shrink-0 font-semibold text-red-300'}>
                {Number(t.amount).toLocaleString('id-ID')}
              </div>
            </div>
          ))}
          {pointsQuery.isLoading ? <div className="text-sm text-zinc-400">Loading...</div> : null}
          {!tx.length && !pointsQuery.isLoading ? (
            <div className="text-sm text-zinc-400">No transactions yet.</div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
