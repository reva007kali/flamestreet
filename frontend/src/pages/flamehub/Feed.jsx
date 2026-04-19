import { useMemo, useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/axios";
import PostCard from "@/pages/flamehub/components/PostCard";
import CommentsSheet from "@/pages/flamehub/components/CommentsSheet";
import { Plus, Search, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { toPublicUrl } from "@/lib/assets";

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
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [likingId, setLikingId] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [activePostId, setActivePostId] = useState(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const myUsername = useAuthStore((s) => s.user?.username ?? null);
  const [searchQ, setSearchQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchWrapRef = useRef(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(searchQ.trim()), 250);
    return () => window.clearTimeout(t);
  }, [searchQ]);

  const userSearchQuery = useQuery({
    queryKey: ["flamehub", "userSearch", debouncedQ],
    enabled: debouncedQ.length > 0,
    queryFn: async () =>
      (
        await api.get("/flamehub/users/search", {
          params: { q: debouncedQ },
        })
      ).data.data,
  });

  const userRows = useMemo(
    () => (userSearchQuery.data ?? []).slice(0, 6),
    [userSearchQuery.data],
  );

  useEffect(() => {
    if (!searchOpen) return;
    const onDown = (e) => {
      const el = searchWrapRef.current;
      if (!el) return;
      if (el.contains(e.target)) return;
      setSearchOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [searchOpen]);

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
        window.innerHeight + window.scrollY >=
          document.body.offsetHeight - 500 &&
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
            data: (p?.data ?? []).map((it) =>
              it.id === post.id ? { ...it, caption: post.caption } : it,
            ),
          })),
        };
      });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["flamehub", "feed"] }),
  });

  return (
    <div className="mx-auto max-w-xl pb-20">
      {/* Header Statis / App Bar Style */}
      <div className="sticky top-12 z-20 mb-6 flex items-center justify-between border-b border-zinc-900 bg-zinc-950/80 py-2 backdrop-blur-md">
        <div className="flex w-full items-center gap-2">
          <div ref={searchWrapRef} className="relative min-w-0 flex-1">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const q = searchQ.trim();
                if (!q) return;
                navigate(
                  `${basePath}/flamehub/search?q=${encodeURIComponent(q)}`,
                );
                setSearchOpen(false);
              }}
              className="flex h-10 w-full items-center gap-2 rounded-full border border-white/10 bg-zinc-900/60 px-3 text-zinc-200 transition-colors focus-within:border-emerald-400/30"
            >
              <Search size={18} className="shrink-0 text-zinc-500" />
              <input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                onFocus={() => setSearchOpen(true)}
                placeholder="Cari profile…"
                className="h-full w-full bg-transparent text-sm font-semibold text-zinc-100 outline-none placeholder:text-zinc-600"
              />
            </form>

            {searchOpen && debouncedQ.length > 0 ? (
              <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 shadow-2xl shadow-black/40 backdrop-blur">
                {userSearchQuery.isLoading ? (
                  <div className="px-4 py-3 text-sm font-semibold text-zinc-400">
                    Searching…
                  </div>
                ) : userSearchQuery.isError ? (
                  <div className="px-4 py-3 text-sm font-semibold text-rose-300">
                    Search failed.
                  </div>
                ) : !userRows.length ? (
                  <div className="px-4 py-3 text-sm font-semibold text-zinc-400">
                    No users found.
                  </div>
                ) : (
                  <div className="p-2">
                    {userRows.map((u) => {
                      const src = toPublicUrl(u?.avatar);
                      const letter = (
                        u?.username?.[0] ??
                        u?.full_name?.[0] ??
                        "F"
                      ).toUpperCase();
                      return (
                        <Link
                          key={u.id}
                          to={`${basePath}/flamehub/u/${u.username}`}
                          onClick={() => setSearchOpen(false)}
                          className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2 hover:border-white/10 hover:bg-white/5"
                        >
                          {src ? (
                            <img
                              alt=""
                              src={src}
                              className="h-9 w-9 rounded-full object-cover ring-1 ring-emerald-400/25"
                            />
                          ) : (
                            <div className="grid h-9 w-9 place-items-center rounded-full bg-emerald-500/15 text-sm font-black text-emerald-200 ring-1 ring-emerald-400/25">
                              {letter}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="truncate text-sm font-extrabold text-zinc-100">
                              @{u.username}
                            </div>
                            {u.full_name ? (
                              <div className="truncate text-[11px] font-semibold text-zinc-400">
                                {u.full_name}
                              </div>
                            ) : null}
                          </div>
                        </Link>
                      );
                    })}
                    <Link
                      to={`${basePath}/flamehub/search?q=${encodeURIComponent(
                        debouncedQ,
                      )}`}
                      onClick={() => setSearchOpen(false)}
                      className="mt-1 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black uppercase tracking-widest text-white/70 hover:bg-white/10"
                    >
                      View all results <span className="text-white/30">↵</span>
                    </Link>
                  </div>
                )}
              </div>
            ) : null}
          </div>
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
          <p className="text-sm font-medium animate-pulse">
            Gathering latest updates...
          </p>
        </div>
      )}

      {feedQuery.isError && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center">
          <p className="text-sm font-semibold text-red-400">
            Failed to load feed
          </p>
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
              isOwner={Boolean(
                myUsername &&
                p?.user?.username &&
                myUsername === p.user.username,
              )}
              onToggleLike={(post) =>
                likeMutation.mutate({
                  postId: post.id,
                  like: !post.liked_by_me,
                })
              }
              onToggleSave={(post) =>
                saveMutation.mutate({
                  postId: post.id,
                  save: !post.saved_by_me,
                })
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
                editMutation.mutate({
                  postId: post.id,
                  caption: next.trim() || null,
                });
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
