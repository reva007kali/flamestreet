import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/axios";

export default function TrainerInviteMember() {
  const [identifier, setIdentifier] = useState("");
  const [done, setDone] = useState(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const v = String(identifier ?? "").trim();
      if (!v) throw new Error("Masukkan username atau email.");
      const r = await api.post("/trainer/invitations", { identifier: v });
      return r.data?.invitation;
    },
    onSuccess: (inv) => {
      setDone(inv ?? { ok: true });
      setIdentifier("");
    },
  });

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
            Referrals
          </div>
          <h1 className="text-lg font-black uppercase tracking-tight text-white">
            Invite Member
          </h1>
        </div>
        <Link
          to="/trainer/referrals"
          className="text-xs font-bold text-[var(--accent)]"
        >
          Back
        </Link>
      </div>

      <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 space-y-3">
        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
          Username / Email
        </label>
        <input
          className="h-12 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 text-sm font-semibold text-white outline-none focus:border-[var(--accent)] transition-all"
          value={identifier}
          onChange={(e) => {
            setDone(null);
            setIdentifier(e.target.value);
          }}
          placeholder="contoh: raka atau raka@email.com"
          autoCapitalize="none"
          autoCorrect="off"
          inputMode="email"
        />

        <button
          type="button"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
          className="mt-2 w-full rounded-2xl bg-[var(--accent)] py-4 text-xs font-black uppercase tracking-[0.2em] text-[var(--accent-foreground)] disabled:opacity-40"
        >
          {mutation.isPending ? "Sending…" : "Send Invitation"}
        </button>

        {mutation.isError ? (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-[11px] font-semibold text-rose-200">
            {mutation.error?.response?.data?.message ??
              mutation.error?.message ??
              "Gagal"}
          </div>
        ) : null}

        {done ? (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-[11px] font-semibold text-emerald-200">
            Invitation terkirim.
          </div>
        ) : null}
      </div>
    </div>
  );
}
