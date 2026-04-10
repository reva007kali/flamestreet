export default function PointBalance({ balance, rupiah }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="text-sm text-zinc-400">Point Balance</div>
      <div className="mt-1 text-2xl font-semibold">{balance ?? 0}</div>
      <div className="mt-1 text-sm text-zinc-400">
        Rp {Number(rupiah ?? 0).toLocaleString('id-ID')}
      </div>
    </div>
  )
}

