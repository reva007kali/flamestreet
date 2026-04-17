import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/axios";
import PostCard from "@/pages/flamehub/components/PostCard";
import CommentsSheet from "@/pages/flamehub/components/CommentsSheet";
import { Plus, Search, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

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
  const [savingId, setSavingId] = useState(null);
  const [activePostId, setActivePostId] = useState(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const myUsername = useAuthStore((s) => s.user?.username ?? null);

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

  // UX: Auto-fetch next page when scrolling to bottom
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 500 &&
        feedQuery.hasNextPage &&
        !feedQuery.isFetchingNextPage
      ) {
        feedQuery.fetchNextPage();
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [feedQuery]);

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

  const saveMutation = useMutation({
    mutationFn: async ({ postId, save }) => {
      if (save) return (await api.post(`/flamehub/posts/${postId}/save`)).data;
      return (await api.delete(`/flamehub/posts/${postId}/save`)).data;
    },
    onMutate: async ({ postId, save }) => {
      setSavingId(postId);
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
              return { ...it, saved_by_me: Boolean(save) };
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
      setSavingId(null);
      qc.invalidateQueries({ queryKey: ["flamehub", "feed"] });
    },
  });

  const hideMutation = useMutation({
    mutationFn: async ({ postId }) =>
      (await api.post(`/flamehub/posts/${postId}/hide`)).data,
    onMutate: async ({ postId }) => {
      await qc.cancelQueries({ queryKey: ["flamehub", "feed"] });
      const prev = qc.getQueryData(["flamehub", "feed"]);
      qc.setQueryData(["flamehub", "feed"], (old) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((p) => ({
            ...p,
            data: (p?.data ?? []).filter((it) => it.id !== postId),
          })),
        };
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["flamehub", "feed"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["flamehub", "feed"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ postId }) =>
      (await api.delete(`/flamehub/posts/${postId}`)).data,
    onMutate: async ({ postId }) => {
      await qc.cancelQueries({ queryKey: ["flamehub", "feed"] });
      const prev = qc.getQueryData(["flamehub", "feed"]);
      qc.setQueryData(["flamehub", "feed"], (old) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((p) => ({
            ...p,
            data: (p?.data ?? []).filter((it) => it.id !== postId),
          })),
        };
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["flamehub", "feed"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["flamehub", "feed"] }),
  });

  const editMutation = useMutation({
    mutationFn: async ({ postId, caption }) =>
      (await api.put(`/flamehub/posts/${postId}`, { caption })).data?.post,
    onSuccess: (post) => {
      if (!post?.id) return;
      qc.setQueryData(["flamehub", "feed"], (old) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((p) => ({
            ...p,
            data: (p?.data ?? []).map((it) => (it.id === post.id ? { ...it, caption: post.caption } : it)),
          })),
        };
      });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["flamehub", "feed"] }),
  });

  return (
    <div className="mx-auto max-w-xl pb-20">
      {/* Header Statis / App Bar Style */}
      <div className="sticky top-0 z-20 mb-6 flex items-center justify-between border-b border-zinc-900 bg-zinc-950/80 py-4 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center">
            <img src="/logo-sm.png" alt="" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-white uppercase italic">
            Flamehub
          </h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Link
            to={`${basePath}/flamehub/search`}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-zinc-400 hover:text-white transition-colors"
          >
            <Search size={20} />
          </Link>
          <Link
            to={`${basePath}/flamehub/new`}
            className="flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-bold text-[var(--accent-foreground)] shadow-lg shadow-[var(--accent)]/20 hover:brightness-110 active:scale-95 transition-all"
          >
            <Plus size={18} strokeWidth={3} />
            <span className="hidden sm:inline">Post</span>
          </Link>
        </div>
      </div>

      {/* Status & Loading State */}
      {feedQuery.isLoading && (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <Loader2 className="mb-4 h-8 w-8 animate-spin text-[var(--accent)]" />
          <p className="text-sm font-medium animate-pulse">Gathering latest updates...</p>
        </div>
      )}

      {feedQuery.isError && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center">
          <p className="text-sm font-semibold text-red-400">Failed to load feed</p>
          <button 
            onClick={() => feedQuery.refetch()}
            className="mt-2 text-xs font-bold text-white underline underline-offset-4"
          >
            Try again
          </button>
        </div>
      )}

      {/* Post List */}
      <div className="space-y-2">
        {items.map((p) => (
          <div key={p.id} className="group transition-all">
            <PostCard
              post={p}
              basePath={basePath}
              liking={likingId === p.id}
              saving={savingId === p.id}
              isOwner={Boolean(myUsername && p?.user?.username && myUsername === p.user.username)}
              onToggleLike={(post) =>
                likeMutation.mutate({ postId: post.id, like: !post.liked_by_me })
              }
              onToggleSave={(post) =>
                saveMutation.mutate({ postId: post.id, save: !post.saved_by_me })
              }
              onOpenComments={(post) => {
                setActivePostId(post.id);
                setCommentsOpen(true);
              }}
              onShare={(url) => shareLink(url)}
              onHide={(post) => hideMutation.mutate({ postId: post.id })}
              onDelete={(post) => {
                if (!window.confirm("Delete this post?")) return;
                deleteMutation.mutate({ postId: post.id });
              }}
              onEdit={(post) => {
                const next = window.prompt("Edit caption", post.caption ?? "");
                if (next == null) return;
                editMutation.mutate({ postId: post.id, caption: next.trim() || null });
              }}
            />
            {/* Divider ala Threads/IG */}
            <div className="mx-auto h-[1px] w-[95%] bg-zinc-900 group-last:hidden" />
          </div>
        ))}
      </div>

      {/* Infinite Scroll Indicator */}
      <div className="mt-10 flex h-20 items-center justify-center">
        {feedQuery.hasNextPage ? (
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading more stories
          </div>
        ) : (
          !feedQuery.isLoading && (
            <div className="flex flex-col items-center gap-2">
              <div className="h-[1px] w-12 bg-zinc-800" />
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-700">
                You're all caught up
              </p>
            </div>
          )
        )}
      </div>

      {/* Sheet Komentar */}
      <CommentsSheet
        basePath={basePath}
        postId={activePostId}
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
      />
    </div>
  );
}
