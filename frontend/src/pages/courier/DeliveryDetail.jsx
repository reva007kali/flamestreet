import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/axios";
import OrderStatusTimeline from "@/components/order/OrderStatusTimeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DeliveryDetail() {
  const { orderNumber } = useParams();
  const navigate = useNavigate();

  const money = (v) => `Rp ${Number(v ?? 0).toLocaleString("id-ID")}`;

  const orderQuery = useQuery({
    queryKey: ["order", orderNumber],
    queryFn: async () => (await api.get(`/orders/${orderNumber}`)).data.order,
  });

  const updateStatus = useMutation({
    mutationFn: async (status) =>
      (
        await api.put(`/courier/deliveries/${orderQuery.data.id}/status`, {
          status,
        })
      ).data.order,
    onSuccess: () => orderQuery.refetch(),
  });

  if (orderQuery.isLoading)
    return <div className="text-zinc-400">Loading...</div>;
  if (orderQuery.isError)
    return <div className="text-red-300">Failed to load delivery.</div>;

  const order = orderQuery.data;
  const items = Array.isArray(order?.items) ? order.items : [];

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
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base font-semibold">
            {order.order_number}
          </CardTitle>
          <Badge>{order.status}</Badge>
        </CardHeader>
        <CardContent>
          <OrderStatusTimeline status={order.status} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Update Status</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {["delivering", "delivered"].map((s) => (
            <Button
              key={s}
              type="button"
              size="sm"
              onClick={() => updateStatus.mutate(s)}
              disabled={updateStatus.isPending}
            >
              {s}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Chat</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            className="w-full font-black uppercase tracking-widest text-[10px]"
            onClick={() => navigate(`/courier/chats/${order.order_number}`)}
          >
            Buka Chat
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Delivery</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-zinc-300">{order.delivery_address}</div>
          <div className="mt-3 text-sm text-zinc-400">
            Recipient: {order.recipient_name} ({order.recipient_phone})
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
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
                      {Number(it.quantity ?? 1) || 1}x {money(it.product_price)}
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
                            const ap = Number(m.additional_price ?? 0);
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
        </CardContent>
      </Card>
    </div>
  );
}
