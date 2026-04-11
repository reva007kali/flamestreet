import { useMutation, useQuery } from "@tanstack/react-query";
import { RouteProp, useRoute } from "@react-navigation/native";
import { useState } from "react";
import { Alert, RefreshControl, ScrollView, Text, View } from "react-native";
import { api } from "../../lib/api";
import Screen from "../../ui/Screen";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import TextField from "../../ui/TextField";
import { theme } from "../../ui/theme";
import { usePullToRefresh } from "../../lib/usePullToRefresh";
import { useToast } from "../../ui/Toast";
import { RootStackParamList } from "../../navigation/types";

type R = RouteProp<RootStackParamList, "AdminOrderDetail">;

export default function AdminOrderDetailScreen() {
  const route = useRoute<R>();
  const toast = useToast();
  const { refreshing, onRefresh } = usePullToRefresh();
  const [cancelReason, setCancelReason] = useState("");

  const query = useQuery({
    queryKey: ["admin", "order", route.params.id],
    queryFn: async () => {
      const r = await api.get(`/admin/orders/${route.params.id}`);
      return r.data?.order ?? null;
    },
    enabled: Boolean(route.params.id),
  });

  const update = useMutation({
    mutationFn: async (payload: any) => {
      const r = await api.put(`/admin/orders/${route.params.id}/status`, payload);
      return r.data?.order;
    },
    onSuccess: async () => {
      await query.refetch();
      toast.show({ variant: "success", title: "Order updated" });
    },
    onError: (e: any) => {
      Alert.alert("Update failed", e?.response?.data?.message ?? "Cannot update");
    },
  });

  const order = query.data as any;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}
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
        {!order ? (
          <Text style={{ color: theme.colors.muted }}>
            {query.isLoading ? "Loading…" : "Not found"}
          </Text>
        ) : (
          <>
            <Card style={{ gap: 6 }}>
              <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "900" }}>
                #{order.order_number}
              </Text>
              <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                {order.status} • {order.payment_status}
              </Text>
              <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                Rp {Number(order.total_amount ?? 0).toLocaleString("id-ID")}
              </Text>
            </Card>

            <Card style={{ gap: 10 }}>
              <Text style={{ color: theme.colors.text, fontWeight: "900" }}>Actions</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {["pending", "confirmed", "delivering", "delivered"].map((s) => (
                  <Button
                    key={s}
                    variant={order.status === s ? "primary" : "secondary"}
                    onPress={() => update.mutate({ status: s })}
                    disabled={update.isPending}
                    style={{ paddingVertical: 10 }}
                  >
                    {s}
                  </Button>
                ))}
              </View>

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {["unpaid", "paid", "refunded"].map((ps) => (
                  <Button
                    key={ps}
                    variant={order.payment_status === ps ? "primary" : "secondary"}
                    onPress={() => update.mutate({ payment_status: ps })}
                    disabled={update.isPending}
                    style={{ paddingVertical: 10 }}
                  >
                    {ps}
                  </Button>
                ))}
              </View>

              <TextField
                label="Cancel reason (optional)"
                value={cancelReason}
                onChangeText={setCancelReason}
                placeholder="Reason"
              />
              <Button
                variant="danger"
                onPress={() => update.mutate({ status: "cancelled", cancelled_reason: cancelReason || null })}
                disabled={update.isPending}
              >
                Cancel order
              </Button>
            </Card>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
