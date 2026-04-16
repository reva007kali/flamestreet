import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
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

export default function ArticleDetail({ basePath }) {
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
    return <div className="text-sm text-zinc-400">Loading...</div>;
  if (query.isError)
    return <div className="text-sm text-red-300">Failed to load feed.</div>;

  const a = query.data;
  const cover = coverUrl(a.cover_image);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to={`${basePath}/feed`}
          className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)]"
        >
          Back
        </Link>
        <div className="text-xs uppercase tracking-widest text-zinc-500">
          {fmtDate(a.published_at ?? a.created_at)}
        </div>
      </div>

      <div className="space-y-3">
        <h1 className="text-2xl font-semibold text-zinc-100">{a.title}</h1>
        {a.excerpt ? <div className="text-zinc-400">{a.excerpt}</div> : null}
      </div>

      {cover ? (
        <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950">
          <img src={cover} alt="" className="h-[220px] w-full object-cover" />
        </div>
      ) : null}

      <div
        className="prose prose-invert max-w-none rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-5 backdrop-blur"
        dangerouslySetInnerHTML={{ __html: a.content_html ?? "" }}
      />
    </div>
  );
}
