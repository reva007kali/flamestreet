import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { api } from "../lib/api";
import { usePullToRefresh } from "../lib/usePullToRefresh";
import { useOrderQueueStore } from "../store/orderQueueStore";
import Card from "../ui/Card";
import Screen from "../ui/Screen";
import { theme } from "../ui/theme";

export default function CashierDashboardScreen() {
  const navigation = useNavigation<any>();
  const { refreshing, onRefresh } = usePullToRefresh();
  const counts = useOrderQueueStore((s) => s.counts);
  const setCounts = useOrderQueueStore((s) => s.setCounts);

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

  const queueTotal = Number(counts.queue_total ?? countsQuery.data?.queue_total ?? 0) || 0;
  const queueUnpaid = Number(counts.queue_unpaid ?? countsQuery.data?.queue_unpaid ?? 0) || 0;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.md, gap: 12 }}
        refreshControl={
          <RefreshControl
            tintColor={theme.colors.text}
            refreshing={refreshing || countsQuery.isFetching}
            onRefresh={async () => {
              await onRefresh();
              await countsQuery.refetch();
            }}
          />
        }
      >
        <View style={{ gap: 6 }}>
          <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: "900" }}>
            Dashboard Kasir
          </Text>
          <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
            Ringkasan antrian & pembayaran
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            onPress={() => navigation.navigate("Queue", { preset: "all" })}
            style={{ flex: 1 }}
          >
            <Card style={{ gap: 6 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="receipt" size={16} color={theme.colors.green} />
                <Text style={{ color: theme.colors.muted, fontSize: 12 }}>Antrian</Text>
              </View>
              <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: "900" }}>
                {queueTotal.toLocaleString("id-ID")}
              </Text>
            </Card>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate("Queue", { preset: "unpaid" })}
            style={{ flex: 1 }}
          >
            <Card style={{ gap: 6, borderColor: queueUnpaid ? theme.colors.green : theme.colors.border }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="card" size={16} color={theme.colors.green} />
                <Text style={{ color: theme.colors.muted, fontSize: 12 }}>Belum bayar</Text>
              </View>
              <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: "900" }}>
                {queueUnpaid.toLocaleString("id-ID")}
              </Text>
            </Card>
          </Pressable>
        </View>

        <Pressable onPress={() => navigation.navigate("Queue", { preset: "all" })}>
          <Card style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ gap: 2 }}>
              <Text style={{ color: theme.colors.text, fontWeight: "900" }}>Buka Antrian Order</Text>
              <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                Update realtime saat ada order masuk
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
          </Card>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}
