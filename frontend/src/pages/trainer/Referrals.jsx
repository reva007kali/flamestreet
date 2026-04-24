import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { Link } from "react-router-dom";

export default function Referrals() {
  const query = useQuery({
    queryKey: ["trainer", "referrals"],
    queryFn: async () => (await api.get("/trainer/referrals")).data,
  });

  const rows = query.data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Members</h1>
        <Link
          to="/trainer/invite-member"
          className="rounded-xl bg-[var(--accent)] px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-[var(--accent-foreground)]"
        >
          Invite Member
        </Link>
      </div>

      <div className="space-y-3">
        {rows.map((r, idx) => (
          <div
            key={idx}
            className="rounded border border-zinc-800 bg-zinc-900 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium">{r.member.full_name}</div>
                <div className="mt-1 text-sm text-zinc-400">
                  @{r.member.username}
                </div>
              </div>
              {r.latest_order ? (
                <Link
                  className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)]"
                  to={`/orders/${r.latest_order.order_number}`}
                >
                  Latest order
                </Link>
              ) : (
                <div className="text-sm text-zinc-500">No orders</div>
              )}
            </div>
          </div>
        ))}
        {query.isLoading ? (
          <div className="text-sm text-zinc-400">Loading...</div>
        ) : null}
        {query.isError ? (
          <div className="text-sm text-red-300">Failed to load referrals.</div>
        ) : null}
      </div>
    </div>
  );
}
