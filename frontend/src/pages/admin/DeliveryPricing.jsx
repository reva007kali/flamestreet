import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BadgeDollarSign, Save, SlidersHorizontal } from "lucide-react";

function getSetting(settings, key, fallback = "") {
  const row = (settings ?? []).find((s) => s.key === key);
  if (!row) return fallback;
  return row.value ?? fallback;
}

export default function DeliveryPricing() {
  const [saved, setSaved] = useState(false);

  const query = useQuery({
    queryKey: ["admin", "point-settings"],
    queryFn: async () => (await api.get("/admin/point-settings")).data,
  });

  const settings = query.data?.settings ?? [];

  const [perMeter, setPerMeter] = useState("");
  const [minFee, setMinFee] = useState("");
  const [maxFee, setMaxFee] = useState("");

  useEffect(() => {
    if (!query.data) return;
    setPerMeter(getSetting(settings, "delivery_fee_per_meter", "2"));
    setMinFee(getSetting(settings, "delivery_min_fee", "0"));
    setMaxFee(getSetting(settings, "delivery_max_fee", "0"));
  }, [query.data, settings]);

  const calcPreview = useMemo(() => {
    const rate = Number(perMeter) || 0;
    const min = Number(minFee) || 0;
    const max = Number(maxFee) || 0;
    const distances = [500, 1500, 3500, 8000];
    const rows = distances.map((m) => {
      let fee = m * rate;
      if (min > 0) fee = Math.max(min, fee);
      if (max > 0) fee = Math.min(max, fee);
      return { m, fee: Math.round(fee) };
    });
    return { rate, min, max, rows };
  }, [perMeter, minFee, maxFee]);

  const save = useMutation({
    mutationFn: async () => {
      setSaved(false);
      const payload = {
        settings: [
          {
            key: "delivery_fee_per_meter",
            value: String(perMeter ?? "").trim() || "0",
            description: "Ongkir per meter (Rp/m)",
          },
          {
            key: "delivery_min_fee",
            value: String(minFee ?? "").trim() || "0",
            description: "Minimum ongkir (Rp), 0 = no min",
          },
          {
            key: "delivery_max_fee",
            value: String(maxFee ?? "").trim() || "0",
            description: "Maximum ongkir (Rp), 0 = no max",
          },
        ],
      };
      return (await api.put("/admin/point-settings", payload)).data;
    },
    onSuccess: () => {
      setSaved(true);
      query.refetch();
      window.setTimeout(() => setSaved(false), 1500);
    },
  });

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20 px-4 sm:px-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-900 pb-8">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white flex items-center gap-3">
            <BadgeDollarSign className="h-8 w-8 text-[var(--accent)]" />
            Delivery Pricing
          </h1>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">
            Atur rate ongkir berdasarkan jarak (nearest branch → lokasi user)
          </p>
        </div>
        <Button
          className="rounded-2xl bg-[var(--accent)] text-[var(--accent-foreground)] font-black uppercase tracking-widest px-6 py-6"
          onClick={() => save.mutate()}
          disabled={save.isPending}
          type="button"
        >
          {save.isPending ? (
            "Saving..."
          ) : (
            <span className="flex items-center gap-2">
              <Save size={16} /> Save
            </span>
          )}
        </Button>
      </div>

      {saved ? (
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-200">
          Saved.
        </div>
      ) : null}

      <Card className="bg-zinc-950 border-zinc-800 shadow-2xl overflow-hidden rounded-[2rem]">
        <CardHeader className="bg-zinc-900/30 border-b border-zinc-900 px-6 py-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-[var(--accent)]" />
            <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">
              Settings
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid gap-6 md:grid-cols-12">
            <div className="md:col-span-4 space-y-2">
              <Label className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">
                Fee per meter (Rp/m)
              </Label>
              <Input
                className="bg-zinc-900 border-zinc-800 h-11"
                value={perMeter}
                onChange={(e) => setPerMeter(e.target.value)}
                placeholder="2"
              />
            </div>
            <div className="md:col-span-4 space-y-2">
              <Label className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">
                Minimum fee (Rp)
              </Label>
              <Input
                className="bg-zinc-900 border-zinc-800 h-11"
                value={minFee}
                onChange={(e) => setMinFee(e.target.value)}
                placeholder="0"
              />
              <div className="text-[10px] font-semibold text-zinc-600">
                0 = tidak ada minimum
              </div>
            </div>
            <div className="md:col-span-4 space-y-2">
              <Label className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">
                Maximum fee (Rp)
              </Label>
              <Input
                className="bg-zinc-900 border-zinc-800 h-11"
                value={maxFee}
                onChange={(e) => setMaxFee(e.target.value)}
                placeholder="0"
              />
              <div className="text-[10px] font-semibold text-zinc-600">
                0 = tidak ada maximum
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-zinc-950 border-zinc-800 shadow-2xl overflow-hidden rounded-[2rem]">
        <CardHeader className="bg-zinc-900/30 border-b border-zinc-900 px-6 py-4">
          <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">
            Preview
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid gap-3">
            {calcPreview.rows.map((r) => (
              <div
                key={r.m}
                className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/30 px-4 py-3"
              >
                <div className="text-xs font-bold text-zinc-400">
                  {(r.m / 1000).toFixed(1)} km
                </div>
                <div className="text-sm font-black text-white tabular-nums">
                  Rp {Number(r.fee).toLocaleString("id-ID")}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
