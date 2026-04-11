import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { Alert, FlatList, RefreshControl, Text, View } from "react-native";
import { api } from "../../lib/api";
import Screen from "../../ui/Screen";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import { theme } from "../../ui/theme";
import { usePullToRefresh } from "../../lib/usePullToRefresh";
import { useToast } from "../../ui/Toast";

export default function AdminTrainersScreen() {
  const { refreshing, onRefresh } = usePullToRefresh();
  const toast = useToast();

  const query = useInfiniteQuery({
    queryKey: ["admin", "trainers"],
    queryFn: async ({ pageParam }) => {
      const r = await api.get("/admin/trainers", { params: { page: pageParam } });
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

  const verify = useMutation({
    mutationFn: async ({ id, is_verified }: { id: number; is_verified: boolean }) => {
      const r = await api.put(`/admin/trainers/${id}/verify`, { is_verified });
      return r.data?.trainer_profile;
    },
    onSuccess: async () => {
      await query.refetch();
      toast.show({ variant: "success", title: "Trainer updated" });
    },
    onError: (e: any) => {
      Alert.alert("Failed", e?.response?.data?.message ?? "Cannot update trainer");
    },
  });

  const rows = (query.data?.pages ?? []).flatMap((p) => p.data);

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
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
        }}
        onEndReachedThreshold={0.35}
        ListHeaderComponent={
          <View style={{ gap: 4 }}>
            <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "900" }}>
              Trainers
            </Text>
            <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
              Verify trainers.
            </Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={{ color: theme.colors.muted }}>
            {query.isLoading ? "Loading…" : "No trainers"}
          </Text>
        }
        renderItem={({ item }: any) => {
          const tp = item.trainer_profile;
          const verified = Boolean(tp?.is_verified);
          const tpId = Number(tp?.id ?? 0);
          return (
            <Card style={{ gap: 10 }}>
              <View style={{ gap: 2 }}>
                <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                  {item.full_name ?? item.username ?? "—"}
                </Text>
                <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                  @{item.username ?? "—"} • {item.email ?? "—"}
                </Text>
                <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                  Gym: {tp?.gym?.gym_name ?? "—"} • Tier: {tp?.tier ?? "—"} • Points:{" "}
                  {Number(tp?.total_points ?? 0).toLocaleString("id-ID")}
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Button
                  variant={verified ? "secondary" : "primary"}
                  onPress={() => {
                    if (!tpId) return;
                    verify.mutate({ id: tpId, is_verified: !verified });
                  }}
                  disabled={verify.isPending || !tpId}
                  style={{ flex: 1, paddingVertical: 10 }}
                >
                  {verified ? "Unverify" : "Verify"}
                </Button>
              </View>
            </Card>
          );
        }}
      />
    </Screen>
  );
}

