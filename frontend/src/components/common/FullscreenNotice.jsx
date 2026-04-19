import { useEffect } from "react";
import { ShoppingCart, X } from "lucide-react";
import { useFullscreenNoticeStore } from "@/store/fullscreenNoticeStore";

export default function FullscreenNotice() {
  const open = useFullscreenNoticeStore((s) => s.open);
  const title = useFullscreenNoticeStore((s) => s.title);
  const subtitle = useFullscreenNoticeStore((s) => s.subtitle);
  const hide = useFullscreenNoticeStore((s) => s.hide);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") hide();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, hide]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex cursor-pointer items-center justify-center bg-black/70 px-6 backdrop-blur-sm"
      onMouseDown={hide}
      role="button"
      tabIndex={0}
    >
      <button
        type="button"
        onClick={hide}
        className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950/70 text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="w-full max-w-sm rounded-[28px] border border-zinc-800 bg-zinc-950/80 p-7 shadow-2xl ring-1 ring-white/10">
        <div className="flex items-center justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[0_0_30px_rgba(16,185,129,0.25)]">
            <ShoppingCart className="h-7 w-7" />
          </div>
        </div>
        <div className="mt-5 text-center">
          <div className="text-lg font-black text-white uppercase tracking-tight">
            {title}
          </div>
          {subtitle ? (
            <div className="mt-1 text-sm font-semibold text-zinc-400">
              {subtitle}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
