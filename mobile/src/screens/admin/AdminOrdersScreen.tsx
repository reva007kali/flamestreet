import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { Pressable, RefreshControl, Text, View } from "react-native";
import { api } from "../../lib/api";
import AppFlatList from "../../ui/AppFlatList";
import Screen from "../../ui/Screen";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import { theme } from "../../ui/theme";
import { usePullToRefresh } from "../../lib/usePullToRefresh";
import { useToast } from "../../ui/Toast";

type Order = any;

export default function AdminOrdersScreen() {
  const navigation = useNavigation<any>();
  const { refreshing, onRefresh } = usePullToRefresh();
  const toast = useToast();

  const query = useInfiniteQuery({
    queryKey: ["admin", "orders"],
    queryFn: async ({ pageParam }) => {
      const r = await api.get("/admin/orders", { params: { page: pageParam } });
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

  const rows: Order[] = (query.data?.pages ?? []).flatMap((p) => p.data);

  const quick = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const r = await api.put(`/admin/orders/${id}/status`, { status });
      return r.data?.order;
    },
    onSuccess: async () => {
      await query.refetch();
      toast.show({ variant: "success", title: "Order updated" });
    },
  });

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
              Orders
            </Text>
            <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
              Tap an order to see details.
            </Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={{ color: theme.colors.muted }}>
            {query.isLoading ? "Loading…" : "No orders"}
          </Text>
        }
        renderItem={({ item }: any) => (
          <Pressable onPress={() => navigation.navigate("AdminOrderDetail", { id: item.id })}>
            <Card style={{ gap: 8 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: theme.colors.text, fontWeight: "900" }} numberOfLines={1}>
                    #{item.order_number}
                  </Text>
                  <Text style={{ color: theme.colors.muted, fontSize: 12 }} numberOfLines={1}>
                    {item.status} • {item.payment_status} • Rp{" "}
                    {Number(item.total_amount ?? 0).toLocaleString("id-ID")}
                  </Text>
                </View>
                <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                  {item.created_at ? new Date(item.created_at).toLocaleDateString("id-ID") : ""}
                </Text>
              </View>

              {item.status !== "delivered" ? (
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <Button
                    variant="secondary"
                    onPress={() => quick.mutate({ id: item.id, status: "confirmed" })}
                    disabled={quick.isPending}
                    style={{ flex: 1, paddingVertical: 10 }}
                  >
                    Confirm
                  </Button>
                  <Button
                    variant="secondary"
                    onPress={() => quick.mutate({ id: item.id, status: "delivered" })}
                    disabled={quick.isPending}
                    style={{ flex: 1, paddingVertical: 10 }}
                  >
                    Deliver
                  </Button>
                </View>
              ) : null}
            </Card>
          </Pressable>
        )}
      />
    </Screen>
  );
}
