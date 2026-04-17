import { Link } from "react-router-dom";
import { toPublicUrl } from "@/lib/assets";
import { Heart, MessageCircle, Send, MoreHorizontal, Bookmark } from "lucide-react";

function fmtTimeAgo(v) {
  if (!v) return "";
  const d = new Date(v);
  const now = new Date();
  const diffInSec = Math.floor((now - d) / 1000);
  
  if (diffInSec < 60) return "Just now";
  if (diffInSec < 3600) return `${Math.floor(diffInSec / 60)}m`;
  if (diffInSec < 86400) return `${Math.floor(diffInSec / 3600)}h`;
  return `${Math.floor(diffInSec / 86400)}d`;
}

function Avatar({ user, size = "h-9 w-9" }) {
  const src = toPublicUrl(user?.avatar);
  if (src) {
    return (
      <img
        alt=""
        src={src}
        className={`${size} rounded-full object-cover border border-zinc-800`}
      />
    );
  }
  const letter = (user?.username?.[0] ?? "F").toUpperCase();
  return (
    <div className={`${size} grid place-items-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-400 border border-zinc-700`}>
      {letter}
    </div>
  );
}

function MediaCarousel({ items }) {
  const media = items ?? [];
  if (!media.length) return null;

  if (media[0]?.type === "video") {
    const src = toPublicUrl(media[0]?.path);
    return src ? (
      <div className="relative aspect-square w-full overflow-hidden bg-black">
        <video
          className="h-full w-full object-cover"
          src={src}
          controls
          playsInline
          preload="metadata"
        />
      </div>
    ) : null;
  }

  return (
    <div className="relative flex snap-x snap-mandatory overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {media.map((m) => {
        const src = toPublicUrl(m?.path);
        return (
          <div key={m.id} className="aspect-square w-full shrink-0 snap-start bg-zinc-900">
            {src && (
              <img
                alt=""
                src={src}
                className="h-full w-full object-cover"
              />
            )}
          </div>
        );
      })}
      {media.length > 1 && (
        <div className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2 py-1 text-[10px] font-bold text-white backdrop-blur">
          1/{media.length}
        </div>
      )}
    </div>
  );
}

export default function PostCard({
  post,
  basePath,
  onToggleLike,
  onOpenComments,
  liking,
  onShare,
}) {
  const user = post.user;
  const postUrl = `${basePath}/flamehub/p/${post.id}`;

  return (
    <div className="bg-zinc-950 border-b border-zinc-900 lg:border lg:border-zinc-900 lg:rounded-2xl lg:mb-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3">
        <div className="flex items-center gap-3">
          <Link to={`${basePath}/flamehub/u/${user?.username}`}>
            <Avatar user={user} />
          </Link>
          <div className="flex flex-col">
            <Link
              to={`${basePath}/flamehub/u/${user?.username}`}
              className="text-[13px] font-bold text-white hover:underline leading-none"
            >
              {user?.username}
            </Link>
            <span className="text-[11px] text-zinc-500 mt-1">
              {user?.full_name && `${user.full_name} • `}{fmtTimeAgo(post.created_at)}
            </span>
          </div>
        </div>
        <button className="text-zinc-500 hover:text-white transition-colors">
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* Media: Full Width Edge-to-Edge */}
      <div className="w-full">
        <MediaCarousel items={post.media} />
      </div>

      {/* Actions Area */}
      <div className="px-3 pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => onToggleLike?.(post)}
              disabled={liking}
              className={`transition-transform active:scale-125 ${liking ? 'opacity-50' : ''}`}
            >
              <Heart
                size={24}
                className={post.liked_by_me ? "fill-red-500 text-red-500" : "text-white"}
              />
            </button>
            <button onClick={() => onOpenComments?.(post)} className="active:opacity-60 transition-opacity">
              <MessageCircle size={24} className="text-white" />
            </button>
            <button onClick={() => onShare?.(postUrl)} className="active:opacity-60 transition-opacity">
              <Send size={24} className="text-white" />
            </button>
          </div>
          <button className="text-white">
            <Bookmark size={24} />
          </button>
        </div>

        {/* Likes Count */}
        <div className="mt-3 text-[13px] font-bold text-white tracking-tight">
          {Number(post.like_count ?? 0).toLocaleString("id-ID")} likes
        </div>

        {/* Caption */}
        {post.caption && (
          <div className="mt-1.5 text-[13px] leading-relaxed text-zinc-100">
            <Link
              to={`${basePath}/flamehub/u/${user?.username}`}
              className="font-bold mr-2 hover:underline"
            >
              {user?.username}
            </Link>
            {post.caption}
          </div>
        )}

        {/* Comments Link */}
        <button
          onClick={() => onOpenComments?.(post)}
          className="mt-2 block text-[13px] text-zinc-500 hover:text-zinc-400 transition-colors"
        >
          {post.comment_count > 0 
            ? `View all ${post.comment_count} comments` 
            : "Add a comment..."
          }
        </button>
        
        <div className="h-4" />
      </div>
    </div>
  );
}