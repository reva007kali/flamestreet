import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";
import { Camera, Send, X } from "lucide-react";

function baseUrl() {
  return (import.meta.env.VITE_API_URL ?? "").replace(/\/api\/?$/, "");
}

function imageUrl(p) {
  if (!p) return null;
  if (/^https?:\/\//i.test(p)) return p;
  return `${baseUrl()}/storage/${p}`;
}

function pad2(v) {
  const n = Number(v) || 0;
  return String(n).padStart(2, "0");
}

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

async function loadImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await new Promise((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), type, quality);
  });
}

async function compressForChat(file) {
  const img = await loadImage(file);
  const maxDimSteps = [1280, 1024, 800];
  const targetBytes = 220 * 1024;
  const type = (() => {
    const c = document.createElement("canvas");
    const ok = c.toDataURL("image/webp").startsWith("data:image/webp");
    return ok ? "image/webp" : "image/jpeg";
  })();

  let best = null;
  let bestMeta = null;

  for (const maxDim of maxDimSteps) {
    const w0 = img.naturalWidth || img.width || 1;
    const h0 = img.naturalHeight || img.height || 1;
    const scale = Math.min(1, maxDim / Math.max(w0, h0));
    const w = Math.max(1, Math.round(w0 * scale));
    const h = Math.max(1, Math.round(h0 * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) continue;
    ctx.drawImage(img, 0, 0, w, h);

    let q = 0.72;
    for (let i = 0; i < 7; i++) {
      const blob = await canvasToBlob(canvas, type, q);
      if (!blob) break;
      if (!best || blob.size < best.size) {
        best = blob;
        bestMeta = { w, h, q };
      }
      if (blob.size <= targetBytes) break;
      q = Math.max(0.35, q - 0.08);
    }

    if (best && best.size <= targetBytes) break;
  }

  if (!best) return { file, meta: null };

  const ext = best.type === "image/webp" ? "webp" : "jpg";
  const out = new File([best], `chat.${ext}`, { type: best.type });
  return {
    file: out,
    meta: bestMeta ? { ...bestMeta, size: best.size, type: best.type } : null,
  };
}

function upsertMessage(prev, msg) {
  const list = Array.isArray(prev?.messages) ? prev.messages : [];
  const id = Number(msg?.id);
  if (!id) return { messages: list };
  if (list.some((m) => Number(m?.id) === id)) return { messages: list };
  return { messages: [...list, msg] };
}

export default function OrderChatPanel({ orderId }) {
  const qc = useQueryClient();
  const me = useAuthStore((s) => s.user);
  const meId = Number(me?.id) || null;

  const [text, setText] = useState("");
  const [picked, setPicked] = useState(null);
  const [pickedMeta, setPickedMeta] = useState(null);
  const [compressing, setCompressing] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef(null);
  const fileRef = useRef(null);

  const q = useQuery({
    queryKey: ["orderChat", orderId],
    enabled: Boolean(orderId),
    queryFn: async () =>
      (await api.get(`/orders/${orderId}/chat/messages`)).data,
    staleTime: 5000,
  });

  const messages = useMemo(() => q.data?.messages ?? [], [q.data]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const send = useMutation({
    mutationFn: async () => {
      setError("");
      const fd = new FormData();
      const v = String(text ?? "").trim();
      if (v) fd.append("body", v);
      if (picked) fd.append("image", picked);
      const r = await api.post(`/orders/${orderId}/chat/messages`, fd);
      return r.data?.message;
    },
    onSuccess: (msg) => {
      if (msg)
        qc.setQueryData(["orderChat", orderId], (prev) =>
          upsertMessage(prev, msg),
        );
      setText("");
      setPicked(null);
      setPickedMeta(null);
      if (fileRef.current) fileRef.current.value = "";
    },
    onError: (e) => {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.errors?.order?.[0] ||
        e?.response?.data?.errors?.body?.[0] ||
        "Gagal mengirim pesan.";
      setError(String(msg));
    },
  });

  const canSend =
    Boolean(orderId) &&
    !send.isPending &&
    !compressing &&
    (String(text ?? "").trim() || picked);

  return (
    <div className="px-3.5 py-3">
      <div
        ref={listRef}
        className="max-h-[320px] overflow-y-auto rounded-[12px] border border-white/[0.07] bg-black/30 p-2"
      >
        {q.isLoading ? (
          <div className="py-6 text-center text-[11px] text-white/35">
            Loading chat…
          </div>
        ) : messages.length === 0 ? (
          <div className="py-6 text-center text-[11px] text-white/35">
            Belum ada chat.
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((m) => {
              const mine = meId && Number(m.sender_id) === meId;
              const img = m.type === "image" ? imageUrl(m.image_path) : null;
              return (
                <div
                  key={m.id}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[82%] rounded-[14px] px-3 py-2 ${
                      mine
                        ? "bg-emerald-500 text-black"
                        : "border border-white/[0.08] bg-white/[0.05] text-white"
                    }`}
                  >
                    {m.body && (
                      <div
                        className={`whitespace-pre-line text-[12px] font-semibold leading-relaxed ${mine ? "text-black" : "text-white"}`}
                      >
                        {m.body}
                      </div>
                    )}
                    {img && (
                      <a
                        href={img}
                        target="_blank"
                        rel="noreferrer"
                        className="block"
                      >
                        <img
                          src={img}
                          alt="chat"
                          className="mt-2 max-h-56 w-full rounded-[10px] object-cover"
                          loading="lazy"
                        />
                      </a>
                    )}
                    <div
                      className={`mt-1 text-[9px] font-bold ${mine ? "text-black/60" : "text-white/30"}`}
                    >
                      {formatTime(m.created_at)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {error && <div className="mt-2 text-[11px] text-red-400">{error}</div>}

      {picked && (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-[12px] border border-white/[0.07] bg-white/[0.04] px-2.5 py-2">
          <div className="min-w-0">
            <div className="truncate text-[11px] font-bold text-white/80">
              Foto siap dikirim
            </div>
            {pickedMeta?.size ? (
              <div className="mt-0.5 text-[10px] text-white/35">
                {Math.round(pickedMeta.size / 1024)} KB • {pickedMeta.w}×
                {pickedMeta.h}
              </div>
            ) : (
              <div className="mt-0.5 text-[10px] text-white/35">
                {Math.round((picked.size ?? 0) / 1024)} KB
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setPicked(null);
              setPickedMeta(null);
              if (fileRef.current) fileRef.current.value = "";
            }}
            className="grid h-8 w-8 place-items-center rounded-[10px] border border-white/[0.08] bg-white/[0.06]"
          >
            <X size={14} className="text-white" />
          </button>
        </div>
      )}

      <div className="mt-3 flex items-end gap-2">
        <div className="flex-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Tulis pesan…"
            rows={2}
            className="w-full resize-none rounded-[12px] border border-white/[0.07] bg-black/40 px-3 py-2 text-[12px] font-semibold text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setError("");
                  setCompressing(true);
                  try {
                    const r = await compressForChat(f);
                    setPicked(r.file);
                    setPickedMeta(r.meta);
                  } catch {
                    setPicked(f);
                    setPickedMeta(null);
                  } finally {
                    setCompressing(false);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={compressing || send.isPending}
                className="flex items-center gap-1.5 rounded-[10px] border border-white/[0.08] bg-white/[0.06] px-2.5 py-2 text-[11px] font-bold text-white disabled:opacity-50"
              >
                <Camera size={13} />
                Foto
              </button>
            </div>
            {compressing && (
              <div className="text-[10px] font-bold text-white/30">
                Compress…
              </div>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => send.mutate()}
          disabled={!canSend}
          className="grid h-[42px] w-[42px] place-items-center rounded-[14px] bg-emerald-500 text-black disabled:opacity-40"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
