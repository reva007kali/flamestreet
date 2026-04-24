import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshControl, Text, View } from "react-native";
import Screen from "../ui/Screen";
import Card from "../ui/Card";
import AppFlatList from "../ui/AppFlatList";
import { theme } from "../ui/theme";
import { api } from "../lib/api";
import Button from "../ui/Button";
import { usePullToRefresh } from "../lib/usePullToRefresh";

type InvitationRow = {
  id: number;
  status: string;
  created_at?: string | null;
  trainer?: {
    id: number;
    full_name?: string | null;
    username?: string | null;
    email?: string | null;
  } | null;
};

export default function MemberInvitationsScreen() {
  const qc = useQueryClient();
  const { refreshing, onRefresh } = usePullToRefresh();

  const query = useQuery({
    queryKey: ["member", "invitations"],
    queryFn: async () => (await api.get("/member/invitations")).data,
    staleTime: 5_000,
  });

  const accept = useMutation({
    mutationFn: async (id: number) => {
      await api.post(`/member/invitations/${id}/accept`);
      return true;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["member", "invitations"] });
      await qc.invalidateQueries({ queryKey: ["me"] });
    },
  });

  const reject = useMutation({
    mutationFn: async (id: number) => {
      await api.post(`/member/invitations/${id}/reject`);
      return true;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["member", "invitations"] });
    },
  });

  const rows: InvitationRow[] = query.data?.invitations ?? [];
  const busy = accept.isPending || reject.isPending;

  return (
    <Screen>
      <AppFlatList<InvitationRow>
        contentContainerStyle={{ padding: theme.spacing.md, gap: 12 }}
        data={rows}
        keyExtractor={(i) => String(i.id)}
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
          <View style={{ gap: 6 }}>
            <Text
              style={{
                color: theme.colors.text,
                fontSize: 20,
                fontWeight: "900",
              }}
            >
              Invitations
            </Text>
            <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
              {rows.length
                ? `${rows.length} pending`
                : "No pending invitations"}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={{ color: theme.colors.muted }}>
            {query.isLoading ? "Loading…" : "No invitations."}
          </Text>
        }
        renderItem={({ item }) => {
          const t = item.trainer ?? null;
          const name = t?.full_name ?? t?.username ?? "Trainer";
          const uname = t?.username ? `@${t.username}` : "";
          return (
            <Card style={{ gap: 10 }}>
              <View style={{ gap: 2 }}>
                <Text
                  style={{ color: theme.colors.text, fontWeight: "900" }}
                  numberOfLines={1}
                >
                  {name}
                  {uname ? (
                    <Text style={{ color: theme.colors.muted }}> {uname}</Text>
                  ) : null}
                </Text>
                <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                  Invitation untuk jadi member referral
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Button
                    disabled={busy}
                    onPress={() => accept.mutate(item.id)}
                    variant="primary"
                  >
                    Accept
                  </Button>
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    disabled={busy}
                    onPress={() => reject.mutate(item.id)}
                    variant="secondary"
                  >
                    Reject
                  </Button>
                </View>
              </View>
            </Card>
          );
        }}
      />

      {accept.isError || reject.isError ? (
        <View style={{ padding: theme.spacing.md }}>
          <Card
            style={{
              borderColor: theme.colors.danger,
              backgroundColor: "#1a0b0b",
            }}
          >
            <Text style={{ color: theme.colors.text, fontWeight: "800" }}>
              {
                ((accept.error as any)?.response?.data?.message ??
                  (accept.error as any)?.message ??
                  (reject.error as any)?.response?.data?.message ??
                  (reject.error as any)?.message ??
                  "Gagal") as string
              }
            </Text>
          </Card>
        </View>
      ) : null}
    </Screen>
  );
}
