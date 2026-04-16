import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/axios";

async function compressImage(file) {
  const maxDim = 1280;
  const quality = 0.82;

  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();

    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    const scale = Math.min(1, maxDim / Math.max(w, h));
    const outW = Math.max(1, Math.round(w * scale));
    const outH = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return file;

    ctx.drawImage(img, 0, 0, outW, outH);

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (!blob) return file;
    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function FlamehubCreatePost({ basePath }) {
  const navigate = useNavigate();
  const [caption, setCaption] = useState("");
  const [files, setFiles] = useState([]);
  const [error, setError] = useState(null);

  const info = useMemo(() => {
    const hasVideo = files.some((f) => f.type.startsWith("video/"));
    return hasVideo
      ? "1 video"
      : files.length
        ? `${files.length} photo`
        : "No media";
  }, [files]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!files.length) throw new Error("Media is required");
      const hasVideo = files.some((f) => f.type.startsWith("video/"));
      const finalFiles = hasVideo
        ? files.slice(0, 1)
        : await Promise.all(files.map((f) => compressImage(f)));

      const fd = new FormData();
      if (caption.trim()) fd.append("caption", caption.trim());
      finalFiles.forEach((f) => fd.append("media[]", f));
      const r = await api.post("/flamehub/posts", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return r.data?.post;
    },
    onSuccess: () => {
      navigate(`${basePath}/flamehub`, { replace: true });
    },
    onError: (e) => {
      setError(
        e?.response?.data?.message ?? e?.message ?? "Failed to create post",
      );
    },
  });

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-emerald-300/80">
            Flamehub
          </div>
          <h1 className="mt-1 text-2xl font-black text-zinc-100">New Post</h1>
        </div>
        <Link
          to={`${basePath}/flamehub`}
          className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-3 py-2 text-sm font-semibold text-zinc-200 hover:border-zinc-700"
        >
          Back
        </Link>
      </div>

      <div className="rounded-2xl border border-emerald-400/15 bg-zinc-950/50 p-4 backdrop-blur">
        <label className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Caption
        </label>
        <textarea
          className="mt-2 w-full resize-none rounded-xl border border-zinc-800/80 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-400/40"
          rows={4}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Tulis caption..."
        />

        <div className="mt-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
              Media
            </div>
            <div className="text-xs text-zinc-500">{info}</div>
          </div>

          <input
            className="mt-2 block w-full text-sm text-zinc-300 file:mr-3 file:rounded-xl file:border-0 file:bg-emerald-400/15 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-emerald-200 hover:file:bg-emerald-400/20"
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={(e) => {
              setError(null);
              const list = Array.from(e.target.files ?? []);
              const videos = list.filter((f) => f.type.startsWith("video/"));
              const images = list.filter((f) => f.type.startsWith("image/"));
              if (videos.length) {
                setFiles([videos[0]]);
                return;
              }
              setFiles(images.slice(0, 10));
            }}
          />
          <div className="mt-2 text-xs text-zinc-500">
            Maks: 10 foto atau 1 video.
          </div>
        </div>

        {error ? (
          <div className="mt-4 text-sm text-red-300">{error}</div>
        ) : null}

        <button
          type="button"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
          className="mt-5 w-full rounded-xl border border-emerald-400/35 bg-emerald-400/10 px-4 py-2.5 text-sm font-semibold text-emerald-200 shadow-[0_0_35px_rgba(34,197,94,0.12)] hover:bg-emerald-400/15 disabled:opacity-50"
        >
          {mutation.isPending ? "Posting…" : "Post"}
        </button>
      </div>
    </div>
  );
}
