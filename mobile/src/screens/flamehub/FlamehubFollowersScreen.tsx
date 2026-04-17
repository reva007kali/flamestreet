import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RouteProp, useRoute } from "@react-navigation/native";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { api } from "../../lib/api";
import { toPublicUrl } from "../../lib/assets";
import { RootStackParamList } from "../../navigation/types";
import Button from "../../ui/Button";
import Screen from "../../ui/Screen";
import { theme } from "../../ui/theme";
import { useAuthStore } from "../../store/authStore";
import { Ionicons } from "@expo/vector-icons";

type FollowersRoute = RouteProp<RootStackParamList, "FlamehubFollowers">;

export default function FlamehubFollowersScreen() {
  const route = useRoute<FollowersRoute>();
  const qc = useQueryClient();
  const myUsername = useAuthStore((s) => s.user?.username ?? null);
  const username = route.params.username;

  const query = useInfiniteQuery({
    queryKey: ["flamehub", "followers", username],
    initialPageParam: null as number | null,
    queryFn: async ({ pageParam }) => {
      const r = await api.get(`/flamehub/users/${username}/followers`, {
        params: { cursor: pageParam },
      });
      return r.data as { data: any[]; next_cursor: number | null };
    },
    getNextPageParam: (last) => last?.next_cursor ?? null,
  });

  const followMutation = useMutation({
    mutationFn: async ({
      targetUsername,
      follow,
    }: {
      targetUsername: string;
      follow: boolean;
    }) => {
      if (follow) {
        return (await api.post(`/flamehub/users/${targetUsername}/follow`)).data;
      }
      return (await api.delete(`/flamehub/users/${targetUsername}/follow`)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flamehub", "followers", username] });
    },
  });

  const items = (query.data?.pages ?? []).flatMap((p) => p?.data ?? []);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        {items.map((u: any) => {
          const avatar = toPublicUrl(u.avatar);
          const isMe = Boolean(myUsername && u.username && myUsername === u.username);
          return (
            <View
              key={String(u.id)}
              style={{
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.06)",
                borderRadius: 16,
                backgroundColor: "#111",
                padding: 12,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  overflow: "hidden",
                  backgroundColor: "#222",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {avatar ? (
                  <Image source={{ uri: avatar }} style={{ width: "100%", height: "100%" }} />
                ) : (
                  <Text style={{ color: theme.colors.green, fontWeight: "900", fontSize: 18 }}>
                    {(u.username?.[0] ?? "F").toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={{ color: "#fff", fontWeight: "900", fontSize: 14 }}>
                    @{u.username}
                  </Text>
                  {u.is_trainer ? (
                    <Ionicons name="checkmark-circle" size={14} color={theme.colors.green} />
                  ) : null}
                </View>
                {u.full_name ? (
                  <Text style={{ color: theme.colors.muted, fontSize: 12 }}>{u.full_name}</Text>
                ) : null}
              </View>
              {!isMe ? (
                <Pressable
                  onPress={() =>
                    followMutation.mutate({
                      targetUsername: u.username,
                      follow: !u.is_following,
                    })
                  }
                  style={{
                    paddingHorizontal: 12,
                    height: 32,
                    borderRadius: 999,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: u.is_following
                      ? "rgba(255,255,255,0.18)"
                      : "rgba(34,197,94,0.4)",
                    backgroundColor: u.is_following
                      ? "rgba(255,255,255,0.03)"
                      : "rgba(34,197,94,0.14)",
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "900", fontSize: 12 }}>
                    {u.is_following ? "Following" : "Follow"}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          );
        })}

        {!query.isLoading && items.length === 0 ? (
          <Text style={{ color: theme.colors.muted, textAlign: "center", marginTop: 20 }}>
            No followers yet
          </Text>
        ) : null}

        {query.hasNextPage ? (
          <Button
            variant="secondary"
            onPress={() => query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
          >
            {query.isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

