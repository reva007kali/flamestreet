import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { toPublicUrl } from "@/lib/assets";

function Avatar({ user }) {
  const src = toPublicUrl(user?.avatar);
  if (src)
    return (
      <img
        alt=""
        src={src}
        className="h-10 w-10 rounded-full object-cover ring-1 ring-emerald-400/25"
      />
    );
  const letter = (
    user?.username?.[0] ??
    user?.full_name?.[0] ??
    "F"
  ).toUpperCase();
  return (
    <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-500/15 text-sm font-black text-emerald-200 ring-1 ring-emerald-400/25">
      {letter}
    </div>
  );
}

export default function FlamehubSearch({ basePath }) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(q.trim()), 250);
    return () => window.clearTimeout(t);
  }, [q]);

  const query = useQuery({
    queryKey: ["flamehub", "userSearch", debounced],
    enabled: debounced.length > 0,
    queryFn: async () =>
      (await api.get("/flamehub/users/search", { params: { q: debounced } }))
        .data.data,
  });

  const rows = useMemo(() => query.data ?? [], [query.data]);

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-emerald-300/80">
            Flamehub
          </div>
          <h1 className="mt-1 text-2xl font-black text-zinc-100">Search</h1>
        </div>
        <Link
          to={`${basePath}/flamehub`}
          className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-3 py-2 text-sm font-semibold text-zinc-200 hover:border-zinc-700"
        >
          Back
        </Link>
      </div>

      <div className="rounded-2xl border border-emerald-400/15 bg-zinc-950/50 p-4 backdrop-blur">
        <input
          className="w-full rounded-xl border border-zinc-800/80 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-400/40"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari username…"
        />
        <div className="mt-3 space-y-2">
          {q.trim().length === 0 ? (
            <div className="text-sm text-zinc-400">
              Ketik username untuk mulai mencari.
            </div>
          ) : query.isLoading ? (
            <div className="text-sm text-zinc-400">Searching…</div>
          ) : query.isError ? (
            <div className="text-sm text-red-300">Search failed.</div>
          ) : !rows.length ? (
            <div className="text-sm text-zinc-400">No users found.</div>
          ) : (
            rows.map((u) => (
              <Link
                key={u.id}
                to={`${basePath}/flamehub/u/${u.username}`}
                className="flex items-center gap-3 rounded-xl border border-zinc-800/70 bg-zinc-950/40 p-3 hover:border-zinc-700"
              >
                <Avatar user={u} />
                <div className="min-w-0">
                  <div className="truncate font-semibold text-zinc-200">
                    @{u.username}
                  </div>
                  {u.full_name ? (
                    <div className="truncate text-sm text-zinc-400">
                      {u.full_name}
                    </div>
                  ) : null}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
