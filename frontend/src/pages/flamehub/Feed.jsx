import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/axios";
import PostCard from "@/pages/flamehub/components/PostCard";

async function shareLink(url) {
  const full = `${window.location.origin}${url}`;
  if (navigator.share) {
    try {
      await navigator.share({ url: full });
      return;
    } catch {
      await Promise.resolve();
    }
  }
  try {
    await navigator.clipboard.writeText(full);
  } catch {
    await Promise.resolve();
  }
}

export default function FlamehubFeed({ basePath }) {
  const qc = useQueryClient();
  const [likingId, setLikingId] = useState(null);

  const feedQuery = useInfiniteQuery({
    queryKey: ["flamehub", "feed"],
    queryFn: async ({ pageParam }) => {
      const r = await api.get("/flamehub/feed", {
        params: { cursor: pageParam },
      });
      return r.data;
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage?.next_cursor ?? null,
  });

  const items = useMemo(() => {
    const pages = feedQuery.data?.pages ?? [];
    return pages.flatMap((p) => p?.data ?? []);
  }, [feedQuery.data]);

  const likeMutation = useMutation({
    mutationFn: async ({ postId, like }) => {
      if (like) return (await api.post(`/flamehub/posts/${postId}/like`)).data;
      return (await api.delete(`/flamehub/posts/${postId}/like`)).data;
    },
    onMutate: async ({ postId, like }) => {
      setLikingId(postId);
      await qc.cancelQueries({ queryKey: ["flamehub", "feed"] });
      const prev = qc.getQueryData(["flamehub", "feed"]);
      qc.setQueryData(["flamehub", "feed"], (old) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((p) => ({
            ...p,
            data: (p?.data ?? []).map((it) => {
              if (it.id !== postId) return it;
              const liked = Boolean(like);
              const before = Boolean(it.liked_by_me);
              const delta = liked === before ? 0 : liked ? 1 : -1;
              return {
                ...it,
                liked_by_me: liked,
                like_count: Math.max(0, Number(it.like_count ?? 0) + delta),
              };
            }),
          })),
        };
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["flamehub", "feed"], ctx.prev);
    },
    onSettled: () => {
      setLikingId(null);
      qc.invalidateQueries({ queryKey: ["flamehub", "feed"] });
    },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-emerald-300/80">
            Flamehub
          </div>
          <h1 className="mt-1 text-2xl font-black text-zinc-100">Feed</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`${basePath}/flamehub/search`}
            className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-3 py-2 text-sm font-semibold text-zinc-200 hover:border-zinc-700"
          >
            Search
          </Link>
          <Link
            to={`${basePath}/flamehub/new`}
            className="rounded-xl border border-emerald-400/35 bg-emerald-400/10 px-3 py-2 text-sm font-semibold text-emerald-200 shadow-[0_0_30px_rgba(34,197,94,0.12)] hover:bg-emerald-400/15"
          >
            New Post
          </Link>
        </div>
      </div>

      {feedQuery.isLoading ? (
        <div className="text-sm text-zinc-400">Loading…</div>
      ) : null}
      {feedQuery.isError ? (
        <div className="text-sm text-red-300">
          Failed to load Flamehub feed.
        </div>
      ) : null}

      <div className="space-y-4">
        {items.map((p) => (
          <PostCard
            key={p.id}
            post={p}
            basePath={basePath}
            liking={likingId === p.id}
            onToggleLike={(post) =>
              likeMutation.mutate({ postId: post.id, like: !post.liked_by_me })
            }
            onShare={(url) => shareLink(url)}
          />
        ))}
      </div>

      <div className="flex justify-center">
        {feedQuery.hasNextPage ? (
          <button
            type="button"
            className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-2 text-sm font-semibold text-zinc-200 hover:border-zinc-700 disabled:opacity-50"
            onClick={() => feedQuery.fetchNextPage()}
            disabled={feedQuery.isFetchingNextPage}
          >
            {feedQuery.isFetchingNextPage ? "Loading…" : "Load more"}
          </button>
        ) : (
          <div className="text-xs text-zinc-500">End of feed</div>
        )}
      </div>
    </div>
  );
}
