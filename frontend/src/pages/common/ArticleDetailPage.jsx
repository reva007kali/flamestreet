import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { api } from "@/lib/axios";
import { ArrowLeft } from "lucide-react";

function fmtDate(v) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function ArticleDetailPage() {
  const { slug } = useParams();

  const query = useQuery({
    queryKey: ["article", slug],
    queryFn: async () => (await api.get(`/articles/${slug}`)).data.article,
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

  if (query.isLoading)
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
        <p className="text-sm text-zinc-400">Memuat...</p>
      </div>
    );

  if (query.isError)
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-red-400">Gagal memuat artikel</p>
        <Link
          to="/articles"
          className="text-xs font-bold text-emerald-500 underline"
        >
          Kembali
        </Link>
      </div>
    );

  const a = query.data;
  const cover = coverUrl(a.cover_image);

  return (
    <div className="min-h-screen bg-black text-white px-3 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/articles"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-zinc-900"
        >
          <ArrowLeft size={18} className="text-white" />
        </Link>
        <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
          Flame News
        </div>
      </div>

      <article className="max-w-lg mx-auto">
        <div className="mb-4">
          <div className="text-[10px] font-medium text-emerald-500 uppercase tracking-wider mb-2">
            {fmtDate(a.published_at ?? a.created_at)}
          </div>
          <h1 className="text-2xl font-bold text-white leading-tight">
            {a.title}
          </h1>
          {a.excerpt && (
            <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
              {a.excerpt}
            </p>
          )}
        </div>

        {cover && (
          <div className="overflow-hidden rounded-3xl border border-white/5 mb-6">
            <img
              src={cover}
              alt=""
              className="w-full aspect-[4/3] object-cover"
            />
          </div>
        )}

        <div
          className="prose prose-invert prose-sm max-w-none
            prose-headings:text-white prose-p:text-zinc-300
            prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:underline
            prose-img:rounded-2xl prose-img:border prose-img:border-white/10
            prose-strong:text-white
            [&>p]:leading-relaxed"
          dangerouslySetInnerHTML={{ __html: a.content_html ?? "" }}
        />
      </article>
    </div>
  );
}
