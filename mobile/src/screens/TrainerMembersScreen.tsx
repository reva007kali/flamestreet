import { useInfiniteQuery } from "@tanstack/react-query";
import { FlatList, Image, RefreshControl, Text, View } from "react-native";
import { useMemo, useState } from "react";
import { api } from "../lib/api";
import { toPublicUrl } from "../lib/assets";
import Screen from "../ui/Screen";
import Card from "../ui/Card";
import { theme } from "../ui/theme";
import { usePullToRefresh } from "../lib/usePullToRefresh";
import TextField from "../ui/TextField";

type ReferralRow = {
  member: {
    id: number;
    full_name?: string | null;
    username?: string | null;
    email?: string | null;
    phone_number?: string | null;
    avatar?: string | null;
  };
  total_purchase?: number | string | null;
  items_count?: number | null;
};

export default function TrainerMembersScreen() {
  const { refreshing, onRefresh } = usePullToRefresh();
  const [q, setQ] = useState("");
  const [minPurchase, setMinPurchase] = useState<number>(0);
  const [sort, setSort] = useState<"newest" | "purchase_desc" | "purchase_asc">(
    "purchase_desc",
  );

  const query = useInfiniteQuery({
    queryKey: ["trainer", "referrals", { q, minPurchase, sort }],
    queryFn: async ({ pageParam }) => {
      const params: any = { page: pageParam };
      if (q) params.q = q;
      if (minPurchase) params.min_purchase = minPurchase;
      if (sort) params.sort = sort;
      const r = await api.get("/trainer/referrals", { params });
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
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });

  const rows: ReferralRow[] = (query.data?.pages ?? []).flatMap((p) => p.data);
  const summary = useMemo(() => {
    const totalPurchase = rows.reduce(
      (s, r) => s + Number(r.total_purchase ?? 0),
      0,
    );
    const totalItems = rows.reduce((s, r) => s + Number(r.items_count ?? 0), 0);
    return { totalPurchase, totalItems };
  }, [rows]);

  return (
    <Screen>
      <FlatList
        contentContainerStyle={{ padding: theme.spacing.md, gap: 12 }}
        data={rows}
        keyExtractor={(i) => String(i.member?.id)}
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
          <View style={{ gap: 12 }}>
            <View style={{ gap: 6 }}>
              <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "900" }}>
                My Members
              </Text>
              <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                Total purchase: Rp {summary.totalPurchase.toLocaleString("id-ID")} • Items:{" "}
                {summary.totalItems.toLocaleString("id-ID")}
              </Text>
            </View>
            <Card style={{ gap: 10 }}>
              <TextField
                label="Search"
                value={q}
                onChangeText={setQ}
                placeholder="Name / username"
                autoCapitalize="none"
              />
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {[
                  { label: "All", v: 0 },
                  { label: "≥ 100k", v: 100000 },
                  { label: "≥ 500k", v: 500000 },
                  { label: "≥ 1M", v: 1000000 },
                ].map((f) => {
                  const active = minPurchase === f.v;
                  return (
                    <Text
                      key={f.label}
                      onPress={() => setMinPurchase(f.v)}
                      style={{
                        color: active ? theme.colors.text : theme.colors.muted,
                        fontWeight: "900",
                        borderWidth: 1,
                        borderColor: active ? theme.colors.green : theme.colors.border,
                        backgroundColor: active ? "#0b1b12" : "transparent",
                        borderRadius: 999,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                      }}
                    >
                      {f.label}
                    </Text>
                  );
                })}
              </View>
              <View style={{ flexDirection: "row", gap: 10 }}>
                {[
                  { label: "Top", v: "purchase_desc" as const },
                  { label: "Low", v: "purchase_asc" as const },
                  { label: "New", v: "newest" as const },
                ].map((s) => (
                  <Text
                    key={s.v}
                    onPress={() => setSort(s.v)}
                    style={{
                      color: sort === s.v ? theme.colors.text : theme.colors.muted,
                      fontWeight: "900",
                      borderWidth: 1,
                      borderColor: sort === s.v ? theme.colors.green : theme.colors.border,
                      backgroundColor: sort === s.v ? "#0b1b12" : "transparent",
                      borderRadius: 999,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                    }}
                  >
                    {s.label}
                  </Text>
                ))}
              </View>
            </Card>
          </View>
        }
        ListEmptyComponent={
          <Text style={{ color: theme.colors.muted }}>
            {query.isLoading ? "Loading…" : "No members yet."}
          </Text>
        }
        renderItem={({ item }) => {
          const name = item.member?.full_name ?? item.member?.username ?? "—";
          const uname = item.member?.username ? `@${item.member.username}` : "";
          const totalPurchase = Number(item.total_purchase ?? 0);
          const itemsCount = Number(item.items_count ?? 0);
          const avatar = toPublicUrl(item.member?.avatar);

          return (
            <Card style={{ gap: 10 }}>
              <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                {avatar ? (
                  <Image
                    source={{ uri: avatar }}
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 21,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      backgroundColor: "#0a0f0c",
                    }}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 21,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      backgroundColor: "#0a0f0c",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ color: theme.colors.muted, fontWeight: "900" }}>
                      {(String(name).trim()[0] ?? "M").toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: theme.colors.text, fontWeight: "900" }} numberOfLines={1}>
                    {name}{" "}
                    {uname ? <Text style={{ color: theme.colors.muted }}> {uname}</Text> : null}
                  </Text>
                  <Text style={{ color: theme.colors.muted, fontSize: 12 }} numberOfLines={1}>
                    Total purchase: Rp {totalPurchase.toLocaleString("id-ID")}
                  </Text>
                  <Text style={{ color: theme.colors.muted, fontSize: 12 }} numberOfLines={1}>
                    Items purchased: {itemsCount.toLocaleString("id-ID")}
                  </Text>
                </View>
              </View>
            </Card>
          );
        }}
      />
    </Screen>
  );
}
