import { useQuery } from "@tanstack/react-query";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { api } from "../lib/api";
import Screen from "../ui/Screen";
import Card from "../ui/Card";
import { theme } from "../ui/theme";
import { useAuthStore } from "../store/authStore";
import { usePullToRefresh } from "../lib/usePullToRefresh";

const EMPTY_ROLES: readonly string[] = [];

type Row = {
  id: string | number;
  occurred_at?: string | null;
  amount: number;
  direction?: "in" | "out" | string;
  source?: string | null;
  description?: string | null;
  reference_label?: string | null;
  type?: string | null;
};

export default function PointsHistoryScreen() {
  const roles = useAuthStore((s) => s.user?.roles ?? EMPTY_ROLES);
  const isTrainer = roles.includes("trainer");
  const { refreshing, onRefresh } = usePullToRefresh();

  const query = useQuery({
    queryKey: ["points", "history", isTrainer ? "trainer" : "member"],
    queryFn: async () => {
      if (isTrainer) {
        const r = await api.get("/trainer/points");
        const tx = r.data?.transactions?.data ?? [];
        return {
          balance: r.data?.balance ?? 0,
          balance_rupiah: r.data?.balance_rupiah ?? 0,
          rows: Array.isArray(tx) ? tx : [],
        };
      }
      const r = await api.get("/member/points/history");
      const tx = r.data?.transactions?.data ?? [];
      return {
        balance: r.data?.balance ?? 0,
        balance_rupiah: r.data?.balance_rupiah ?? 0,
        rows: Array.isArray(tx) ? tx : [],
      };
    },
  });

  const rows: Row[] = query.data?.rows ?? [];

  return (
    <Screen>
      <FlatList
        contentContainerStyle={{ padding: theme.spacing.md, gap: 12 }}
        data={rows}
        keyExtractor={(i) => String(i.id)}
        refreshControl={
          <RefreshControl
            tintColor={theme.colors.text}
            refreshing={refreshing || query.isFetching}
            onRefresh={onRefresh}
          />
        }
        ListHeaderComponent={
          <Card style={{ gap: 6 }}>
            <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "900" }}>
              Flame Points
            </Text>
            <Text style={{ color: theme.colors.muted }}>
              Balance: {Number(query.data?.balance ?? 0).toLocaleString("id-ID")} fp
            </Text>
            <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
              Rp {Number(query.data?.balance_rupiah ?? 0).toLocaleString("id-ID")}
            </Text>
          </Card>
        }
        ListEmptyComponent={
          <Text style={{ color: theme.colors.muted }}>
            {query.isLoading ? "Loading…" : "No history yet."}
          </Text>
        }
        renderItem={({ item }) => {
          const amount = Number(item.amount ?? 0);
          const isIn = amount >= 0;
          const title =
            item.source ??
            item.description ??
            (isIn ? "Points in" : "Points out");
          const ref = item.reference_label ? `#${item.reference_label}` : "";
          const when = item.occurred_at
            ? new Date(item.occurred_at).toLocaleString("id-ID")
            : "";

          return (
            <Card style={{ gap: 6 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: theme.colors.text, fontWeight: "900" }} numberOfLines={1}>
                    {title}
                  </Text>
                  {ref || when ? (
                    <Text style={{ color: theme.colors.muted, fontSize: 12 }} numberOfLines={1}>
                      {[ref, when].filter(Boolean).join(" • ")}
                    </Text>
                  ) : null}
                </View>
                <Text
                  style={{
                    color: isIn ? theme.colors.green : theme.colors.danger,
                    fontWeight: "900",
                  }}
                >
                  {isIn ? "+" : ""}
                  {amount.toLocaleString("id-ID")} fp
                </Text>
              </View>
            </Card>
          );
        }}
      />
    </Screen>
  );
}
