import { useMemo, useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/axios";
import { X, Image as ImageIcon, Film, Plus, Loader2, ChevronLeft } from "lucide-react";

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
  const fileInputRef = useRef(null);
  const [caption, setCaption] = useState("");
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [error, setError] = useState(null);

  // Generate Previews
  useEffect(() => {
    if (!files.length) {
      setPreviews([]);
      return;
    }
    const urls = files.map(f => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [files]);

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

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
      setError(e?.response?.data?.message ?? e?.message ?? "Failed to create post");
    },
  });

  return (
    <div className="mx-auto max-w-xl pb-10">
      {/* App Bar Style Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-900 bg-zinc-950/80 py-4 backdrop-blur-md mb-6">
        <Link to={`${basePath}/flamehub`} className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors">
          <ChevronLeft size={20} />
          <span className="text-sm font-bold">Cancel</span>
        </Link>
        <h1 className="text-sm font-black uppercase tracking-widest text-white">New Post</h1>
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
                <div key={idx} className="relative aspect-[4/5] w-64 shrink-0 snap-start overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
                  <button
                    onClick={() => removeFile(idx)}
                    className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm hover:bg-black"
                  >
                    <X size={14} />
                  </button>
                  {files[idx]?.type.startsWith("video/") ? (
                    <video src={url} className="h-full w-full object-cover" />
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
            <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Tap to add photos or video</p>
            <p className="text-[10px] text-zinc-600">Max 10 photos or 1 video</p>
          </div>
        )}

        {/* Hidden Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => {
            setError(null);
            const list = Array.from(e.target.files ?? []);
            if (!list.length) return;

            const videos = list.filter((f) => f.type.startsWith("video/"));
            const images = list.filter((f) => f.type.startsWith("image/"));

            if (videos.length) {
              setFiles([videos[0]]);
            } else {
              setFiles(prev => [...prev, ...images].slice(0, 10));
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