import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { api } from "../../lib/api";
import Screen from "../../ui/Screen";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import TextField from "../../ui/TextField";
import { theme } from "../../ui/theme";
import { usePullToRefresh } from "../../lib/usePullToRefresh";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth();
  return new Date(y, m, 1).toISOString().slice(0, 10);
}

function money(v: any) {
  return `Rp ${Number(v ?? 0).toLocaleString("id-ID")}`;
}

export default function AdminDashboardScreen() {
  const { refreshing, onRefresh } = usePullToRefresh();
  const [from, setFrom] = useState(monthStartIso());
  const [to, setTo] = useState(todayIso());

  const query = useQuery({
    queryKey: ["admin", "dashboard", { from, to }],
    queryFn: async () => {
      const r = await api.get("/admin/dashboard", { params: { from, to } });
      return r.data ?? {};
    },
  });

  const counts = query.data?.counts ?? {};
  const sales = query.data?.sales ?? {};
  const topProducts = query.data?.top_products ?? [];
  const topMembers = query.data?.top_members ?? [];
  const topTrainers = query.data?.top_trainers ?? [];

  const rangeLabel = useMemo(() => {
    const f = query.data?.range?.from ?? from;
    const t = query.data?.range?.to ?? to;
    return `${f} → ${t}`;
  }, [query.data?.range?.from, query.data?.range?.to, from, to]);

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}
        refreshControl={
          <RefreshControl
            tintColor={theme.colors.text}
            refreshing={refreshing || query.isFetching}
            onRefresh={onRefresh}
          />
        }
      >
        <View style={{ gap: 4 }}>
          <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: "900" }}>
            Dashboard
          </Text>
          <Text style={{ color: theme.colors.muted, fontSize: 12 }}>{rangeLabel}</Text>
        </View>

        <Card style={{ gap: 12 }}>
          <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
            Date range
          </Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <TextField label="From (YYYY-MM-DD)" value={from} onChangeText={setFrom} />
            </View>
            <View style={{ flex: 1 }}>
              <TextField label="To (YYYY-MM-DD)" value={to} onChangeText={setTo} />
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button
              variant="secondary"
              onPress={() => {
                const t = todayIso();
                setFrom(t);
                setTo(t);
              }}
              style={{ flex: 1, paddingVertical: 10 }}
            >
              Hari ini
            </Button>
            <Button
              onPress={() => query.refetch()}
              style={{ flex: 1, paddingVertical: 10 }}
            >
              Refresh
            </Button>
          </View>
        </Card>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <Card style={{ flex: 1, gap: 6 }}>
            <Text style={{ color: theme.colors.muted, fontSize: 12 }}>Net sales</Text>
            <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "900" }}>
              {money(sales.net_sales)}
            </Text>
            <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
              {Number(sales.orders_paid ?? 0).toLocaleString("id-ID")} paid orders
            </Text>
          </Card>
          <Card style={{ flex: 1, gap: 6 }}>
            <Text style={{ color: theme.colors.muted, fontSize: 12 }}>Net profit</Text>
            <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "900" }}>
              {money(sales.net_profit)}
            </Text>
            <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
              COGS: {money(sales.cogs)}
            </Text>
          </Card>
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {[
            { label: "Users", value: counts.users },
            { label: "Trainers", value: counts.trainers },
            { label: "Members", value: counts.members },
            { label: "Products", value: counts.products },
            { label: "Orders", value: counts.orders },
          ].map((c) => (
            <Card key={c.label} style={{ width: "47%", gap: 4 }}>
              <Text style={{ color: theme.colors.muted, fontSize: 12 }}>{c.label}</Text>
              <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "900" }}>
                {Number(c.value ?? 0).toLocaleString("id-ID")}
              </Text>
            </Card>
          ))}
        </View>

        <Card style={{ gap: 10 }}>
          <Text style={{ color: theme.colors.text, fontWeight: "900" }}>Top products</Text>
          {(topProducts as any[]).slice(0, 8).map((p: any) => (
            <View
              key={p.product_id}
              style={{
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.md,
                padding: 12,
                gap: 4,
              }}
            >
              <Text style={{ color: theme.colors.text, fontWeight: "900" }} numberOfLines={1}>
                {p.product_name}
              </Text>
              <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                {Number(p.qty_sold ?? 0).toLocaleString("id-ID")} sold • {money(p.revenue)}
              </Text>
            </View>
          ))}
          {!(topProducts as any[]).length ? (
            <Text style={{ color: theme.colors.muted }}>No data.</Text>
          ) : null}
        </Card>

        <Card style={{ gap: 10 }}>
          <Text style={{ color: theme.colors.text, fontWeight: "900" }}>Top members</Text>
          {(topMembers as any[]).slice(0, 8).map((m: any) => (
            <View
              key={m.member_id}
              style={{
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.md,
                padding: 12,
                gap: 4,
              }}
            >
              <Text style={{ color: theme.colors.text, fontWeight: "900" }} numberOfLines={1}>
                {m.full_name ?? m.username ?? "—"}
              </Text>
              <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                {Number(m.orders_count ?? 0).toLocaleString("id-ID")} orders • {money(m.total_purchase)}
              </Text>
            </View>
          ))}
          {!(topMembers as any[]).length ? (
            <Text style={{ color: theme.colors.muted }}>No data.</Text>
          ) : null}
        </Card>

        <Card style={{ gap: 10 }}>
          <Text style={{ color: theme.colors.text, fontWeight: "900" }}>Top trainers</Text>
          {(topTrainers as any[]).slice(0, 8).map((t: any) => (
            <View
              key={t.id}
              style={{
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.md,
                padding: 12,
                gap: 4,
              }}
            >
              <Text style={{ color: theme.colors.text, fontWeight: "900" }} numberOfLines={1}>
                {t.full_name ?? t.username ?? "—"}
              </Text>
              <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                {Number(t.total_points ?? 0).toLocaleString("id-ID")} fp • {t.tier ?? "—"}
              </Text>
            </View>
          ))}
          {!(topTrainers as any[]).length ? (
            <Text style={{ color: theme.colors.muted }}>No data.</Text>
          ) : null}
        </Card>
      </ScrollView>
    </Screen>
  );
}

