import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Linking, RefreshControl, ScrollView, Text, View } from "react-native";
import { api } from "../lib/api";
import { usePullToRefresh } from "../lib/usePullToRefresh";
import Button from "../ui/Button";
import Card from "../ui/Card";
import Screen from "../ui/Screen";
import { theme } from "../ui/theme";

type OrderItem = {
  id: number;
  product_name?: string | null;
  quantity?: number | null;
  product_price?: number | string | null;
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

export default function CashierOrderDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { refreshing, onRefresh } = usePullToRefresh();
  const id = Number(route.params?.id ?? 0);

  const query = useQuery({
    queryKey: ["staff", "orders", id],
    queryFn: async () => {
      const r = await api.get(`/staff/orders/${id}`);
      return r.data?.order as Order;
    },
    enabled: Boolean(id),
  });

  const updateOrder = useMutation({
    mutationFn: async (patch: any) => {
      const r = await api.put(`/staff/orders/${id}`, patch);
      return r.data?.order;
    },
    onSuccess: async () => {
      await query.refetch();
    },
  });

  const o = query.data;
  const items = Array.isArray(o?.items) ? o!.items! : [];
  const name = String(o?.recipient_name ?? o?.member?.full_name ?? "Pelanggan");
  const phone = o?.recipient_phone ?? o?.member?.phone_number ?? null;
  const wa = toWaNumber(phone);
  const canMarkPaid =
    o?.payment_status === "unpaid" &&
    String(o?.payment_method ?? "") === "bca-transfer-evan-grimaldi";

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.md, gap: 12 }}
        refreshControl={
          <RefreshControl
            tintColor={theme.colors.text}
            refreshing={refreshing || query.isFetching}
            onRefresh={async () => {
              await onRefresh();
              await query.refetch();
            }}
          />
        }
      >
        <View style={{ gap: 6 }}>
          <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: "900" }}>
            #{o?.order_number ?? "-"}
          </Text>
          <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
            {o?.status?.toUpperCase?.() ?? "-"} • {o?.payment_status?.toUpperCase?.() ?? "-"}
          </Text>
        </View>

        <Card style={{ gap: 10 }}>
          <View style={{ gap: 4 }}>
            <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: "900" }} numberOfLines={1}>
              {name}
            </Text>
            {phone ? (
              <Text style={{ color: theme.colors.muted, fontSize: 12 }} numberOfLines={1}>
                {phone}
              </Text>
            ) : null}
          </View>

          {o?.delivery_address ? (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Ionicons name="location" size={16} color={theme.colors.muted} />
              <Text style={{ color: theme.colors.muted, flex: 1 }}>{o.delivery_address}</Text>
            </View>
          ) : null}
          {o?.delivery_notes ? (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Ionicons name="chatbox" size={16} color={theme.colors.muted} />
              <Text style={{ color: theme.colors.muted, flex: 1 }}>{o.delivery_notes}</Text>
            </View>
          ) : null}

          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button
              variant="secondary"
              onPress={async () => {
                navigation.goBack();
              }}
              style={{ flex: 1, paddingVertical: 10 }}
            >
              Kembali
            </Button>
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
          </View>

          {canMarkPaid ? (
            <Button
              onPress={() => updateOrder.mutate({ payment_status: "paid" })}
              disabled={updateOrder.isPending}
              style={{ paddingVertical: 10 }}
            >
              Tandai sudah bayar
            </Button>
          ) : null}

          <View style={{ flexDirection: "row", gap: 10 }}>
            {o?.status === "pending" ? (
              <Button
                onPress={() => updateOrder.mutate({ status: "confirmed" })}
                disabled={updateOrder.isPending}
                style={{ flex: 1, paddingVertical: 10 }}
              >
                Konfirmasi
              </Button>
            ) : null}
            {o?.status === "confirmed" ? (
              <Button
                onPress={() => updateOrder.mutate({ status: "delivering" })}
                disabled={updateOrder.isPending}
                style={{ flex: 1, paddingVertical: 10 }}
              >
                Delivering
              </Button>
            ) : null}
            {o?.status === "delivering" ? (
              <Button
                onPress={() => updateOrder.mutate({ status: "delivered" })}
                disabled={updateOrder.isPending}
                style={{ flex: 1, paddingVertical: 10 }}
              >
                Delivered
              </Button>
            ) : null}
            {o?.status && o.status !== "delivered" && o.status !== "cancelled" ? (
              <Button
                variant="danger"
                onPress={() => updateOrder.mutate({ status: "cancelled" })}
                disabled={updateOrder.isPending}
                style={{ flex: 1, paddingVertical: 10 }}
              >
                Cancel
              </Button>
            ) : null}
          </View>
        </Card>

        <Card style={{ gap: 10 }}>
          <Text style={{ color: theme.colors.text, fontWeight: "900" }}>Items</Text>
          {items.length ? (
            <View style={{ gap: 8 }}>
              {items.map((it) => {
                const mods = Array.isArray(it.modifier_options)
                  ? it.modifier_options.map((x: any) => x?.name ?? x?.label).filter(Boolean).join(", ")
                  : null;
                const qty = Number(it.quantity ?? 0) || 0;
                const price = formatMoney(it.product_price);
                return (
                  <View key={it.id} style={{ gap: 2 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                      <Text style={{ color: theme.colors.text, fontWeight: "700", flex: 1 }} numberOfLines={2}>
                        {qty}x {it.product_name ?? "Item"}
                      </Text>
                      <Text style={{ color: theme.colors.muted, fontSize: 12 }}>{price}</Text>
                    </View>
                    {mods ? (
                      <Text style={{ color: theme.colors.muted, fontSize: 12 }} numberOfLines={2}>
                        {mods}
                      </Text>
                    ) : null}
                    {it.item_notes ? (
                      <Text style={{ color: theme.colors.muted, fontSize: 12 }} numberOfLines={2}>
                        Note: {it.item_notes}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={{ color: theme.colors.muted }}>No items.</Text>
          )}
        </Card>

        <Card style={{ gap: 8 }}>
          <Text style={{ color: theme.colors.text, fontWeight: "900" }}>Ringkasan</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: theme.colors.muted }}>Subtotal</Text>
            <Text style={{ color: theme.colors.text }}>{formatMoney(o?.subtotal)}</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: theme.colors.muted }}>Discount</Text>
            <Text style={{ color: theme.colors.text }}>{formatMoney(o?.discount_amount)}</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: theme.colors.muted }}>Delivery</Text>
            <Text style={{ color: theme.colors.text }}>{formatMoney(o?.delivery_fee)}</Text>
          </View>
          <View style={{ height: 1, backgroundColor: theme.colors.border }} />
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: theme.colors.text, fontWeight: "900" }}>Total</Text>
            <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
              {formatMoney(o?.total_amount)}
            </Text>
          </View>
          {Number(o?.points_used ?? 0) ? (
            <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
              Points used: {Number(o?.points_used ?? 0).toLocaleString("id-ID")} fp
            </Text>
          ) : null}
        </Card>
      </ScrollView>
    </Screen>
  );
}

