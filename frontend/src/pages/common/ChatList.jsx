import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "@/lib/axios";
import { MessageCircle } from "lucide-react";

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

function fmtTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function previewText(last) {
  if (!last) return "Belum ada chat";
  if (last.type === "image") return "[Foto]";
  const b = String(last.body ?? "").trim();
  return b || "Pesan";
}

export default function ChatList({ basePath }) {
  const topOffset = basePath === "/courier" ? "3.5rem" : "3.25rem";
  const q = useQuery({
    queryKey: ["chatThreads"],
    queryFn: async () => (await api.get("/chats/threads")).data.threads ?? [],
    refetchInterval: 6000,
  });

  const threads = q.data ?? [];
  const totalUnread = useMemo(
    () =>
      threads.reduce((sum, t) => sum + (Number(t?.unread_count ?? 0) || 0), 0),
    [threads],
  );

  return (
    <div className="min-h-screen px-2 py-2" style={{ background: "#050a06" }}>
      <div className="mx-auto flex max-w-lg flex-col gap-3 pb-[calc(env(safe-area-inset-bottom)+6rem)]">
        <div className="sticky z-30" style={{ top: topOffset }}>
          <div
            className="flex items-center justify-between gap-3 rounded-[18px] border border-emerald-500/10 px-3 py-2.5 backdrop-blur"
            style={{
              background:
                "linear-gradient(135deg, rgba(6,28,16,0.9) 0%, rgba(3,10,6,0.95) 100%)",
            }}
          >
            <div className="min-w-0">
              <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/30">
                Chats
              </div>
              <div className="truncate text-[16px] font-black leading-tight text-white">
                Chat List
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="https://wa.me/6285182841385"
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[10px] font-black text-white"
              >
                WhatsApp
              </a>
              {totalUnread > 0 && (
                <div className="rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-black text-black">
                  {totalUnread}
                </div>
              )}
            </div>
          </div>
        </div>

        {q.isLoading ? (
          <div className="rounded-[16px] border border-white/[0.07] bg-white/[0.04] p-4 text-[12px] text-white/50">
            Loading…
          </div>
        ) : threads.length === 0 ? (
          <div className="rounded-[16px] border border-white/[0.07] bg-white/[0.04] p-4 text-[12px] text-white/50">
            Belum ada chat.
          </div>
        ) : (
          <div className="space-y-2.5">
            {threads.map((t) => {
              const other = t?.other_user ?? null;
              const av = assetUrl(other?.avatar);
              const to = `${basePath}/chats/${encodeURIComponent(t.order_number)}`;
              const unread = Number(t?.unread_count ?? 0) || 0;
              const last = t?.last_message ?? null;
              return (
                <Link
                  key={t.order_id}
                  to={to}
                  className="block rounded-[16px] border border-white/[0.07] bg-white/[0.04] px-3.5 py-3 hover:bg-white/[0.06]"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-full border border-white/[0.08] bg-black/40">
                      {av ? (
                        <img
                          src={av}
                          alt="avatar"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-[12px] font-black text-white/60">
                          <MessageCircle size={16} />
                        </div>
                      )}
                      {unread > 0 && (
                        <div className="absolute -right-1 -top-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-black text-black">
                          {unread}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate text-[12px] font-black text-white">
                          {other?.full_name || "Chat"}
                        </div>
                        <div className="flex-shrink-0 text-[10px] font-bold text-white/25">
                          {fmtTime(last?.created_at)}
                        </div>
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-white/50">
                        #{t.order_number} • {previewText(last)}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
