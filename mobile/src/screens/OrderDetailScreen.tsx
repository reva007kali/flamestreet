import { useQuery } from "@tanstack/react-query";
import { RouteProp, useRoute } from "@react-navigation/native";
import { useEffect, useMemo, useRef, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { api } from "../lib/api";
import { RootStackParamList } from "../navigation/types";
import Button from "../ui/Button";
import Card from "../ui/Card";
import Screen from "../ui/Screen";
import { theme } from "../ui/theme";
import { usePullToRefresh } from "../lib/usePullToRefresh";
import { useToast } from "../ui/Toast";

type OrderDetailRoute = RouteProp<RootStackParamList, "OrderDetail">;

type Order = {
  id: number;
  order_number: string;
  status?: string;
  payment_status?: string;
  payment_method?: string;
  total_amount?: number;
  subtotal?: number;
  discount_amount?: number;
  delivery_fee?: number;
  delivery_address?: string | null;
  delivery_notes?: string | null;
  recipient_name?: string | null;
  recipient_phone?: string | null;
  points_used?: number;
  points_used_source?: string | null;
  points_earned_member?: number;
  points_earned_trainer?: number;
  created_at?: string | null;
  updated_at?: string | null;
  delivered_at?: string | null;
  cancelled_at?: string | null;
  cancelled_reason?: string | null;
  gym?: any | null;
  items?: any[];
};

export default function OrderDetailScreen() {
  const route = useRoute<OrderDetailRoute>();
  const [paymentUrl, setPaymentUrl] = useState<string>("");
  const [tx, setTx] = useState<any>(null);
  const { refreshing, onRefresh } = usePullToRefresh();
  const toast = useToast();
  const prevPaymentStatus = useRef<string | null>(null);

  const query = useQuery<Order>({
    queryKey: ["order", route.params.orderNumber],
    queryFn: async (): Promise<Order> => {
      const r = await api.get(`/orders/${route.params.orderNumber}`);
      return r.data?.order;
    },
    refetchInterval: (q: any) =>
      q.state.data?.payment_status === "unpaid" ? 10000 : false,
  });

  const order = query.data;
  const orderId = useMemo(
    () => route.params.orderId ?? order?.id,
    [route.params.orderId, order?.id],
  );
  const isDoku = Boolean(order?.payment_method?.startsWith?.("doku-"));
  const isUnpaid = order?.payment_status === "unpaid";

  useEffect(() => {
    const cur = order?.payment_status ?? null;
    const prev = prevPaymentStatus.current;
    if (prev && prev !== cur && cur === "paid") {
      toast.show({
        variant: "success",
        title: "Payment confirmed",
        message: `Order #${order?.order_number ?? ""}`,
      });
    }
    prevPaymentStatus.current = cur;
  }, [order?.payment_status, order?.order_number, toast]);

  async function ensurePaymentUrl() {
    if (!orderId) return;
    try {
      const r = await api.post(`/orders/${orderId}/doku/checkout`);
      setTx(r.data?.transaction ?? null);
      setPaymentUrl(r.data?.payment_url ?? "");
    } catch {}
  }

  useEffect(() => {
    if (!orderId || !isDoku) return;
    if (!isUnpaid) return;
    ensurePaymentUrl();
  }, [orderId, isDoku, isUnpaid]);

  useEffect(() => {
    if (!orderId || !isDoku) return;
    if (!isUnpaid) return;

    const timer = setInterval(async () => {
      try {
        const r = await api.get(`/orders/${orderId}/doku/checkout/status`);
        if (r.data?.transaction) setTx(r.data.transaction);
        if (r.data?.payment_status === "paid") query.refetch();
      } catch {}
    }, 6000);

    return () => clearInterval(timer);
  }, [orderId, isDoku, isUnpaid, query]);

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{
          padding: theme.spacing.md,
          gap: theme.spacing.md,
        }}
        refreshControl={
          <RefreshControl
            tintColor={theme.colors.text}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      >
        {query.isLoading ? (
          <Text style={{ color: theme.colors.muted }}>Loading…</Text>
        ) : null}
        {order ? (
          <>
            <Card style={{ gap: 6 }}>
              <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "900" }}>
                #{order.order_number}
              </Text>
              <Text style={{ color: theme.colors.muted }}>
                {order.status ?? "—"} • {order.payment_status ?? "—"}
                {order.payment_method ? ` • ${order.payment_method}` : ""}
              </Text>
              {order.created_at ? (
                <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                  Created: {new Date(order.created_at).toLocaleString("id-ID")}
                </Text>
              ) : null}
              {order.delivered_at ? (
                <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                  Delivered: {new Date(order.delivered_at).toLocaleString("id-ID")}
                </Text>
              ) : null}
              {order.cancelled_at ? (
                <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                  Cancelled: {new Date(order.cancelled_at).toLocaleString("id-ID")}
                </Text>
              ) : null}
              {order.cancelled_reason ? (
                <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                  Reason: {order.cancelled_reason}
                </Text>
              ) : null}
            </Card>

            <Card style={{ gap: 8 }}>
              <Text style={{ color: theme.colors.text, fontWeight: "900" }}>Summary</Text>
              <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                Subtotal: Rp {Number(order.subtotal ?? 0).toLocaleString("id-ID")}
              </Text>
              <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                Discount: Rp {Number(order.discount_amount ?? 0).toLocaleString("id-ID")}
              </Text>
              <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                Delivery fee: Rp {Number(order.delivery_fee ?? 0).toLocaleString("id-ID")}
              </Text>
              <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                Total: Rp {Number(order.total_amount ?? 0).toLocaleString("id-ID")}
              </Text>

              {order.points_used ? (
                <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                  Points used: {Number(order.points_used ?? 0).toLocaleString("id-ID")} fp
                  {order.points_used_source ? ` (${order.points_used_source})` : ""}
                </Text>
              ) : null}
              {order.points_earned_member ? (
                <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                  Points earned (member): {Number(order.points_earned_member ?? 0).toLocaleString("id-ID")} fp
                </Text>
              ) : null}
              {order.points_earned_trainer ? (
                <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                  Points earned (trainer): {Number(order.points_earned_trainer ?? 0).toLocaleString("id-ID")} fp
                </Text>
              ) : null}

              {isDoku && isUnpaid ? (
                <View style={{ gap: 10, marginTop: 6 }}>
                  <Button
                    onPress={async () => {
                      if (!paymentUrl) await ensurePaymentUrl();
                      if (paymentUrl) await WebBrowser.openBrowserAsync(paymentUrl);
                    }}
                    disabled={!orderId}
                  >
                    Pay now
                  </Button>
                  <Button variant="secondary" onPress={ensurePaymentUrl} disabled={!orderId}>
                    Refresh payment link
                  </Button>
                  {tx?.reference_no ? (
                    <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                      Token: {String(tx.reference_no)}
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </Card>

            <Card style={{ gap: 10 }}>
              <Text style={{ color: theme.colors.text, fontWeight: "900" }}>Delivery</Text>
              {order.gym?.gym_name ? (
                <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                  Gym: {order.gym.gym_name}
                </Text>
              ) : null}
              {order.delivery_address ? (
                <Text style={{ color: theme.colors.text }}>{order.delivery_address}</Text>
              ) : null}
              {order.delivery_notes ? (
                <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                  Notes: {order.delivery_notes}
                </Text>
              ) : null}
              {order.recipient_name || order.recipient_phone ? (
                <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                  Recipient: {[order.recipient_name, order.recipient_phone].filter(Boolean).join(" • ")}
                </Text>
              ) : null}
            </Card>

            <Card style={{ gap: 10 }}>
              <Text style={{ color: theme.colors.text, fontWeight: "900" }}>Items</Text>
              {(order.items ?? []).map((it: any, idx: number) => (
                <View
                  key={`${it.id ?? idx}`}
                  style={{
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    borderRadius: theme.radius.md,
                    padding: 12,
                    gap: 6,
                  }}
                >
                  <Text style={{ color: theme.colors.text, fontWeight: "900" }} numberOfLines={1}>
                    {it.product_name ?? "—"}
                  </Text>
                  <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                    {Number(it.quantity ?? 0)} × Rp {Number(it.product_price ?? 0).toLocaleString("id-ID")}
                  </Text>
                  {(it.modifier_options ?? []).length ? (
                    <View style={{ gap: 4 }}>
                      {(it.modifier_options ?? []).map((m: any, j: number) => (
                        <Text key={`${it.id ?? idx}:${j}`} style={{ color: theme.colors.muted, fontSize: 12 }}>
                          {m.modifier_name}: {m.option_name}
                          {Number(m.additional_price ?? 0) > 0
                            ? ` (+Rp ${Number(m.additional_price).toLocaleString("id-ID")})`
                            : ""}
                        </Text>
                      ))}
                    </View>
                  ) : null}
                  {it.item_notes ? (
                    <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                      Notes: {it.item_notes}
                    </Text>
                  ) : null}
                  <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                    Subtotal: Rp {Number(it.subtotal ?? 0).toLocaleString("id-ID")}
                  </Text>
                </View>
              ))}
              {!(order.items ?? []).length ? (
                <Text style={{ color: theme.colors.muted }}>No items.</Text>
              ) : null}
            </Card>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
