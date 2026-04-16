import { Link } from "react-router-dom";
import { toPublicUrl } from "@/lib/assets";

function fmtDateTime(v) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Avatar({ user }) {
  const src = toPublicUrl(user?.avatar);
  if (src) {
    return (
      <img
        alt=""
        src={src}
        className="h-10 w-10 rounded-full object-cover ring-1 ring-emerald-400/25"
      />
    );
  }
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

function MediaCarousel({ items }) {
  const media = items ?? [];
  if (!media.length) return null;

  if (media[0]?.type === "video") {
    const src = toPublicUrl(media[0]?.path);
    return src ? (
      <video
        className="w-full rounded-xl bg-black/40"
        src={src}
        controls
        playsInline
        preload="metadata"
      />
    ) : null;
  }

  return (
    <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {media.map((m) => {
        const src = toPublicUrl(m?.path);
        return (
          <div key={m.id} className="w-full shrink-0 snap-start">
            {src ? (
              <img
                alt=""
                src={src}
                className="h-[360px] w-full rounded-xl object-cover"
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export default function PostCard({
  post,
  basePath,
  onToggleLike,
  liking,
  onShare,
}) {
  const user = post.user;
  const postUrl = `${basePath}/flamehub/p/${post.id}`;

  return (
    <div className="rounded-2xl border border-emerald-400/15 bg-zinc-950/50 p-4 shadow-[0_0_45px_rgba(34,197,94,0.08)] backdrop-blur">
      <div className="flex items-center gap-3">
        <Link
          to={`${basePath}/flamehub/u/${user?.username ?? ""}`}
          className="shrink-0"
        >
          <Avatar user={user} />
        </Link>
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <Link
              to={`${basePath}/flamehub/u/${user?.username ?? ""}`}
              className="truncate font-semibold text-zinc-100 hover:text-emerald-200"
            >
              @{user?.username ?? "user"}
            </Link>
            <div className="truncate text-xs text-zinc-400">
              {fmtDateTime(post.created_at)}
            </div>
          </div>
          {user?.full_name ? (
            <div className="truncate text-xs text-zinc-400">
              {user.full_name}
            </div>
          ) : null}
        </div>
      </div>

      {post.caption ? (
        <div className="mt-3 whitespace-pre-wrap text-sm text-zinc-200">
          {post.caption}
        </div>
      ) : null}

      <div className="mt-3">
        <MediaCarousel items={post.media} />
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleLike?.(post)}
            disabled={liking}
            className={[
              "rounded-xl border px-3 py-1.5 text-sm font-semibold transition",
              post.liked_by_me
                ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
                : "border-zinc-800/80 bg-zinc-900/40 text-zinc-200 hover:border-zinc-700",
            ].join(" ")}
          >
            Like{" "}
            <span className="ml-1 text-xs text-zinc-400">
              {post.like_count ?? 0}
            </span>
          </button>
          <Link
            to={postUrl}
            className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-3 py-1.5 text-sm font-semibold text-zinc-200 hover:border-zinc-700"
          >
            Comment{" "}
            <span className="ml-1 text-xs text-zinc-400">
              {post.comment_count ?? 0}
            </span>
          </Link>
        </div>

        <button
          type="button"
          onClick={() => onShare?.(postUrl)}
          className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-3 py-1.5 text-sm font-semibold text-zinc-200 hover:border-zinc-700"
        >
          Share
        </button>
      </div>
    </div>
  );
}
