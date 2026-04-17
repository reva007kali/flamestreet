import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { X, Send, CornerDownRight, Loader2 } from "lucide-react";

function CommentItem({ c, basePath, onReply, isReply = false }) {
  const user = c.user;
  const initial = (user?.username?.[0] ?? "U").toUpperCase();

  return (
    <div className={`flex gap-3 py-3 ${isReply ? "ml-10 border-l border-zinc-900 pl-4" : ""}`}>
      {/* Avatar Placeholder */}
      <div className={`shrink-0 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 font-bold text-zinc-400 ${isReply ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs"}`}>
        {initial}
      </div>

      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <Link
            to={`${basePath}/flamehub/u/${user?.username ?? ""}`}
            className="text-xs font-bold text-white hover:text-[var(--accent)]"
          >
            {user?.username ?? "user"}
          </Link>
          <span className="text-[10px] text-zinc-600 font-medium">2h</span>
        </div>
        
        <p className="text-sm leading-relaxed text-zinc-200">
          {c.body}
        </p>

        <button
          type="button"
          onClick={() => onReply?.(c)}
          className="text-[11px] font-bold text-zinc-500 hover:text-white transition-colors pt-1"
        >
          Reply
        </button>
      </div>
    </div>
  );
}

export default function CommentsSheet({
  basePath,
  postId,
  open,
  onClose,
}) {
  const qc = useQueryClient();
  const [replyTo, setReplyTo] = useState(null);
  const [body, setBody] = useState("");

  const commentsQuery = useInfiniteQuery({
    queryKey: ["flamehub", "comments", postId],
    enabled: Boolean(open && postId),
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
      qc.invalidateQueries({ queryKey: ["flamehub", "feed"] });
    },
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      {/* Backdrop */}
      <div 
        onClick={() => { setReplyTo(null); setBody(""); onClose?.(); }}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
      />

      {/* Sheet Content */}
      <div className="relative w-full max-w-xl bg-zinc-950 rounded-t-[2.5rem] border-t border-zinc-800 flex flex-col max-h-[92vh] animate-in slide-in-from-bottom duration-300">
        
        {/* Grab Handle */}
        <div className="mx-auto mt-4 h-1.5 w-12 rounded-full bg-zinc-800" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-900">
          <h2 className="text-base font-black text-white uppercase tracking-tight">Comments</h2>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-full bg-zinc-900 text-zinc-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Comments Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {commentsQuery.isLoading && (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-zinc-700" size={24} />
            </div>
          )}

          {comments.length === 0 && !commentsQuery.isLoading && (
            <div className="py-20 text-center">
              <p className="text-sm font-bold text-zinc-600 uppercase tracking-widest">No comments yet</p>
              <p className="text-xs text-zinc-700 mt-1">Be the first to spark the conversation.</p>
            </div>
          )}

          <div className="space-y-1">
            {(tree.get(0) ?? []).map((c) => (
              <div key={c.id}>
                <CommentItem c={c} basePath={basePath} onReply={(x) => setReplyTo(x)} />
                <div className="space-y-1">
                  {(tree.get(c.id) ?? []).map((r) => (
                    <CommentItem key={r.id} c={r} basePath={basePath} onReply={(x) => setReplyTo(x)} isReply={true} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {commentsQuery.hasNextPage && (
            <button
              type="button"
              onClick={() => commentsQuery.fetchNextPage()}
              disabled={commentsQuery.isFetchingNextPage}
              className="w-full py-4 text-[11px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
            >
              {commentsQuery.isFetchingNextPage ? "Loading more..." : "View more comments"}
            </button>
          )}
        </div>

        {/* Integrated Input Area */}
        <div className="p-4 bg-zinc-950 border-t border-zinc-900 pb-8">
          {replyTo && (
            <div className="flex items-center justify-between px-2 mb-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2 text-[11px] font-bold text-zinc-400">
                <CornerDownRight size={12} className="text-[var(--accent)]" />
                Replying to <span className="text-[var(--accent)]">@{replyTo.user?.username}</span>
              </div>
              <button onClick={() => setReplyTo(null)} className="text-[10px] font-black uppercase text-zinc-600 hover:text-white">Cancel</button>
            </div>
          )}

          <div className="relative flex items-end gap-2 bg-zinc-900/50 rounded-2xl border border-zinc-800 p-2 focus-within:border-[var(--accent)]/50 transition-all shadow-inner">
            <textarea
              className="flex-1 max-h-32 min-h-[40px] resize-none bg-transparent px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none"
              rows={1}
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
              placeholder="Add a comment..."
            />
            <button
              type="button"
              disabled={!body.trim() || createComment.isPending}
              onClick={() => createComment.mutate()}
              className="h-10 w-10 flex items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--accent-foreground)] shadow-lg shadow-[var(--accent)]/20 disabled:opacity-50 disabled:grayscale transition-all active:scale-90"
            >
              {createComment.isPending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}