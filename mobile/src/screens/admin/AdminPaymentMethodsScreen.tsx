import { useInfiniteQuery } from "@tanstack/react-query";
import { RefreshControl, Text, View } from "react-native";
import { api } from "../../lib/api";
import AppFlatList from "../../ui/AppFlatList";
import Screen from "../../ui/Screen";
import Card from "../../ui/Card";
import { theme } from "../../ui/theme";
import { usePullToRefresh } from "../../lib/usePullToRefresh";

export default function AdminPaymentMethodsScreen() {
  const { refreshing, onRefresh } = usePullToRefresh();

  const query = useInfiniteQuery({
    queryKey: ["admin", "payment-methods"],
    queryFn: async ({ pageParam }) => {
      const r = await api.get("/admin/payment-methods", { params: { page: pageParam } });
      const data = r.data?.data ?? [];
      return {
        data: Array.isArray(data) ? data : [],
        nextPage:
          r.data?.current_page < r.data?.last_page
            ? r.data?.current_page + 1
            : undefined,
      };
    },
    initialPageParam: 1,
    getNextPageParam: (last) => last.nextPage,
  });

  const rows = (query.data?.pages ?? []).flatMap((p) => p.data);

  return (
    <Screen>
      <AppFlatList
        contentContainerStyle={{ padding: theme.spacing.md, gap: 12 }}
        data={rows}
        keyExtractor={(i: any) => String(i.id)}
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
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
        }}
        onEndReachedThreshold={0.35}
        ListHeaderComponent={
          <View style={{ gap: 4 }}>
            <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "900" }}>
              Payment methods
            </Text>
            <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
              Available checkout methods.
            </Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={{ color: theme.colors.muted }}>
            {query.isLoading ? "Loading…" : "No methods"}
          </Text>
        }
        renderItem={({ item }: any) => (
          <Card style={{ gap: 6 }}>
            <Text style={{ color: theme.colors.text, fontWeight: "900" }} numberOfLines={1}>
              {item.name ?? "—"}
            </Text>
            <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
              {item.code ?? "—"} • {item.is_active ? "Active" : "Inactive"}
            </Text>
          </Card>
        )}
      />
    </Screen>
  );
}
