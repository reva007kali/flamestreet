import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { api } from "../../lib/api";
import Screen from "../../ui/Screen";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import { theme } from "../../ui/theme";
import { usePullToRefresh } from "../../lib/usePullToRefresh";
import { useToast } from "../../ui/Toast";

export default function AdminRedeemsScreen() {
  const { refreshing, onRefresh } = usePullToRefresh();
  const toast = useToast();
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">("pending");

  const query = useQuery({
    queryKey: ["admin", "redeems", status],
    queryFn: async () => (await api.get("/admin/redeems", { params: { status } })).data,
  });

  const act = useMutation({
    mutationFn: async ({
      id,
      action,
    }: {
      id: number;
      action: "approve" | "reject";
    }) => {
      const r = await api.put(`/admin/redeems/${id}`, { action });
      return r.data?.redeem;
    },
    onSuccess: async () => {
      await query.refetch();
      toast.show({ variant: "success", title: "Updated" });
    },
  });

  const rows = query.data?.data ?? [];

  return (
    <Screen>
      <FlatList
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
        ListHeaderComponent={
          <Card style={{ gap: 10 }}>
            <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "900" }}>
              Redeems
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {(["pending", "approved", "rejected"] as const).map((s) => (
                <Button
                  key={s}
                  variant={status === s ? "primary" : "secondary"}
                  onPress={() => setStatus(s)}
                  style={{ flex: 1, paddingVertical: 10 }}
                >
                  {s}
                </Button>
              ))}
            </View>
          </Card>
        }
        ListEmptyComponent={
          <Text style={{ color: theme.colors.muted }}>
            {query.isLoading ? "Loading…" : "No redeems"}
          </Text>
        }
        renderItem={({ item }: any) => (
          <Card style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: theme.colors.text, fontWeight: "900" }} numberOfLines={1}>
                  {item.trainer_profile?.user?.full_name ??
                    item.trainer_profile?.user?.username ??
                    "Trainer"}
                </Text>
                <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                  {item.status} • {item.deducted ? "deducted" : "not deducted"}
                </Text>
              </View>
              <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                {Number(item.amount ?? 0).toLocaleString("id-ID")} fp
              </Text>
            </View>

            {status === "pending" ? (
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Button
                  onPress={() => act.mutate({ id: item.id, action: "approve" })}
                  disabled={act.isPending}
                  style={{ flex: 1, paddingVertical: 10 }}
                >
                  Approve
                </Button>
                <Button
                  variant="danger"
                  onPress={() => {
                    Alert.alert("Reject", "Reject this request?", [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Reject",
                        style: "destructive",
                        onPress: () => act.mutate({ id: item.id, action: "reject" }),
                      },
                    ]);
                  }}
                  disabled={act.isPending}
                  style={{ flex: 1, paddingVertical: 10 }}
                >
                  Reject
                </Button>
              </View>
            ) : null}
          </Card>
        )}
      />
    </Screen>
  );
}

