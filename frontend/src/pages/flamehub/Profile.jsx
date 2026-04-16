import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { toPublicUrl } from "@/lib/assets";
import { useAuthStore } from "@/store/authStore";

function Avatar({ user }) {
  const src = toPublicUrl(user?.avatar);
  if (src) {
    return (
      <img
        alt=""
        src={src}
        className="h-20 w-20 rounded-3xl object-cover ring-1 ring-emerald-400/25 shadow-[0_0_40px_rgba(34,197,94,0.18)]"
      />
    );
  }
  const letter = (
    user?.username?.[0] ??
    user?.full_name?.[0] ??
    "F"
  ).toUpperCase();
  return (
    <div className="grid h-20 w-20 place-items-center rounded-3xl bg-emerald-500/15 text-2xl font-black text-emerald-200 ring-1 ring-emerald-400/25 shadow-[0_0_40px_rgba(34,197,94,0.18)]">
      {letter}
    </div>
  );
}

function Thumb({ post, basePath }) {
  const m = post.media?.[0];
  const src = toPublicUrl(m?.path);
  return (
    <Link
      to={`${basePath}/flamehub/p/${post.id}`}
      className="group relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/60 hover:border-zinc-700"
    >
      <div className="aspect-square w-full bg-black/30">
        {src ? (
          m?.type === "video" ? (
            <video
              className="h-full w-full object-cover opacity-90"
              src={src}
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            <img alt="" src={src} className="h-full w-full object-cover" />
          )
        ) : null}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent opacity-0 transition group-hover:opacity-100" />
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2 text-xs text-zinc-200/90">
        <div>♥ {post.like_count ?? 0}</div>
        <div>💬 {post.comment_count ?? 0}</div>
      </div>
    </Link>
  );
}

export default function FlamehubProfile({ basePath }) {
  const qc = useQueryClient();
  const { username } = useParams();
  const [busy, setBusy] = useState(false);
  const myUsername = useAuthStore((s) => s.user?.username ?? null);

  const profileQuery = useQuery({
    queryKey: ["flamehub", "profile", username],
    enabled: Boolean(username),
    queryFn: async () => (await api.get(`/flamehub/users/${username}`)).data,
  });

  const followMutation = useMutation({
    mutationFn: async ({ follow }) => {
      if (follow)
        return (await api.post(`/flamehub/users/${username}/follow`)).data;
      return (await api.delete(`/flamehub/users/${username}/follow`)).data;
    },
    onMutate: async () => {
      setBusy(true);
      await qc.cancelQueries({ queryKey: ["flamehub", "profile", username] });
      const prev = qc.getQueryData(["flamehub", "profile", username]);
      qc.setQueryData(["flamehub", "profile", username], (old) => {
        if (!old) return old;
        const next = !old.is_following;
        return { ...old, is_following: next };
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev)
        qc.setQueryData(["flamehub", "profile", username], ctx.prev);
    },
    onSettled: () => {
      setBusy(false);
      qc.invalidateQueries({ queryKey: ["flamehub", "profile", username] });
    },
  });

  const data = profileQuery.data;
  const user = data?.user;
  const posts = useMemo(() => data?.posts ?? [], [data]);
  const isMe = Boolean(
    myUsername && user?.username && myUsername === user.username,
  );

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Link
          to={`${basePath}/flamehub`}
          className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-3 py-2 text-sm font-semibold text-zinc-200 hover:border-zinc-700"
        >
          Back
        </Link>
        <Link
          to={`${basePath}/flamehub/search`}
          className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-3 py-2 text-sm font-semibold text-zinc-200 hover:border-zinc-700"
        >
          Search
        </Link>
      </div>

      {profileQuery.isLoading ? (
        <div className="text-sm text-zinc-400">Loading…</div>
      ) : null}
      {profileQuery.isError ? (
        <div className="text-sm text-red-300">Failed to load profile.</div>
      ) : null}

      {user ? (
        <div className="relative overflow-hidden rounded-3xl border border-emerald-400/15 bg-zinc-950/50 p-5 shadow-[0_0_55px_rgba(34,197,94,0.08)] backdrop-blur">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.18),transparent_55%)]" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Avatar user={user} />
              <div className="min-w-0">
                <div className="truncate text-2xl font-black text-zinc-100">
                  @{user.username}
                </div>
                {user.full_name ? (
                  <div className="truncate text-sm text-zinc-300/85">
                    {user.full_name}
                  </div>
                ) : null}
                <div className="mt-2 flex items-center gap-4 text-xs text-zinc-400">
                  <div>
                    <span className="font-semibold text-zinc-200">
                      {data?.stats?.followers ?? 0}
                    </span>{" "}
                    followers
                  </div>
                  <div>
                    <span className="font-semibold text-zinc-200">
                      {data?.stats?.following ?? 0}
                    </span>{" "}
                    following
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isMe ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    followMutation.mutate({ follow: !data?.is_following })
                  }
                  className={[
                    "rounded-xl border px-4 py-2 text-sm font-semibold transition disabled:opacity-50",
                    data?.is_following
                      ? "border-zinc-800/80 bg-zinc-900/40 text-zinc-200 hover:border-zinc-700"
                      : "border-emerald-400/35 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/15",
                  ].join(" ")}
                >
                  {data?.is_following ? "Following" : "Follow"}
                </button>
              ) : null}
              <Link
                to={`${basePath}/flamehub/new`}
                className="rounded-xl border border-emerald-400/35 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-400/15"
              >
                Post
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {posts.map((p) => (
          <Thumb key={p.id} post={p} basePath={basePath} />
        ))}
      </div>
      {user && !posts.length ? (
        <div className="text-sm text-zinc-400">Belum ada post.</div>
      ) : null}
    </div>
  );
}
