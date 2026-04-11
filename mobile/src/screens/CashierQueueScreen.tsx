import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Linking, Pressable, RefreshControl, Text, View } from "react-native";
import { api } from "../lib/api";
import { usePullToRefresh } from "../lib/usePullToRefresh";
import { useOrderQueueStore } from "../store/orderQueueStore";
import Button from "../ui/Button";
import Card from "../ui/Card";
import Screen from "../ui/Screen";
import { theme } from "../ui/theme";

type OrderItem = {
  id: number;
  product_name?: string | null;
  quantity?: number | null;
  modifier_options?: any;
  item_notes?: string | null;
  subtotal?: number | string | null;
};

type Order = {
  id: number;
  order_number: string;
  status: string;
  payment_status: string;
  payment_method?: string | null;
  total_amount?: number | string | null;
  subtotal?: number | string | null;
  discount_amount?: number | string | null;
  delivery_fee?: number | string | null;
  points_used?: number | null;
  delivery_address?: string | null;
  delivery_notes?: string | null;
  recipient_name?: string | null;
  recipient_phone?: string | null;
  created_at?: string | null;
  gym?: { id: number; gym_name?: string | null; address?: string | null } | null;
  member?: { id: number; full_name?: string | null; phone_number?: string | null } | null;
  items?: OrderItem[];
};

type PaymentMethod = { id: number; code: string; name: string };

function toWaNumber(raw?: string | null) {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const digits = s.replace(/[^\d+]/g, "");
  if (!digits) return null;
  if (digits.startsWith("62")) return digits.replace(/[^\d]/g, "");
  if (digits.startsWith("+62")) return digits.replace(/[^\d]/g, "");
  if (digits.startsWith("0")) return `62${digits.slice(1)}`.replace(/[^\d]/g, "");
  return digits.replace(/[^\d]/g, "");
}

function formatMoney(v: any) {
  const n = Number(v ?? 0) || 0;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function formatWhen(s?: string | null) {
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("id-ID");
}

export default function CashierQueueScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { refreshing, onRefresh } = usePullToRefresh();
  const lastEventAt = useOrderQueueStore((s) => s.lastEventAt);
  const setCounts = useOrderQueueStore((s) => s.setCounts);

  const preset = String(route.params?.preset ?? "all");
  const [mode, setMode] = useState<"all" | "unpaid">(preset === "unpaid" ? "unpaid" : "all");

  useEffect(() => {
    if (preset === "unpaid") setMode("unpaid");
    if (preset === "all") setMode("all");
  }, [preset]);

  const pmQuery = useQuery({
    queryKey: ["payment-methods"],
    queryFn: async () => {
      const r = await api.get("/payment-methods");
      const list = r.data?.methods ?? r.data?.payment_methods ?? r.data ?? [];
      return Array.isArray(list) ? (list as PaymentMethod[]) : [];
    },
  });

  const pmMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const it of pmQuery.data ?? []) {
      if (it?.code) m.set(String(it.code), String(it.name ?? it.code));
    }
    return m;
  }, [pmQuery.data]);

  const listQuery = useQuery({
    queryKey: ["staff", "orders", "queue", mode],
    queryFn: async () => {
      const r = await api.get("/staff/orders", {
        params: { status: "queue", payment_status: mode === "unpaid" ? "unpaid" : undefined },
      });
      const rows = r.data?.data ?? [];
      return Array.isArray(rows) ? (rows as Order[]) : [];
    },
  });

  const countsQuery = useQuery<{ queue_total?: number; queue_unpaid?: number }>({
    queryKey: ["staff", "orders", "counts"],
    queryFn: async () => {
      const r = await api.get("/staff/orders/counts");
      return r.data?.counts ?? {};
    },
  });

  useEffect(() => {
    if (countsQuery.data) setCounts(countsQuery.data);
  }, [countsQuery.data, setCounts]);

  useEffect(() => {
    if (!lastEventAt) return;
    listQuery.refetch();
    countsQuery.refetch();
  }, [lastEventAt]);

  const updateOrder = useMutation({
    mutationFn: async ({ id, patch }: { id: number; patch: any }) => {
      const r = await api.put(`/staff/orders/${id}`, patch);
      return r.data?.order;
    },
    onSuccess: async () => {
      await listQuery.refetch();
      await countsQuery.refetch();
    },
  });

  const rows = listQuery.data ?? [];

  return (
    <Screen>
      <FlatList
        contentContainerStyle={{ padding: theme.spacing.md, gap: 12 }}
        data={rows}
        keyExtractor={(o) => String(o.id)}
        refreshControl={
          <RefreshControl
            tintColor={theme.colors.text}
            refreshing={refreshing || listQuery.isFetching || countsQuery.isFetching}
            onRefresh={async () => {
              await onRefresh();
              await Promise.all([listQuery.refetch(), countsQuery.refetch()]);
            }}
          />
        }
        ListHeaderComponent={
          <View style={{ gap: 10 }}>
            <View style={{ gap: 6 }}>
              <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: "900" }}>
                Antrian Order
              </Text>
              <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                {Number(countsQuery.data?.queue_total ?? 0).toLocaleString("id-ID")} antrian •{" "}
                {Number(countsQuery.data?.queue_unpaid ?? 0).toLocaleString("id-ID")} belum bayar
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable onPress={() => setMode("all")} style={{ flex: 1 }}>
                <Card
                  style={{
                    paddingVertical: 12,
                    alignItems: "center",
                    borderColor: mode === "all" ? theme.colors.green : theme.colors.border,
                  }}
                >
                  <Text style={{ color: theme.colors.text, fontWeight: "900" }}>Semua</Text>
                </Card>
              </Pressable>
              <Pressable onPress={() => setMode("unpaid")} style={{ flex: 1 }}>
                <Card
                  style={{
                    paddingVertical: 12,
                    alignItems: "center",
                    borderColor: mode === "unpaid" ? theme.colors.green : theme.colors.border,
                  }}
                >
                  <Text style={{ color: theme.colors.text, fontWeight: "900" }}>Belum bayar</Text>
                </Card>
              </Pressable>
            </View>
          </View>
        }
        ListEmptyComponent={
          <Text style={{ color: theme.colors.muted }}>
            {listQuery.isLoading ? "Loading…" : "Antrian kosong."}
          </Text>
        }
        renderItem={({ item: o }) => {
          const name = String(o.recipient_name ?? o.member?.full_name ?? "Pelanggan");
          const phone = o.recipient_phone ?? o.member?.phone_number ?? null;
          const wa = toWaNumber(phone);
          const when = formatWhen(o.created_at);
          const pmLabel = o.payment_method ? pmMap.get(String(o.payment_method)) : null;
          const isUnpaid = o.payment_status === "unpaid";
          const isPaid = o.payment_status === "paid";
          const canMarkPaid =
            isUnpaid && String(o.payment_method ?? "") === "bca-transfer-evan-grimaldi";

          const badgeBg = isPaid ? "#0b1b12" : "#1b110b";
          const badgeBorder = isPaid ? theme.colors.green : theme.colors.border;
          const badgeText = isPaid ? "PAID" : "UNPAID";

          const statusLabel = String(o.status ?? "").toUpperCase();

          const items = Array.isArray(o.items) ? o.items : [];
          const lines = items.slice(0, 4).map((it) => {
            const mods = Array.isArray(it.modifier_options)
              ? it.modifier_options.map((x: any) => x?.name ?? x?.label).filter(Boolean).join(", ")
              : null;
            const qty = Number(it.quantity ?? 0) || 0;
            const label = String(it.product_name ?? "Item");
            return `${qty}x ${label}${mods ? ` (${mods})` : ""}`;
          });
          const more = items.length > 4 ? `+${items.length - 4} item lainnya` : null;

          return (
            <Pressable onPress={() => navigation.navigate("CashierOrderDetail", { id: o.id })}>
              <Card style={{ gap: 10, padding: 14 }}>
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: "900" }} numberOfLines={1}>
                      {name}
                    </Text>
                    <Text style={{ color: theme.colors.muted, fontSize: 12 }} numberOfLines={1}>
                      #{o.order_number} {when ? `• ${when}` : ""}
                    </Text>
                  </View>
                  <View style={{ gap: 6, alignItems: "flex-end" }}>
                    <View
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: badgeBorder,
                        backgroundColor: badgeBg,
                      }}
                    >
                      <Text style={{ color: theme.colors.text, fontSize: 11, fontWeight: "900" }}>
                        {badgeText}
                      </Text>
                    </View>
                    <Text style={{ color: theme.colors.muted, fontSize: 11 }}>{statusLabel}</Text>
                  </View>
                </View>

                <View style={{ gap: 6 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Ionicons name="card" size={14} color={theme.colors.muted} />
                    <Text style={{ color: theme.colors.muted, fontSize: 12 }} numberOfLines={1}>
                      {pmLabel ?? o.payment_method ?? "-"}
                    </Text>
                    <Text style={{ color: theme.colors.text, fontSize: 12, fontWeight: "900" }}>
                      {formatMoney(o.total_amount)}
                    </Text>
                  </View>
                  {o.delivery_address ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Ionicons name="location" size={14} color={theme.colors.muted} />
                      <Text style={{ color: theme.colors.muted, fontSize: 12 }} numberOfLines={2}>
                        {o.delivery_address}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View style={{ gap: 4 }}>
                  {lines.map((t, idx) => (
                    <Text key={idx} style={{ color: theme.colors.text, fontSize: 12 }} numberOfLines={1}>
                      {t}
                    </Text>
                  ))}
                  {more ? <Text style={{ color: theme.colors.muted, fontSize: 12 }}>{more}</Text> : null}
                </View>

                <View style={{ flexDirection: "row", gap: 10 }}>
                  <Button
                    variant="secondary"
                    onPress={async () => {
                      if (!wa) return;
                      const url = `https://wa.me/${wa}`;
                      try {
                        await Linking.openURL(url);
                      } catch {}
                    }}
                    disabled={!wa}
                    style={{ flex: 1, paddingVertical: 10 }}
                  >
                    WhatsApp
                  </Button>
                  {canMarkPaid ? (
                    <Button
                      onPress={() => updateOrder.mutate({ id: o.id, patch: { payment_status: "paid" } })}
                      disabled={updateOrder.isPending}
                      style={{ flex: 1, paddingVertical: 10 }}
                    >
                      Tandai sudah bayar
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      onPress={() => navigation.navigate("CashierOrderDetail", { id: o.id })}
                      style={{ flex: 1, paddingVertical: 10 }}
                    >
                      Detail
                    </Button>
                  )}
                </View>

                <View style={{ flexDirection: "row", gap: 10 }}>
                  {o.status === "pending" ? (
                    <Button
                      onPress={() => updateOrder.mutate({ id: o.id, patch: { status: "confirmed" } })}
                      disabled={updateOrder.isPending}
                      style={{ flex: 1, paddingVertical: 10 }}
                    >
                      Konfirmasi
                    </Button>
                  ) : null}
                  {o.status === "confirmed" ? (
                    <Button
                      onPress={() => updateOrder.mutate({ id: o.id, patch: { status: "delivering" } })}
                      disabled={updateOrder.isPending}
                      style={{ flex: 1, paddingVertical: 10 }}
                    >
                      Delivering
                    </Button>
                  ) : null}
                  {o.status === "delivering" ? (
                    <Button
                      onPress={() => updateOrder.mutate({ id: o.id, patch: { status: "delivered" } })}
                      disabled={updateOrder.isPending}
                      style={{ flex: 1, paddingVertical: 10 }}
                    >
                      Delivered
                    </Button>
                  ) : null}
                  {o.status !== "delivered" && o.status !== "cancelled" ? (
                    <Button
                      variant="danger"
                      onPress={() => updateOrder.mutate({ id: o.id, patch: { status: "cancelled" } })}
                      disabled={updateOrder.isPending}
                      style={{ flex: 1, paddingVertical: 10 }}
                    >
                      Cancel
                    </Button>
                  ) : null}
                </View>
              </Card>
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}
