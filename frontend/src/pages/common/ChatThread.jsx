import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/axios";
import { useEcho } from "@/components/common/RealtimeProvider";
import { useAuthStore } from "@/store/authStore";
import { Camera, Send, X, ArrowLeft } from "lucide-react";

function baseUrl() {
  return (import.meta.env.VITE_API_URL ?? "").replace(/\/api\/?$/, "");
}

function assetUrl(p) {
  if (!p) return null;
  if (/^https?:\/\//i.test(p)) return p;
  return p.startsWith("uploads/")
    ? `${baseUrl()}/${p}`
    : `${baseUrl()}/storage/${p}`;
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
        bestMeta = { w, h, q, size: blob.size, type: blob.type };
      }
      if (blob.size <= targetBytes) break;
      q = Math.max(0.35, q - 0.08);
    }

    if (best && best.size <= targetBytes) break;
  }

  if (!best) return { file, meta: null };

  const ext = best.type === "image/webp" ? "webp" : "jpg";
  const out = new File([best], `chat.${ext}`, { type: best.type });
  return { file: out, meta: bestMeta };
}

function normalizeSender(m, participants) {
  if (m?.sender) return m;
  const sid = Number(m?.sender_id);
  const s = participants.find((p) => Number(p?.id) === sid);
  if (!s) return m;
  return { ...m, sender: s };
}

export default function ChatThread({ basePath, counterpartRole }) {
  const { orderNumber } = useParams();
  const navigate = useNavigate();
  const echo = useEcho();
  const qc = useQueryClient();
  const me = useAuthStore((s) => s.user);
  const meId = Number(me?.id) || null;
  const topOffset = basePath === "/courier" ? "3.5rem" : "3.25rem";
  const bottomNavOffsetPx =
    basePath === "/member" || basePath === "/trainer"
      ? 84
      : basePath === "/courier"
        ? 64
        : 0;
  const composerBottom = `calc(env(safe-area-inset-bottom) + ${bottomNavOffsetPx}px)`;
  const contentPadBottom = `calc(env(safe-area-inset-bottom) + ${bottomNavOffsetPx + 196}px)`;

  const [text, setText] = useState("");
  const [picked, setPicked] = useState(null);
  const [pickedMeta, setPickedMeta] = useState(null);
  const [compressing, setCompressing] = useState(false);
  const [error, setError] = useState("");
  const [avatarModal, setAvatarModal] = useState(null);
  const listRef = useRef(null);
  const fileRef = useRef(null);

  const orderQuery = useQuery({
    queryKey: ["order", orderNumber],
    queryFn: async () => (await api.get(`/orders/${orderNumber}`)).data.order,
    refetchInterval: 6000,
  });

  const order = orderQuery.data;
  const orderId = order?.id;

  const participants = useMemo(() => {
    const rows = [];
    if (order?.member)
      rows.push({
        id: order.member.id,
        full_name: order.member.full_name,
        avatar: order.member.avatar,
      });
    if (order?.courier)
      rows.push({
        id: order.courier.id,
        full_name: order.courier.full_name,
        avatar: order.courier.avatar,
      });
    return rows;
  }, [order?.member, order?.courier]);

  const otherUser = useMemo(() => {
    if (!order) return null;
    if (counterpartRole === "courier") return order?.courier ?? null;
    if (counterpartRole === "member") return order?.member ?? null;
    return null;
  }, [counterpartRole, order]);

  const messagesQuery = useQuery({
    queryKey: ["orderChat", orderId],
    enabled: Boolean(orderId),
    queryFn: async () =>
      (await api.get(`/orders/${orderId}/chat/messages`)).data.messages ?? [],
  });

  const messages = useMemo(() => {
    const list = messagesQuery.data ?? [];
    return list.map((m) => normalizeSender(m, participants));
  }, [messagesQuery.data, participants]);

  const markRead = useMutation({
    mutationFn: async () => {
      if (!orderId) return;
      await api.post(`/chats/threads/${orderId}/read`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chatThreads"] });
    },
  });

  useEffect(() => {
    if (!orderId) return;
    if (!messagesQuery.isSuccess) return;
    markRead.mutate();
  }, [orderId, messagesQuery.isSuccess]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  useEffect(() => {
    if (!echo || !orderId) return;
    const channel = echo.private(`order.${orderId}`);
    channel.listen(".OrderChatMessageCreated", (e) => {
      if (!e?.id) return;
      qc.setQueryData(["orderChat", orderId], (prev) => {
        const list = Array.isArray(prev) ? prev : [];
        const id = Number(e?.id);
        if (!id) return list;
        if (list.some((m) => Number(m?.id) === id)) return list;
        return [...list, e];
      });
      if (Number(e?.sender_id) !== meId) markRead.mutate();
    });
    return () => {
      echo.leave(`order.${orderId}`);
    };
  }, [echo, orderId, qc, meId]);

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
      if (msg) {
        qc.setQueryData(["orderChat", orderId], (prev) => {
          const list = Array.isArray(prev) ? prev : [];
          const id = Number(msg?.id);
          if (!id) return list;
          if (list.some((m) => Number(m?.id) === id)) return list;
          return [...list, msg];
        });
      }
      setText("");
      setPicked(null);
      setPickedMeta(null);
      if (fileRef.current) fileRef.current.value = "";
      markRead.mutate();
      qc.invalidateQueries({ queryKey: ["chatThreads"] });
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

  if (orderQuery.isLoading) {
    return (
      <div className="min-h-screen px-2 py-2" style={{ background: "#050a06" }}>
        <div className="mx-auto max-w-lg text-[12px] text-white/50">
          Loading…
        </div>
      </div>
    );
  }

  if (orderQuery.isError) {
    return (
      <div className="min-h-screen px-2 py-2" style={{ background: "#050a06" }}>
        <div className="mx-auto max-w-lg text-[12px] text-red-400">
          Failed to load order.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-2 py-2" style={{ background: "#050a06" }}>
      <div
        className="mx-auto flex max-w-lg flex-col gap-2.5"
        style={{ paddingBottom: contentPadBottom }}
      >
        <div className="sticky z-30" style={{ top: topOffset }}>
          <div
            className="flex items-center justify-between gap-2 rounded-[18px] border border-emerald-500/10 px-3 py-2.5 backdrop-blur"
            style={{
              background:
                "linear-gradient(135deg, rgba(6,28,16,0.9) 0%, rgba(3,10,6,0.95) 100%)",
            }}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <button
                type="button"
                onClick={() => navigate(`${basePath}/chats`)}
                className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-[10px] border border-white/[0.08] bg-white/[0.06]"
              >
                <ArrowLeft size={14} className="text-white" />
              </button>
              <div className="min-w-0">
                <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/30">
                  #{order.order_number}
                </div>
                <div className="truncate text-[14px] font-black leading-tight text-white">
                  {otherUser?.full_name || "Chat"}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          ref={listRef}
          className="max-h-[66vh] overflow-y-auto rounded-[16px] border border-white/[0.07] bg-black/30 p-2.5"
        >
          {messagesQuery.isLoading ? (
            <div className="py-8 text-center text-[12px] text-white/40">
              Loading chat…
            </div>
          ) : messages.length === 0 ? (
            <div className="py-8 text-center text-[12px] text-white/40">
              Belum ada chat.
            </div>
          ) : (
            <div className="space-y-2.5">
              {messages.map((m) => {
                const mine = meId && Number(m.sender_id) === meId;
                const av = assetUrl(m?.sender?.avatar);
                const img = m.type === "image" ? assetUrl(m.image_path) : null;
                return (
                  <div
                    key={m.id}
                    className={`flex ${mine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`flex max-w-[92%] items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}
                    >
                      <button
                        type="button"
                        className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full border border-white/[0.08] bg-white/[0.06]"
                        onClick={() => {
                          if (!av) return;
                          setAvatarModal({
                            url: av,
                            name: m?.sender?.full_name || "Avatar",
                          });
                        }}
                        disabled={!av}
                      >
                        {av ? (
                          <img
                            src={av}
                            alt="avatar"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full" />
                        )}
                      </button>

                      <div
                        className={`rounded-[16px] px-3 py-2 ${
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
                              className="mt-2 max-h-64 w-full rounded-[12px] object-cover"
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
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {error && <div className="text-[11px] text-red-400">{error}</div>}

        {picked && (
          <div className="flex items-center justify-between gap-2 rounded-[14px] border border-white/[0.07] bg-white/[0.04] px-3 py-2">
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
              className="grid h-9 w-9 place-items-center rounded-[12px] border border-white/[0.08] bg-white/[0.06]"
            >
              <X size={14} className="text-white" />
            </button>
          </div>
        )}
      </div>

      <div
        className="fixed inset-x-0 z-40 border-t border-white/[0.07] bg-zinc-950/90 backdrop-blur"
        style={{ bottom: composerBottom }}
      >
        <div className="mx-auto max-w-lg px-2 py-2">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Tulis pesan…"
                rows={2}
                className="w-full resize-none rounded-[14px] border border-white/[0.07] bg-black/40 px-3 py-2 text-[12px] font-semibold text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
              <div className="mt-2 flex items-center justify-between">
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
                  className="flex items-center gap-1.5 rounded-[12px] border border-white/[0.08] bg-white/[0.06] px-3 py-2 text-[11px] font-black text-white disabled:opacity-50"
                >
                  <Camera size={14} />
                  Foto
                </button>
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
              className="grid h-[46px] w-[46px] place-items-center rounded-[16px] bg-emerald-500 text-black disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          </div>
          <div style={{ height: "env(safe-area-inset-bottom)" }} />
        </div>
      </div>

      {avatarModal?.url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onMouseDown={() => setAvatarModal(null)}
        >
          <div
            className="w-full max-w-sm rounded-[18px] border border-white/10 bg-zinc-950 p-4"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 truncate text-[12px] font-black text-white">
                {avatarModal.name}
              </div>
              <button
                type="button"
                onClick={() => setAvatarModal(null)}
                className="grid h-8 w-8 place-items-center rounded-[10px] border border-white/[0.08] bg-white/[0.06]"
              >
                <X size={14} className="text-white" />
              </button>
            </div>
            <div className="mt-3 overflow-hidden rounded-[14px] border border-white/[0.08] bg-black/40">
              <img
                src={avatarModal.url}
                alt="avatar"
                className="w-full object-cover"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
