import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Alert, RefreshControl, ScrollView, Text, View } from "react-native";
import { api } from "../../lib/api";
import Screen from "../../ui/Screen";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import TextField from "../../ui/TextField";
import { theme } from "../../ui/theme";
import { usePullToRefresh } from "../../lib/usePullToRefresh";
import { useToast } from "../../ui/Toast";

type Row = { key: string; value: string; description?: string | null };

export default function AdminPointSettingsScreen() {
  const { refreshing, onRefresh } = usePullToRefresh();
  const toast = useToast();

  const query = useQuery({
    queryKey: ["admin", "point-settings"],
    queryFn: async () => (await api.get("/admin/point-settings")).data,
  });

  const initial: Row[] = useMemo(() => query.data?.settings ?? [], [query.data?.settings]);
  const [local, setLocal] = useState<Row[]>([]);

  const rows = local.length ? local : initial;

  const save = useMutation({
    mutationFn: async () => {
      const payload = { settings: rows.map((r) => ({ key: r.key, value: r.value, description: r.description ?? null })) };
      return (await api.put("/admin/point-settings", payload)).data;
    },
    onSuccess: async () => {
      setLocal([]);
      await query.refetch();
      toast.show({ variant: "success", title: "Saved" });
    },
    onError: (e: any) => {
      Alert.alert("Save failed", e?.response?.data?.message ?? "Cannot save");
    },
  });

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.md, gap: 12 }}
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
        <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "900" }}>
          Point settings
        </Text>

        <Card style={{ gap: 10 }}>
          {rows.map((r, idx) => (
            <View key={r.key} style={{ gap: 6 }}>
              <Text style={{ color: theme.colors.muted, fontSize: 12 }}>{r.key}</Text>
              <TextField
                label="Value"
                value={r.value ?? ""}
                onChangeText={(v) => {
                  const next = (local.length ? local : initial).map((x) => ({ ...x }));
                  next[idx] = { ...next[idx], value: v };
                  setLocal(next);
                }}
                placeholder="Value"
              />
              {r.description ? (
                <Text style={{ color: theme.colors.muted, fontSize: 12 }}>{r.description}</Text>
              ) : null}
              {idx !== rows.length - 1 ? (
                <View style={{ height: 1, backgroundColor: theme.colors.border }} />
              ) : null}
            </View>
          ))}

          {!rows.length ? (
            <Text style={{ color: theme.colors.muted }}>
              {query.isLoading ? "Loading…" : "No settings"}
            </Text>
          ) : null}
        </Card>

        <Button onPress={() => save.mutate()} disabled={save.isPending || !rows.length}>
          {save.isPending ? "Saving..." : "Save changes"}
        </Button>
      </ScrollView>
    </Screen>
  );
}

