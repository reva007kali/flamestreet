import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "@/lib/axios";

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

export default function Articles({ basePath }) {
  const query = useQuery({
    queryKey: ["articles", { page: 1 }],
    queryFn: async () =>
      (await api.get("/articles", { params: { limit: 20 } })).data,
  });

  const baseUrl = useMemo(() => {
    const apiUrl = import.meta.env.VITE_API_URL ?? "";
    return apiUrl.endsWith("/api") ? apiUrl.slice(0, -4) : apiUrl;
  }, []);

  function coverUrl(path) {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    if (path.startsWith("uploads/")) return `${baseUrl}/${path}`;
    return `${baseUrl}/storage/${path}`;
  }

  const rows = query.data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Feed</h1>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((a) => (
          <Link
            key={a.id}
            to={`${basePath}/feed/${a.slug}`}
            className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur hover:border-zinc-700"
          >
            <div className="relative h-[150px] w-full overflow-hidden bg-zinc-950">
              {a.cover_image ? (
                <img
                  src={coverUrl(a.cover_image)}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute bottom-3 left-3 text-[10px] uppercase tracking-widest text-zinc-300">
                {fmtDate(a.published_at ?? a.created_at)}
              </div>
            </div>
            <div className="p-4">
              <div className="line-clamp-2 font-semibold text-zinc-100">
                {a.title}
              </div>
              {a.excerpt ? (
                <div className="mt-1 line-clamp-2 text-sm text-zinc-400">
                  {a.excerpt}
                </div>
              ) : null}
            </div>
          </Link>
        ))}
        {query.isLoading ? (
          <div className="text-sm text-zinc-400">Loading...</div>
        ) : null}
        {query.isError ? (
          <div className="text-sm text-red-300">Failed to load feed.</div>
        ) : null}
      </div>
    </div>
  );
}
