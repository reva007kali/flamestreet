import { useMemo, useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/axios";
import {
  X,
  Image as ImageIcon,
  Film,
  Plus,
  Loader2,
  ChevronLeft,
} from "lucide-react";

const MAX_MEDIA_COUNT = 10;
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_TOTAL_BYTES = 200 * 1024 * 1024;
const ALLOWED_IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_VIDEO_MIMES = new Set(["video/mp4", "video/quicktime"]);

async function compressImage(file) {
  const maxDim = 1280;
  const quality = 0.82;
  const url = URL.createObjectURL(file);
  try {
    const beforeBytes = Number(file?.size ?? 0);
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
    const out = new File([blob], name, { type: "image/jpeg" });
    if (beforeBytes > 0 && out.size >= beforeBytes) return file;
    return out;
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function FlamehubCreatePost({ basePath }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const [caption, setCaption] = useState("");
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoSeek, setVideoSeek] = useState(0);
  const [videoCoverFile, setVideoCoverFile] = useState(null);
  const [videoCoverPreview, setVideoCoverPreview] = useState(null);
  const [error, setError] = useState(null);

  // Generate Previews
  useEffect(() => {
    if (!files.length) {
      setPreviews([]);
      return;
    }
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  useEffect(() => {
    if (!files[0]?.type?.startsWith("video/")) {
      setVideoDuration(0);
      setVideoSeek(0);
      setVideoCoverFile(null);
      return;
    }
    setVideoDuration(0);
    setVideoSeek(0);
    setVideoCoverFile(null);
  }, [files]);

  useEffect(() => {
    if (!videoCoverFile) {
      setVideoCoverPreview(null);
      return;
    }
    const url = URL.createObjectURL(videoCoverFile);
    setVideoCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [videoCoverFile]);

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!files.length) throw new Error("Media is required");
      const tooBig = files.find((f) => Number(f?.size ?? 0) > MAX_FILE_BYTES);
      if (tooBig) throw new Error("File too large. Max 50MB per file.");
      const hasVideo = files.some((f) => f.type.startsWith("video/"));
      const finalFiles = hasVideo
        ? files.slice(0, 1)
        : await Promise.all(files.map((f) => compressImage(f)));
      const totalBytes = finalFiles.reduce(
        (sum, f) => sum + Number(f?.size ?? 0),
        0,
      );
      if (totalBytes > MAX_TOTAL_BYTES) {
        throw new Error(
          "Total media terlalu besar. Kurangi jumlah/ukuran file.",
        );
      }

      const fd = new FormData();
      if (caption.trim()) fd.append("caption", caption.trim());
      finalFiles.forEach((f) => fd.append("media[]", f));
      if (hasVideo && videoCoverFile) fd.append("cover", videoCoverFile);
      const r = await api.post("/flamehub/posts", fd);
      return r.data?.post;
    },
    onSuccess: () => {
      navigate(`${basePath}/flamehub`, { replace: true });
    },
    onError: (e) => {
      const status = e?.response?.status;
      if (status === 413) {
        setError(
          "Upload terlalu besar (413). Kurangi jumlah/ukuran file, atau kompres dulu.",
        );
        return;
      }
      setError(
        e?.response?.data?.message ?? e?.message ?? "Failed to create post",
      );
    },
  });

  return (
    <div className="mx-auto max-w-xl pb-10 px-3">
      {/* App Bar Style Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-900 bg-zinc-950/80 py-4 backdrop-blur-md mb-6">
        <Link
          to={`${basePath}/flamehub`}
          className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors"
        >
          <ChevronLeft size={20} />
          <span className="text-sm font-bold">Cancel</span>
        </Link>
        <h1 className="text-sm font-black uppercase tracking-widest text-white">
          New Post
        </h1>
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !files.length}
          className="text-sm font-black uppercase tracking-widest text-[var(--accent)] disabled:opacity-30"
        >
          {mutation.isPending ? "..." : "Post"}
        </button>
      </div>

      <div className="space-y-6">
        {/* Input Caption */}
        <div className="flex gap-4">
          {/* Avatar Placeholder */}
          <div className="h-10 w-10 shrink-0 rounded-full bg-zinc-800 border border-zinc-700" />
          <textarea
            className="w-full resize-none bg-transparent pt-2 text-base text-white placeholder-zinc-600 outline-none"
            rows={4}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="What's on your mind?..."
            autoFocus
          />
        </div>

        {/* Media Preview Area */}
        {previews.length > 0 ? (
          <div className="relative">
            <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
              {previews.map((url, idx) => (
                <div
                  key={idx}
                  className="relative aspect-[4/5] w-64 shrink-0 snap-start overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900"
                >
                  <button
                    onClick={() => removeFile(idx)}
                    className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm hover:bg-black"
                  >
                    <X size={14} />
                  </button>
                  {files[idx]?.type.startsWith("video/") ? (
                    <video
                      ref={videoRef}
                      src={url}
                      poster={videoCoverPreview ?? undefined}
                      className="h-full w-full object-cover"
                      controls
                      playsInline
                      preload="metadata"
                      onLoadedMetadata={(e) => {
                        const d = Number(e.currentTarget?.duration ?? 0) || 0;
                        setVideoDuration(d);
                        setVideoSeek(0);
                      }}
                    />
                  ) : (
                    <img src={url} className="h-full w-full object-cover" />
                  )}
                </div>
              ))}
              {files.length < 10 && !files[0]?.type.startsWith("video/") && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex aspect-[4/5] w-64 shrink-0 items-center justify-center rounded-2xl border-2 border-dashed border-zinc-800 bg-zinc-950 text-zinc-600 hover:border-zinc-700 hover:text-zinc-400 transition-all"
                >
                  <Plus size={32} />
                </button>
              )}
            </div>
            {files[0]?.type?.startsWith("video/") ? (
              <div className="mt-3 space-y-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
                        Video Cover
                      </div>
                      <div className="mt-1 text-[12px] font-semibold text-white/60">
                        Geser timeline, lalu ambil cover dari frame.
                      </div>
                    </div>
                    {videoCoverFile ? (
                      <button
                        type="button"
                        onClick={() => setVideoCoverFile(null)}
                        className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-white/70 hover:bg-white/10"
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>

                  {videoDuration > 0 ? (
                    <div className="mt-4 space-y-3">
                      <input
                        type="range"
                        min={0}
                        max={videoDuration}
                        step={0.05}
                        value={videoSeek}
                        onChange={(e) => {
                          const v = Number(e.target.value) || 0;
                          setVideoSeek(v);
                          const el = videoRef.current;
                          if (el) el.currentTime = v;
                        }}
                        className="w-full accent-[var(--accent)]"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          const el = videoRef.current;
                          if (!el) return;
                          try {
                            const w = Number(el.videoWidth ?? 0) || 0;
                            const h = Number(el.videoHeight ?? 0) || 0;
                            if (!w || !h) return;
                            const canvas = document.createElement("canvas");
                            canvas.width = w;
                            canvas.height = h;
                            const ctx = canvas.getContext("2d");
                            if (!ctx) return;
                            ctx.drawImage(el, 0, 0, w, h);
                            const blob = await new Promise((resolve) =>
                              canvas.toBlob(resolve, "image/jpeg", 0.85),
                            );
                            if (!blob) return;
                            const file = new File(
                              [blob],
                              `cover_${Date.now()}.jpg`,
                              { type: "image/jpeg" },
                            );
                            setVideoCoverFile(file);
                          } catch {
                            setError("Gagal ambil cover video.");
                          }
                        }}
                        className="w-full rounded-2xl bg-[var(--accent)] py-3 text-[11px] font-black uppercase tracking-[0.2em] text-[var(--accent-foreground)] hover:brightness-110 active:scale-[0.98] transition-all"
                      >
                        Ambil cover dari frame
                      </button>
                    </div>
                  ) : (
                    <div className="mt-4 text-[12px] font-semibold text-white/45">
                      Memuat metadata video…
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          /* Empty State Picker */
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex h-64 w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-zinc-900 bg-zinc-950/50 hover:bg-zinc-900/30 transition-all"
          >
            <div className="flex gap-4 text-zinc-700">
              <ImageIcon size={40} />
              <Film size={40} />
            </div>
            <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">
              Tap to add photos or video
            </p>
            <p className="text-[10px] text-zinc-600">
              Max 10 photos or 1 video
            </p>
          </div>
        )}

        {/* Hidden Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
          multiple
          className="hidden"
          onChange={(e) => {
            setError(null);
            const list = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (!list.length) return;

            const videos = list.filter((f) => ALLOWED_VIDEO_MIMES.has(f.type));
            const images = list.filter((f) => ALLOWED_IMAGE_MIMES.has(f.type));

            if (videos.length) {
              if (videos[0].size > MAX_FILE_BYTES) {
                setError("Video terlalu besar. Maks 50MB.");
                return;
              }
              if (videos[0].size > MAX_TOTAL_BYTES) {
                setError("Total media terlalu besar.");
                return;
              }
              setVideoCoverFile(null);
              setFiles([videos[0]]);
            } else {
              const next = [...images].slice(0, MAX_MEDIA_COUNT);
              const tooBigImage = next.find((f) => f.size > MAX_FILE_BYTES);
              if (tooBigImage) {
                setError("Foto terlalu besar. Maks 50MB per file.");
                return;
              }
              setVideoCoverFile(null);
              setFiles((prev) => {
                const merged = [...prev, ...next].slice(0, MAX_MEDIA_COUNT);
                const totalBytes = merged.reduce(
                  (sum, f) => sum + Number(f?.size ?? 0),
                  0,
                );
                if (totalBytes > MAX_TOTAL_BYTES) {
                  setError(
                    "Total media terlalu besar. Kurangi jumlah/ukuran file.",
                  );
                  return prev;
                }
                return merged;
              });
            }
          }}
        />

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm font-medium text-red-400">
            {error}
          </div>
        )}

        {/* Action Button */}
        <div className="pt-4">
          <button
            type="button"
            disabled={mutation.isPending || !files.length}
            onClick={() => mutation.mutate()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] py-4 text-sm font-black uppercase tracking-[0.2em] text-[var(--accent-foreground)] shadow-xl shadow-[var(--accent)]/10 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                <span>Publishing...</span>
              </>
            ) : (
              <span>Share to Flamehub</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
