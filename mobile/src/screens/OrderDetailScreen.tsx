import { useQuery } from "@tanstack/react-query";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  Text,
  View,
  Image,
  Pressable,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "../lib/api";
import { RootStackParamList } from "../navigation/types";
import { useAuthStore } from "../store/authStore";
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
  courier_id?: number | null;
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
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);
  const [paymentUrl, setPaymentUrl] = useState<string>("");
  const [tx, setTx] = useState<any>(null);
  const { refreshing, onRefresh } = usePullToRefresh();
  const toast = useToast();
  const prevPaymentStatus = useRef<string | null>(null);
  const [paymentBusy, setPaymentBusy] = useState(false);

  // Cek apakah user adalah trainer
  const isTrainer = (user?.roles ?? []).includes("trainer");

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
    if (!orderId) return "";
    try {
      setPaymentBusy(true);
      const r = await api.post(`/orders/${orderId}/doku/checkout`);
      setTx(r.data?.transaction ?? null);
      const url = r.data?.payment_url ? String(r.data.payment_url) : "";
      setPaymentUrl(url);
      return url;
    } catch (e: any) {
      toast.show({
        variant: "error",
        title: "Payment link gagal",
        message: e?.response?.data?.message ?? e?.message ?? "Coba lagi.",
      });
      return "";
    } finally {
      setPaymentBusy(false);
    }
  }

  useEffect(() => {
    if (!orderId || !isDoku || !isUnpaid) return;
    ensurePaymentUrl();
  }, [orderId, isDoku, isUnpaid]);

  // Status Badge Logic
  const getStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return { color: theme.colors.green, bg: "rgba(34, 197, 94, 0.1)" };
      case "cancelled":
        return { color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)" };
      case "pending":
        return { color: "#fbbf24", bg: "rgba(251, 191, 36, 0.1)" };
      default:
        return { color: theme.colors.muted, bg: "#222" };
    }
  };

  const statusInfo = getStatusStyle(order?.status ?? "");

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            tintColor={theme.colors.green}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      >
        {query.isLoading && (
          <Text style={{ color: theme.colors.muted }}>Loading detail...</Text>
        )}

        {order && (
          <>
            {/* -- HEADER: STATUS & ORDER NO -- */}
            <View
              style={{ alignItems: "center", gap: 10, paddingVertical: 10 }}
            >
              <View
                style={{
                  backgroundColor: statusInfo.bg,
                  paddingHorizontal: 16,
                  paddingVertical: 6,
                  borderRadius: 99,
                  borderWidth: 1,
                  borderColor: statusInfo.color + "20",
                }}
              >
                <Text
                  style={{
                    color: statusInfo.color,
                    fontWeight: "900",
                    fontSize: 12,
                    textTransform: "uppercase",
                  }}
                >
                  {order.status}
                </Text>
              </View>
              <Text style={{ color: "#fff", fontSize: 28, fontWeight: "900" }}>
                #{order.order_number}
              </Text>
              <Text style={{ color: theme.colors.muted, fontSize: 13 }}>
                {new Date(order.created_at!).toLocaleString("id-ID", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </Text>
            </View>

            {/* -- ACTION: PAYMENT BUTTON (UNPAID ONLY) -- */}
            {isDoku && isUnpaid && order?.payment_method !== "cod" && (
              <Card
                style={{
                  padding: 16,
                  backgroundColor: "#1a1a1a",
                  borderRadius: 24,
                  gap: 12,
                  borderWidth: 1,
                  borderColor: theme.colors.green + "30",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Ionicons name="card" size={24} color={theme.colors.green} />
                  <View>
                    <Text style={{ color: "#fff", fontWeight: "800" }}>
                      Waiting for Payment
                    </Text>
                    <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                      Please complete your transaction via DOKU
                    </Text>
                  </View>
                </View>
                <Button
                  disabled={paymentBusy}
                  onPress={async () => {
                    const url = paymentUrl || (await ensurePaymentUrl());
                    if (!url) return;
                    await WebBrowser.openBrowserAsync(url);
                  }}
                >
                  Pay Now
                </Button>
                <Pressable
                  onPress={async () => {
                    await ensurePaymentUrl();
                  }}
                  disabled={paymentBusy}
                  style={{ alignSelf: "center" }}
                >
                  <Text
                    style={{
                      color: theme.colors.muted,
                      fontSize: 12,
                      textDecorationLine: "underline",
                      opacity: paymentBusy ? 0.6 : 1,
                    }}
                  >
                    Refresh Link
                  </Text>
                </Pressable>
              </Card>
            )}

            {/* -- ITEMS LIST -- */}
            <View style={{ gap: 12 }}>
              <Text
                style={{
                  color: "rgba(255,255,255,0.4)",
                  fontWeight: "800",
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Items Ordered
              </Text>
              {order.items?.map((it, idx) => (
                <View
                  key={idx}
                  style={{
                    flexDirection: "row",
                    gap: 14,
                    backgroundColor: "#151515",
                    padding: 14,
                    borderRadius: 20,
                  }}
                >
                  <View
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 12,
                      backgroundColor: "#000",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="fast-food" size={24} color="#222" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}
                    >
                      {it.product_name}
                    </Text>
                    <Text
                      style={{
                        color: theme.colors.muted,
                        fontSize: 12,
                        marginTop: 2,
                      }}
                    >
                      {it.quantity}x • Rp{" "}
                      {Number(it.product_price).toLocaleString("id-ID")}
                    </Text>
                    {it.modifier_options?.map((m: any, j: number) => (
                      <Text
                        key={j}
                        style={{
                          color: theme.colors.green,
                          fontSize: 11,
                          fontWeight: "700",
                        }}
                      >
                        + {m.option_name}
                      </Text>
                    ))}
                  </View>
                  <Text style={{ color: "#fff", fontWeight: "800" }}>
                    Rp {Number(it.subtotal).toLocaleString("id-ID")}
                  </Text>
                </View>
              ))}
            </View>

            {/* -- DELIVERY INFO -- */}
            <View style={{ gap: 12 }}>
              <Text
                style={{
                  color: "rgba(255,255,255,0.4)",
                  fontWeight: "800",
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Delivery Info
              </Text>
              <Card
                style={{
                  padding: 16,
                  borderRadius: 24,
                  backgroundColor: "#151515",
                  gap: 12,
                }}
              >
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <Ionicons
                    name="location"
                    size={20}
                    color={theme.colors.green}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}
                    >
                      {order.recipient_name ?? "Recipient"}
                    </Text>
                    <Text
                      style={{
                        color: theme.colors.muted,
                        fontSize: 13,
                        marginTop: 4,
                      }}
                    >
                      {order.delivery_address}
                    </Text>
                    {order.delivery_notes && (
                      <View
                        style={{
                          marginTop: 8,
                          padding: 8,
                          backgroundColor: "rgba(255,255,255,0.03)",
                          borderRadius: 8,
                        }}
                      >
                        <Text
                          style={{ color: theme.colors.muted, fontSize: 11 }}
                        >
                          Note: {order.delivery_notes}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                {order.courier_id ? (
                  <Pressable
                    onPress={() =>
                      navigation.navigate("ChatThread", {
                        orderNumber: order.order_number,
                        orderId: order.id,
                      })
                    }
                    style={{ marginTop: 10 }}
                  >
                    <View
                      style={{
                        backgroundColor: theme.colors.green,
                        borderRadius: 16,
                        paddingVertical: 12,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ color: "#041009", fontWeight: "900" }}>
                        Buka Chat Courier
                      </Text>
                    </View>
                  </Pressable>
                ) : null}
                {order.gym && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      borderTopWidth: 1,
                      borderTopColor: "rgba(255,255,255,0.05)",
                      paddingTop: 12,
                    }}
                  >
                    <Ionicons
                      name="business"
                      size={16}
                      color={theme.colors.muted}
                    />
                    <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                      Sent via {order.gym.gym_name}
                    </Text>
                  </View>
                )}
              </Card>
            </View>

            {/* -- PAYMENT SUMMARY & POINTS -- */}
            <View style={{ gap: 12 }}>
              <Text
                style={{
                  color: "rgba(255,255,255,0.4)",
                  fontWeight: "800",
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Payment Summary
              </Text>
              <Card
                style={{
                  padding: 20,
                  borderRadius: 24,
                  backgroundColor: "#151515",
                  gap: 10,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text style={{ color: theme.colors.muted }}>Subtotal</Text>
                  <Text style={{ color: "#fff", fontWeight: "700" }}>
                    Rp {Number(order.subtotal).toLocaleString("id-ID")}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text style={{ color: theme.colors.muted }}>
                    Delivery Fee
                  </Text>
                  <Text style={{ color: "#fff", fontWeight: "700" }}>
                    Rp {Number(order.delivery_fee).toLocaleString("id-ID")}
                  </Text>
                </View>
                {Number(order.discount_amount) > 0 && (
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text style={{ color: theme.colors.muted }}>Discount</Text>
                    <Text style={{ color: "#ef4444", fontWeight: "700" }}>
                      - Rp{" "}
                      {Number(order.discount_amount).toLocaleString("id-ID")}
                    </Text>
                  </View>
                )}
                <View
                  style={{
                    height: 1,
                    backgroundColor: "rgba(255,255,255,0.05)",
                    marginVertical: 6,
                  }}
                />
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}
                  >
                    Total
                  </Text>
                  <Text
                    style={{
                      color: theme.colors.green,
                      fontWeight: "900",
                      fontSize: 20,
                    }}
                  >
                    Rp {Number(order.total_amount).toLocaleString("id-ID")}
                  </Text>
                </View>

                {/* Points Section */}
                <View
                  style={{
                    marginTop: 10,
                    padding: 12,
                    backgroundColor: "rgba(34, 197, 94, 0.05)",
                    borderRadius: 16,
                    gap: 6,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 4,
                    }}
                  >
                    <Ionicons
                      name="flash"
                      size={14}
                      color={theme.colors.green}
                    />
                    <Text
                      style={{
                        color: theme.colors.green,
                        fontWeight: "900",
                        fontSize: 11,
                        textTransform: "uppercase",
                      }}
                    >
                      Points Transaction
                    </Text>
                  </View>
                  {order.points_used ? (
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text
                        style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}
                      >
                        Points Used
                      </Text>
                      <Text
                        style={{
                          color: "#fff",
                          fontSize: 12,
                          fontWeight: "700",
                        }}
                      >
                        {Number(order.points_used).toLocaleString("id-ID")} fp
                      </Text>
                    </View>
                  ) : null}
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text
                      style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}
                    >
                      Earned (Member)
                    </Text>
                    <Text
                      style={{
                        color: theme.colors.green,
                        fontSize: 12,
                        fontWeight: "700",
                      }}
                    >
                      +{" "}
                      {Number(order.points_earned_member ?? 0).toLocaleString(
                        "id-ID",
                      )}{" "}
                      fp
                    </Text>
                  </View>

                  {/* HIDE TRAINER POINTS IF NOT TRAINER */}
                  {isTrainer && order.points_earned_trainer ? (
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        borderTopWidth: 1,
                        borderTopColor: "rgba(255,255,255,0.05)",
                        marginTop: 4,
                        paddingTop: 4,
                      }}
                    >
                      <Text
                        style={{
                          color: "#fbbf24",
                          fontSize: 12,
                          fontWeight: "700",
                        }}
                      >
                        Earned (Trainer Only)
                      </Text>
                      <Text
                        style={{
                          color: "#fbbf24",
                          fontSize: 12,
                          fontWeight: "700",
                        }}
                      >
                        +{" "}
                        {Number(order.points_earned_trainer).toLocaleString(
                          "id-ID",
                        )}{" "}
                        fp
                      </Text>
                    </View>
                  ) : null}
                </View>
              </Card>
            </View>

            {/* -- CANCELLATION INFO (IF ANY) -- */}
            {order.cancelled_at && (
              <Card
                style={{
                  padding: 16,
                  backgroundColor: "rgba(239, 68, 68, 0.05)",
                  borderColor: "#ef444430",
                  borderWidth: 1,
                  borderRadius: 20,
                }}
              >
                <Text
                  style={{
                    color: "#ef4444",
                    fontWeight: "900",
                    marginBottom: 4,
                  }}
                >
                  Cancellation Detail
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>
                  Reason: {order.cancelled_reason ?? "No reason provided"}
                </Text>
                <Text
                  style={{
                    color: "rgba(255,255,255,0.4)",
                    fontSize: 11,
                    marginTop: 4,
                  }}
                >
                  Date: {new Date(order.cancelled_at).toLocaleString("id-ID")}
                </Text>
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
