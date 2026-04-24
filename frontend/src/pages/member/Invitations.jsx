import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "@/lib/axios";

export default function MemberInvitations() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["member", "invitations"],
    queryFn: async () => (await api.get("/member/invitations")).data,
    staleTime: 5_000,
  });

  const accept = useMutation({
    mutationFn: async (id) => {
      await api.post(`/member/invitations/${id}/accept`);
      return true;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["member", "invitations"] });
      await qc.invalidateQueries({ queryKey: ["me"] });
      await qc.invalidateQueries({ queryKey: ["trainer", "dashboard"] });
      await qc.invalidateQueries({ queryKey: ["trainer", "referrals"] });
    },
  });

  const reject = useMutation({
    mutationFn: async (id) => {
      await api.post(`/member/invitations/${id}/reject`);
      return true;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["member", "invitations"] });
    },
  });

  const rows = query.data?.invitations ?? [];

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
            Referrals
          </div>
          <h1 className="text-lg font-black uppercase tracking-tight text-white">
            Invitations
          </h1>
        </div>
        <Link
          to="/member/profile"
          className="text-xs font-bold text-[var(--accent)]"
        >
          Back
        </Link>
      </div>

      {query.isLoading ? (
        <div className="text-sm text-zinc-400">Loading…</div>
      ) : query.isError ? (
        <div className="text-sm text-rose-200">
          {query.error?.response?.data?.message ??
            query.error?.message ??
            "Gagal load"}
        </div>
      ) : rows.length ? (
        <div className="space-y-3">
          {rows.map((inv) => {
            const t = inv?.trainer ?? {};
            const name = t?.full_name ?? "Trainer";
            const uname = t?.username ? `@${t.username}` : "";
            const busy = accept.isPending || reject.isPending;
            return (
              <div
                key={inv.id}
                className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[13px] font-black text-white truncate">
                      {name}{" "}
                      {uname ? (
                        <span className="text-white/40 font-semibold">
                          {uname}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 text-[11px] font-semibold text-white/40">
                      Invitation untuk jadi member referral
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => accept.mutate(inv.id)}
                    className="flex-1 rounded-2xl bg-[var(--accent)] py-3 text-[11px] font-black uppercase tracking-[0.2em] text-[var(--accent-foreground)] disabled:opacity-40"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => reject.mutate(inv.id)}
                    className="flex-1 rounded-2xl border border-white/10 bg-white/5 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-white/80 disabled:opacity-40"
                  >
                    Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 text-sm text-zinc-400">
          Tidak ada invitation.
        </div>
      )}

      {accept.isError || reject.isError ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-[11px] font-semibold text-rose-200">
          {accept.error?.response?.data?.message ??
            accept.error?.message ??
            reject.error?.response?.data?.message ??
            reject.error?.message ??
            "Gagal"}
        </div>
      ) : null}
    </div>
  );
}
