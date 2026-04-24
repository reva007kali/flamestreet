import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "@/lib/axios";
import { ArrowLeft, Newspaper } from "lucide-react";

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

export default function ArticlesList() {
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
    <div className="min-h-screen bg-black text-white px-3 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-zinc-900"
        >
          <ArrowLeft size={18} className="text-white" />
        </Link>
        <h1 className="text-xl font-bold text-white">Flame News</h1>
      </div>

      {query.isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          <p className="text-sm text-zinc-400">Memuat berita...</p>
        </div>
      ) : query.isError ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <p className="text-sm text-red-400">Gagal memuat berita</p>
          <button
            onClick={() => query.refetch()}
            className="text-xs font-bold text-emerald-500 underline"
          >
            Coba lagi
          </button>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Newspaper size={48} className="text-zinc-700" />
          <p className="text-sm text-zinc-500">Belum ada berita</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {rows.map((a) => (
            <Link
              key={a.id}
              to={`/articles/${a.slug}`}
              className="group"
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-zinc-900 border border-white/5 transition-transform group-active:scale-95">
                {a.cover_image ? (
                  <img
                    src={coverUrl(a.cover_image)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-zinc-800" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <div className="text-[10px] font-medium text-zinc-300 uppercase tracking-wider mb-1">
                    {fmtDate(a.published_at ?? a.created_at)}
                  </div>
                  <div className="line-clamp-2 text-[10px] font-bold text-white leading-tight">
                    {a.title}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
