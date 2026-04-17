import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { Pressable, Text, View } from "react-native";
import { api } from "../lib/api";
import Card from "../ui/Card";
import AppFlatList from "../ui/AppFlatList";
import Screen from "../ui/Screen";
import { theme } from "../ui/theme";
import { usePullToRefresh } from "../lib/usePullToRefresh";
import TextField from "../ui/TextField";
import { useMemo, useState } from "react";

type Order = {
  id: number;
  order_number: string;
  status?: string;
  payment_status?: string;
  total_amount?: number;
  created_at?: string | null;
  items?: Array<{
    id?: number;
    product_name?: string;
    quantity?: number;
  }>;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoIso(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function statusCardStyle(status?: string) {
  const s = String(status ?? "").toLowerCase();
  if (s === "pending") {
    return {
      bg: "rgba(245, 158, 11, 0.08)",
      border: "rgba(245, 158, 11, 0.22)",
      accent: "#f59e0b",
    };
  }
  if (s === "confirmed") {
    return {
      bg: "rgba(59, 130, 246, 0.08)",
      border: "rgba(59, 130, 246, 0.22)",
      accent: "#60a5fa",
    };
  }
  if (s === "delivering") {
    return {
      bg: "rgba(168, 85, 247, 0.08)",
      border: "rgba(168, 85, 247, 0.22)",
      accent: "#c084fc",
    };
  }
  if (s === "delivered" || s === "completed") {
    return {
      bg: "rgba(34, 197, 94, 0.08)",
      border: "rgba(34, 197, 94, 0.22)",
      accent: "#22c55e",
    };
  }
  if (s === "cancelled") {
    return {
      bg: "rgba(244, 63, 94, 0.08)",
      border: "rgba(244, 63, 94, 0.22)",
      accent: "#fb7185",
    };
  }
  return {
    bg: "#151515",
    border: theme.colors.border,
    accent: "#fff",
  };
}

export default function OrdersScreen() {
  const navigation = useNavigation<any>();
  const { refreshing, onRefresh } = usePullToRefresh();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const query = useQuery({
    queryKey: ["orders", { from: from || null, to: to || null }],
    queryFn: async (): Promise<Order[]> => {
      const params: any = {};
      if (from) params.from = from;
      if (to) params.to = to;
      const r = await api.get("/orders", { params });
      return r.data?.data ?? [];
    },
  });

  const header = useMemo(() => {
    const label = from || to ? `${from || "…"} → ${to || "…"}` : "All dates";
    return (
      <Card style={{ gap: 10 }}>
        <Text
          style={{ color: theme.colors.text, fontSize: 18, fontWeight: "900" }}
        >
          Orders
        </Text>
        <Text style={{ color: theme.colors.muted, fontSize: 12 }}>{label}</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <TextField
              label="From (YYYY-MM-DD)"
              value={from}
              onChangeText={setFrom}
            />
          </View>
          <View style={{ flex: 1 }}>
            <TextField
              label="To (YYYY-MM-DD)"
              value={to}
              onChangeText={setTo}
            />
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            onPress={() => {
              const t = todayIso();
              setFrom(t);
              setTo(t);
            }}
          >
            <View
              style={{
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.md,
                paddingVertical: 10,
                paddingHorizontal: 12,
              }}
            >
              <Text style={{ color: theme.colors.muted, fontWeight: "900" }}>
                Today
              </Text>
            </View>
          </Pressable>
          <Pressable
            onPress={() => {
              setFrom(daysAgoIso(7));
              setTo(todayIso());
            }}
          >
            <View
              style={{
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.md,
                paddingVertical: 10,
                paddingHorizontal: 12,
              }}
            >
              <Text style={{ color: theme.colors.muted, fontWeight: "900" }}>
                Last 7d
              </Text>
            </View>
          </Pressable>
          <Pressable
            onPress={() => {
              setFrom("");
              setTo("");
            }}
          >
            <View
              style={{
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.md,
                paddingVertical: 10,
                paddingHorizontal: 12,
              }}
            >
              <Text style={{ color: theme.colors.muted, fontWeight: "900" }}>
                Clear
              </Text>
            </View>
          </Pressable>
        </View>
      </Card>
    );
  }, [from, to]);

  return (
    <Screen>
      <AppFlatList
        contentContainerStyle={{ padding: theme.spacing.md, gap: 12 }}
        data={query.data ?? []}
        keyExtractor={(i) => String(i.id)}
        refreshing={refreshing || query.isFetching}
        onRefresh={onRefresh}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <Text style={{ color: theme.colors.muted }}>
            {query.isLoading ? "Loading…" : "No orders"}
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              navigation.navigate("OrderDetail", {
                orderNumber: item.order_number,
                orderId: item.id,
              })
            }
            style={{}}
          >
            {(() => {
              const style = statusCardStyle(item.status);
              const items = Array.isArray(item.items) ? item.items : [];
              const itemsText = items
                .slice(0, 2)
                .map(
                  (it) =>
                    `${Number(it.quantity ?? 1) || 1}x ${it.product_name ?? "Item"}`,
                )
                .join(" • ");
              const more = Math.max(0, items.length - 2);
              const summary = itemsText
                ? `${itemsText}${more ? ` • +${more}` : ""}`
                : "Items tidak tersedia";

              return (
                <Card
                  style={{
                    gap: 8,
                    backgroundColor: style.bg,
                    borderColor: style.border,
                    borderWidth: 1,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 12,
                    }}
                  >
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text
                        style={{
                          color: theme.colors.text,
                          fontSize: 15,
                          fontWeight: "800",
                        }}
                        numberOfLines={2}
                      >
                        {summary}
                      </Text>
                      <Text
                        style={{
                          color: "rgba(255,255,255,0.42)",
                          fontSize: 10,
                          fontWeight: "700",
                        }}
                      >
                        {item.order_number}
                      </Text>
                    </View>

                    <Text
                      style={{
                        color: style.accent,
                        fontSize: 14,
                        fontWeight: "900",
                      }}
                    >
                      Rp{" "}
                      {Number(item.total_amount ?? 0).toLocaleString("id-ID")}
                    </Text>
                  </View>

                  <Text
                    style={{
                      color: theme.colors.muted,
                      fontSize: 12,
                    }}
                  >
                    {item.status ?? "—"} • {item.payment_status ?? "—"}
                  </Text>

                  {item.created_at ? (
                    <Text style={{ color: theme.colors.muted, fontSize: 11 }}>
                      {new Date(item.created_at).toLocaleString("id-ID")}
                    </Text>
                  ) : null}
                </Card>
              );
            })()}
          </Pressable>
        )}
      />
    </Screen>
  );
}
