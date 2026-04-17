import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { api } from "@/lib/axios";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle2,
  ChevronDown,
  MapPin,
  Package,
  Phone,
  Truck,
} from "lucide-react";

export default function Dashboard() {
  const qc = useQueryClient();
  const [expandedId, setExpandedId] = useState(null);
  const money = useMemo(
    () => (v) => `Rp ${Number(v ?? 0).toLocaleString("id-ID")}`,
    [],
  );

  const query = useQuery({
    queryKey: ["courier", "deliveries"],
    queryFn: async () => (await api.get("/courier/deliveries")).data,
    refetchInterval: 5000,
  });

  const deliveries = query.data?.data ?? [];

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }) =>
      (await api.put(`/courier/deliveries/${id}/status`, { status })).data
        .order,
    onMutate: async ({ id, status }) => {
      qc.setQueriesData({ queryKey: ["courier", "deliveries"] }, (old) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((o) => (o.id === id ? { ...o, status } : o)),
        };
      });
    },
    onSuccess: () => query.refetch(),
  });

  function normalizeMods(modifierOptions) {
    if (!Array.isArray(modifierOptions)) return [];
    const rows = modifierOptions
      .map((m) => ({
        modifier_name: m?.modifier_name ? String(m.modifier_name) : "",
        option_name: m?.option_name ? String(m.option_name) : "",
        additional_price: Number(m?.additional_price ?? 0),
      }))
      .filter((m) => m.modifier_name && m.option_name);

    const map = new Map();
    for (const r of rows) {
      const arr = map.get(r.modifier_name) ?? [];
      arr.push(r);
      map.set(r.modifier_name, arr);
    }
    return Array.from(map.entries()).map(([modifierName, opts]) => ({
      modifierName,
      opts,
    }));
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-[var(--accent)] font-bold tracking-tighter uppercase text-sm italic">
          <Truck size={16} /> Courier
        </div>
        <h1 className="text-3xl font-black tracking-tight uppercase italic">
          Deliveries
        </h1>
        <p className="text-zinc-500 text-sm font-medium">
          Pantau alamat dan detail pesanan, lalu update status pengantaran.
        </p>
      </div>

      <div className="space-y-4">
        {deliveries.map((o) => {
          const items = Array.isArray(o.items) ? o.items : [];
          const address = o.delivery_address || o.delivery_notes || "-";
          const itemsSummary = items
            .slice(0, 3)
            .map((it) => `${Number(it.quantity ?? 1) || 1}x ${it.product_name}`)
            .join(", ");
          const moreCount = Math.max(0, items.length - 3);
          const isExpanded = expandedId === o.id;
          const canDelivering =
            o.status !== "delivered" && o.status !== "delivering";
          const canDelivered = o.status === "delivering";

          return (
            <Card
              key={o.id}
              className="overflow-hidden border-zinc-800 bg-zinc-950/60"
            >
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <CardTitle className="text-base font-black text-white tracking-tight">
                        {o.recipient_name}
                      </CardTitle>
                      <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                        {o.order_number}
                      </div>
                      <Badge className="border-none bg-zinc-900/70 text-zinc-300">
                        {o.status}
                      </Badge>
                      <Badge className="border-none bg-zinc-900/70 text-zinc-400">
                        {o.payment_status}
                      </Badge>
                    </div>
                    <div className="flex items-start gap-2 text-[12px] text-zinc-400">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-zinc-600" />
                      <div className="min-w-0">{address}</div>
                    </div>
                    <div className="flex items-center gap-2 text-[12px] text-zinc-500">
                      <Package className="h-4 w-4 text-zinc-600" />
                      <span className="truncate">
                        {itemsSummary}
                        {moreCount ? ` +${moreCount} item` : ""}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 space-y-2">
                    <div className="text-right text-lg font-black text-white tabular-nums">
                      {money(o.total_amount)}
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className="font-black uppercase tracking-widest text-[10px]"
                        onClick={() =>
                          updateStatus.mutate({
                            id: o.id,
                            status: "delivering",
                          })
                        }
                        disabled={!canDelivering || updateStatus.isPending}
                      >
                        Pesanan Diantar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="font-black uppercase tracking-widest text-[10px]"
                        onClick={() =>
                          updateStatus.mutate({ id: o.id, status: "delivered" })
                        }
                        disabled={!canDelivered || updateStatus.isPending}
                      >
                        Pesanan Diterima
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0 space-y-4">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full justify-between rounded-2xl bg-zinc-900/40 border border-zinc-800 hover:bg-zinc-900 text-white font-black uppercase tracking-widest text-[10px] h-11"
                  onClick={() => setExpandedId(isExpanded ? null : o.id)}
                >
                  Detail Pesanan
                  <ChevronDown
                    size={16}
                    className={[
                      "text-zinc-500 transition-transform",
                      isExpanded ? "rotate-180" : "",
                    ].join(" ")}
                  />
                </Button>

                {isExpanded ? (
                  <div className="rounded-3xl border border-zinc-800 bg-zinc-900/20 p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4 space-y-1">
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                          Kontak
                        </div>
                        <div className="text-sm font-bold text-white flex items-center gap-2">
                          <Phone className="h-4 w-4 text-zinc-600" />{" "}
                          {o.recipient_phone || "-"}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4 space-y-1">
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                          Buka Detail
                        </div>
                        <Link
                          to={`/courier/delivery/${o.order_number}`}
                          className="inline-flex items-center gap-2 text-sm font-black text-[var(--accent)] hover:underline"
                        >
                          <CheckCircle2 className="h-4 w-4" /> Klik Detail
                          Pesanan
                        </Link>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                        Items
                      </div>
                      {items.map((it) => {
                        const mods = normalizeMods(it.modifier_options);
                        return (
                          <div
                            key={it.id}
                            className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-2"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <div className="text-sm font-black text-white truncate">
                                  {it.product_name}
                                </div>
                                <div className="text-[11px] font-semibold text-zinc-500">
                                  {Number(it.quantity ?? 1) || 1}x{" "}
                                  {money(it.product_price)}
                                </div>
                              </div>
                              <div className="shrink-0 text-right text-sm font-black text-emerald-400 tabular-nums">
                                {money(it.subtotal)}
                              </div>
                            </div>

                            {mods.length ? (
                              <div className="space-y-1">
                                {mods.map((g) => (
                                  <div
                                    key={g.modifierName}
                                    className="text-[11px] text-zinc-300"
                                  >
                                    <span className="font-black text-zinc-400 uppercase tracking-widest text-[10px]">
                                      {g.modifierName}:
                                    </span>{" "}
                                    {g.opts
                                      .map((m) => {
                                        const ap = Number(
                                          m.additional_price ?? 0,
                                        );
                                        return ap
                                          ? `${m.option_name} (+${money(ap)})`
                                          : m.option_name;
                                      })
                                      .join(", ")}
                                  </div>
                                ))}
                              </div>
                            ) : null}

                            {it.item_notes ? (
                              <div className="text-[11px] font-semibold text-zinc-400">
                                Note: {it.item_notes}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                      {!items.length ? (
                        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/50 p-10 text-center text-xs font-black uppercase tracking-widest text-zinc-600">
                          Tidak ada items.
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}

        {query.isLoading ? (
          <div className="text-sm text-zinc-400">Loading...</div>
        ) : null}
        {!query.isLoading && deliveries.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-800 bg-zinc-950/40 p-14 text-center">
            <div className="text-xs font-black uppercase tracking-widest text-zinc-600">
              Tidak ada delivery.
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
