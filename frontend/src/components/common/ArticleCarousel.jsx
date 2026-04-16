import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

function fmtDate(v) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function ArticleCarousel({
  articles,
  basePath,
  intervalMs = 6000,
}) {
  const items = useMemo(() => articles ?? [], [articles]);
  const [index, setIndex] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!items.length) return;
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, intervalMs);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [items.length, intervalMs]);

  if (!items.length) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur">
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {items.map((a, i) => (
          <Link
            key={a.id ?? i}
            to={`${basePath}/feed/${a.slug}`}
            className="h-[180px] w-full shrink-0"
          >
            <div className="relative h-full w-full overflow-hidden">
              {a.cover_image ? (
                <img
                  src={a.cover_image}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-zinc-950" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/5" />
              <div className="relative z-10 flex h-full w-full items-end p-5">
                <div className="max-w-[520px]">
                  <div className="text-[10px] font-medium uppercase tracking-widest text-zinc-300">
                    {fmtDate(a.published_at ?? a.created_at)}
                  </div>
                  <div className="mt-1 line-clamp-2 text-base font-semibold text-white">
                    {a.title}
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
        {items.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            className={[
              "h-1.5 w-1.5 rounded-full transition-colors",
              i === index
                ? "bg-[var(--accent)]"
                : "bg-zinc-600 hover:bg-zinc-500",
            ].join(" ")}
            aria-label={`Go to feed item ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
