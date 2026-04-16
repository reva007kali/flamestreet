import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
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

function CommentItem({ c, basePath, onReply }) {
  const user = c.user;
  return (
    <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/40 p-3">
      <div className="flex items-baseline justify-between gap-3">
        <Link
          to={`${basePath}/flamehub/u/${user?.username ?? ""}`}
          className="truncate text-sm font-semibold text-zinc-200 hover:text-emerald-200"
        >
          @{user?.username ?? "user"}
        </Link>
        <button
          type="button"
          onClick={() => onReply?.(c)}
          className="text-xs font-semibold text-emerald-200/90 hover:text-emerald-200"
        >
          Reply
        </button>
      </div>
      <div className="mt-2 whitespace-pre-wrap text-sm text-zinc-200">
        {c.body}
      </div>
    </div>
  );
}

export default function FlamehubPostDetail({ basePath }) {
  const qc = useQueryClient();
  const { id } = useParams();
  const postId = Number(id);
  const [replyTo, setReplyTo] = useState(null);
  const [body, setBody] = useState("");
  const [liking, setLiking] = useState(false);

  const postQuery = useQuery({
    queryKey: ["flamehub", "post", postId],
    enabled: Number.isFinite(postId) && postId > 0,
    queryFn: async () => (await api.get(`/flamehub/posts/${postId}`)).data.post,
  });

  const commentsQuery = useInfiniteQuery({
    queryKey: ["flamehub", "comments", postId],
    enabled: Number.isFinite(postId) && postId > 0,
    queryFn: async ({ pageParam }) => {
      const r = await api.get(`/flamehub/posts/${postId}/comments`, {
        params: { cursor: pageParam },
      });
      return r.data;
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage?.next_cursor ?? null,
  });

  const comments = useMemo(() => {
    const pages = commentsQuery.data?.pages ?? [];
    return pages.flatMap((p) => p?.data ?? []).reverse();
  }, [commentsQuery.data]);

  const tree = useMemo(() => {
    const byParent = new Map();
    for (const c of comments) {
      const key = c.parent_id ?? 0;
      const arr = byParent.get(key) ?? [];
      arr.push(c);
      byParent.set(key, arr);
    }
    return byParent;
  }, [comments]);

  const createComment = useMutation({
    mutationFn: async () => {
      const payload = { body: body.trim() };
      if (replyTo?.id) payload.parent_id = replyTo.id;
      const r = await api.post(`/flamehub/posts/${postId}/comments`, payload);
      return r.data?.comment;
    },
    onSuccess: () => {
      setBody("");
      setReplyTo(null);
      qc.invalidateQueries({ queryKey: ["flamehub", "comments", postId] });
      qc.invalidateQueries({ queryKey: ["flamehub", "post", postId] });
    },
  });

  const toggleLike = useMutation({
    mutationFn: async ({ like }) => {
      if (like) return (await api.post(`/flamehub/posts/${postId}/like`)).data;
      return (await api.delete(`/flamehub/posts/${postId}/like`)).data;
    },
    onMutate: async ({ like }) => {
      setLiking(true);
      await qc.cancelQueries({ queryKey: ["flamehub", "post", postId] });
      const prev = qc.getQueryData(["flamehub", "post", postId]);
      qc.setQueryData(["flamehub", "post", postId], (old) => {
        if (!old) return old;
        const before = Boolean(old.liked_by_me);
        const liked = Boolean(like);
        const delta = liked === before ? 0 : liked ? 1 : -1;
        return {
          ...old,
          liked_by_me: liked,
          like_count: Math.max(0, Number(old.like_count ?? 0) + delta),
        };
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["flamehub", "post", postId], ctx.prev);
    },
    onSettled: () => {
      setLiking(false);
      qc.invalidateQueries({ queryKey: ["flamehub", "post", postId] });
    },
  });

  const post = postQuery.data;
  const url = `${basePath}/flamehub/p/${postId}`;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
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

      {postQuery.isLoading ? (
        <div className="text-sm text-zinc-400">Loading…</div>
      ) : null}
      {postQuery.isError ? (
        <div className="text-sm text-red-300">Failed to load post.</div>
      ) : null}
      {post ? (
        <PostCard
          post={post}
          basePath={basePath}
          liking={liking}
          onToggleLike={() => toggleLike.mutate({ like: !post.liked_by_me })}
          onShare={() => shareLink(url)}
        />
      ) : null}

      <div className="rounded-2xl border border-emerald-400/15 bg-zinc-950/50 p-4 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
              Comments
            </div>
            {replyTo ? (
              <div className="mt-1 text-xs text-emerald-200/90">
                Replying to @{replyTo.user?.username ?? "user"}
                <button
                  type="button"
                  className="ml-2 text-xs font-semibold text-zinc-300 hover:text-zinc-200"
                  onClick={() => setReplyTo(null)}
                >
                  Cancel
                </button>
              </div>
            ) : null}
          </div>
          <div className="text-xs text-zinc-500">
            {post?.comment_count ?? 0} total
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <textarea
            className="min-h-[44px] w-full resize-none rounded-xl border border-zinc-800/80 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-400/40"
            rows={2}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={replyTo ? "Tulis balasan…" : "Tulis komentar…"}
          />
          <button
            type="button"
            disabled={!body.trim() || createComment.isPending}
            onClick={() => createComment.mutate()}
            className="shrink-0 rounded-xl border border-emerald-400/35 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-400/15 disabled:opacity-50"
          >
            Send
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {commentsQuery.isLoading ? (
            <div className="text-sm text-zinc-400">Loading…</div>
          ) : null}
          {commentsQuery.isError ? (
            <div className="text-sm text-red-300">Failed to load comments.</div>
          ) : null}

          {(tree.get(0) ?? []).map((c) => (
            <div key={c.id} className="space-y-2">
              <CommentItem
                c={c}
                basePath={basePath}
                onReply={(x) => setReplyTo(x)}
              />
              <div className="ml-5 space-y-2">
                {(tree.get(c.id) ?? []).map((r) => (
                  <CommentItem
                    key={r.id}
                    c={r}
                    basePath={basePath}
                    onReply={(x) => setReplyTo(x)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-center">
          {commentsQuery.hasNextPage ? (
            <button
              type="button"
              className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-2 text-sm font-semibold text-zinc-200 hover:border-zinc-700 disabled:opacity-50"
              onClick={() => commentsQuery.fetchNextPage()}
              disabled={commentsQuery.isFetchingNextPage}
            >
              {commentsQuery.isFetchingNextPage ? "Loading…" : "Load more"}
            </button>
          ) : (
            <div className="text-xs text-zinc-500">End of comments</div>
          )}
        </div>
      </div>
    </div>
  );
}
