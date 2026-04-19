import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { Link } from "react-router-dom";
import { ArrowLeft, Flame, Info, UtensilsCrossed } from "lucide-react";
import { useMemo } from "react";

function fmt(n) {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v)) return "0";
  return v.toLocaleString("id-ID", { maximumFractionDigits: 1 });
}

function Ring({ valueText, label }) {
  return (
    <div className="relative grid place-items-center">
      <div className="h-[110px] w-[110px] rounded-full bg-[conic-gradient(from_90deg,rgba(9,221,97,0.95),rgba(9,221,97,0.2),rgba(9,221,97,0.95))] p-[3px]">
        <div className="grid h-full w-full place-items-center rounded-full bg-[#060a07]">
          <div className="text-center">
            <div className="text-[22px] font-black leading-none tabular-nums text-white">
              {valueText}
            </div>
            <div className="mt-[3px] text-[9px] font-black uppercase tracking-[0.2em] text-white/40">
              {label}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Nutrition() {
  const q = useQuery({
    queryKey: ["member", "nutrition", "weekly"],
    queryFn: async () => (await api.get("/member/nutrition/weekly")).data,
    staleTime: 20_000,
  });

  const totals = q.data?.totals ?? null;
  const days = q.data?.days ?? {};
  const byProduct = q.data?.by_product ?? [];

  const dayList = useMemo(() => {
    const entries = Object.entries(days ?? {});
    return entries.map(([date, v]) => ({ date, ...v }));
  }, [days]);

  const fmtDay = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString("id-ID", {
      weekday: "short",
      day: "2-digit",
      month: "short",
    });
  };

  const fmtRangeDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-[420px] flex-col gap-[10px] px-3 pb-24 pt-3 text-white">
      <div className="flex items-center gap-[10px] rounded-[20px] border border-emerald-400/10 bg-[linear-gradient(135deg,rgba(6,28,16,0.92)_0%,rgba(3,10,6,0.96)_100%)] px-[14px] py-[10px]">
        <Link
          to="/member"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5"
        >
          <ArrowLeft className="h-[15px] w-[15px]" />
        </Link>
        <div className="min-w-0">
          <div className="truncate text-base font-black leading-tight tracking-tight">
            Weekly Nutrition
          </div>
          <div className="mt-0.5 truncate text-[10px] font-semibold text-white/30">
            7 hari terakhir · order paid
          </div>
        </div>
        <div className="ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-emerald-400/25 bg-emerald-400/15">
          <Flame className="h-[18px] w-[18px] text-emerald-400" />
        </div>
      </div>

      <div className="overflow-hidden rounded-[20px] border border-emerald-400/15 bg-[linear-gradient(145deg,rgba(6,28,16,0.95)_0%,rgba(3,12,8,0.98)_100%)]">
        <div className="flex items-center gap-3 px-4 pb-3 pt-3.5">
          <Ring valueText={fmt(totals?.kcal)} label="kcal" />

          <div className="grid flex-1 grid-cols-3 overflow-hidden rounded-[14px] border border-white/10 bg-black/30">
            <div className="border-r border-white/5 px-2 py-2.5 text-center">
              <div className="text-[9px] font-black uppercase tracking-[0.1em] text-white/30">
                Protein
              </div>
              <div className="mt-1 text-[13px] font-black text-white">
                {fmt(totals?.protein_g)}
                <span className="text-[9px] font-bold text-white/35">g</span>
              </div>
            </div>
            <div className="border-r border-white/5 px-2 py-2.5 text-center">
              <div className="text-[9px] font-black uppercase tracking-[0.1em] text-white/30">
                Carbs
              </div>
              <div className="mt-1 text-[13px] font-black text-white">
                {fmt(totals?.carbs_g)}
                <span className="text-[9px] font-bold text-white/35">g</span>
              </div>
            </div>
            <div className="px-2 py-2.5 text-center">
              <div className="text-[9px] font-black uppercase tracking-[0.1em] text-white/30">
                Fat
              </div>
              <div className="mt-1 text-[13px] font-black text-white">
                {fmt(totals?.fat_g)}
                <span className="text-[9px] font-bold text-white/35">g</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-[14px] mb-[14px] flex items-start gap-2 rounded-xl border border-emerald-400/10 bg-emerald-400/5 px-[11px] py-[9px]">
          <Info className="mt-0.5 h-[13px] w-[13px] shrink-0 text-emerald-400/80" />
          <span className="text-[10px] font-semibold leading-relaxed text-white/40">
            Angka berasal dari nutrisi produk × quantity, dijumlahkan dari order
            paid.
          </span>
        </div>
      </div>

      <div className="overflow-hidden rounded-[20px] border border-white/10 bg-[linear-gradient(145deg,rgba(16,16,20,0.97)_0%,rgba(8,8,10,0.99)_100%)]">
        <div className="flex items-center justify-between border-b border-white/5 px-[14px] pb-[10px] pt-3">
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/25">
            Daily
          </div>
          <div className="text-[10px] font-bold text-white/25">
            {fmtRangeDate(q.data?.range?.start)} →{" "}
            {fmtRangeDate(q.data?.range?.end)}
          </div>
        </div>

        <div>
          {dayList.map((d) => (
            <div
              key={d.date}
              className="flex items-center justify-between gap-2 border-b border-white/5 px-[14px] py-[10px] last:border-b-0"
            >
              <div className="text-[11px] font-bold text-white/50">
                {fmtDay(d.date)}
              </div>
              <div className="flex items-center gap-[10px]">
                <div className="text-xs font-black text-white">
                  {fmt(d.kcal)} kcal
                </div>
                <div className="text-[10px] font-bold text-white/30">
                  {fmt(d.protein_g)}p • {fmt(d.carbs_g)}c • {fmt(d.fat_g)}f
                </div>
              </div>
            </div>
          ))}

          {!dayList.length && !q.isLoading ? (
            <div className="px-[14px] py-8 text-center text-xs font-semibold text-white/45">
              Belum ada data harian minggu ini.
            </div>
          ) : null}
        </div>
      </div>

      <div className="overflow-hidden rounded-[20px] border border-white/10 bg-[linear-gradient(145deg,rgba(16,16,20,0.97)_0%,rgba(8,8,10,0.99)_100%)]">
        <div className="flex items-center justify-between border-b border-white/5 px-[14px] pb-[10px] pt-3">
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/25">
            Top Items
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-white/25">
            <UtensilsCrossed className="h-4 w-4 text-emerald-400/90" />
            by calories
          </div>
        </div>

        <div>
          {byProduct.slice(0, 10).map((p, idx) => (
            <div
              key={p.product_id}
              className="flex items-center justify-between gap-[10px] border-b border-white/5 px-[14px] py-[10px] last:border-b-0"
            >
              <div
                className={[
                  "w-4 shrink-0 text-center text-[11px] font-black",
                  idx < 3 ? "text-emerald-400/70" : "text-white/20",
                ].join(" ")}
              >
                {idx + 1}
              </div>

              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-extrabold text-white">
                  {p.name}
                </div>
                <div className="mt-0.5 text-[10px] font-semibold text-white/30">
                  {fmt(p.qty)}x • {fmt(p.protein_g)}p • {fmt(p.carbs_g)}c •{" "}
                  {fmt(p.fat_g)}f
                </div>
              </div>

              <div className="shrink-0 text-right">
                <div className="text-[13px] font-black text-emerald-400/90">
                  {fmt(p.kcal)}
                </div>
                <div className="text-[9px] font-black uppercase tracking-[0.15em] text-white/25">
                  kcal
                </div>
              </div>
            </div>
          ))}

          {!byProduct.length && !q.isLoading ? (
            <div className="px-[14px] py-10 text-center">
              <div className="text-sm font-black text-white">
                Belum ada data minggu ini
              </div>
              <div className="mt-1 text-xs font-semibold text-white/45">
                Buat order dan pastikan statusnya paid.
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
