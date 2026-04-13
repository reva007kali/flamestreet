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
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoIso(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
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
    const label =
      from || to ? `${from || "…" } → ${to || "…"}` : "All dates";
    return (
      <Card style={{ gap: 10 }}>
        <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "900" }}>
          Orders
        </Text>
        <Text style={{ color: theme.colors.muted, fontSize: 12 }}>{label}</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <TextField label="From (YYYY-MM-DD)" value={from} onChangeText={setFrom} />
          </View>
          <View style={{ flex: 1 }}>
            <TextField label="To (YYYY-MM-DD)" value={to} onChangeText={setTo} />
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable onPress={() => { const t = todayIso(); setFrom(t); setTo(t); }}>
            <View
              style={{
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.md,
                paddingVertical: 10,
                paddingHorizontal: 12,
              }}
            >
              <Text style={{ color: theme.colors.muted, fontWeight: "900" }}>Today</Text>
            </View>
          </Pressable>
          <Pressable onPress={() => { setFrom(daysAgoIso(7)); setTo(todayIso()); }}>
            <View
              style={{
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.md,
                paddingVertical: 10,
                paddingHorizontal: 12,
              }}
            >
              <Text style={{ color: theme.colors.muted, fontWeight: "900" }}>Last 7d</Text>
            </View>
          </Pressable>
          <Pressable onPress={() => { setFrom(""); setTo(""); }}>
            <View
              style={{
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.md,
                paddingVertical: 10,
                paddingHorizontal: 12,
              }}
            >
              <Text style={{ color: theme.colors.muted, fontWeight: "900" }}>Clear</Text>
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
            <Card style={{ gap: 6 }}>
              <Text
                style={{
                  color: theme.colors.text,
                  fontSize: 16,
                  fontWeight: "800",
                }}
              >
                #{item.order_number}
              </Text>
              <Text style={{ color: theme.colors.muted }}>
                {item.status ?? "—"} • {item.payment_status ?? "—"} • Rp{" "}
                {Number(item.total_amount ?? 0).toLocaleString("id-ID")}
              </Text>
              {item.created_at ? (
                <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                  {new Date(item.created_at).toLocaleString("id-ID")}
                </Text>
              ) : null}
            </Card>
          </Pressable>
        )}
      />
    </Screen>
  );
}
