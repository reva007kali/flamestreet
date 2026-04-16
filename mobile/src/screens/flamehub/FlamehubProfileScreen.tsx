import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { api } from "../../lib/api";
import { toPublicUrl } from "../../lib/assets";
import { RootStackParamList } from "../../navigation/types";
import Button from "../../ui/Button";
import Card from "../../ui/Card";
import Screen from "../../ui/Screen";
import { theme } from "../../ui/theme";
import { useAuthStore } from "../../store/authStore";

type ProfileRoute = RouteProp<RootStackParamList, "FlamehubProfile">;

export default function FlamehubProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<ProfileRoute>();
  const qc = useQueryClient();
  const myUsername = useAuthStore((s) => s.user?.username ?? null);
  const username = route.params.username;

  const query = useQuery({
    queryKey: ["flamehub", "profile", username],
    queryFn: async () => (await api.get(`/flamehub/users/${username}`)).data,
  });

  const followMutation = useMutation({
    mutationFn: async ({ follow }: { follow: boolean }) => {
      if (follow)
        return (await api.post(`/flamehub/users/${username}/follow`)).data;
      return (await api.delete(`/flamehub/users/${username}/follow`)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flamehub", "profile", username] });
    },
  });

  const user = query.data?.user;
  const posts = query.data?.posts ?? [];
  const isMe = Boolean(
    myUsername && user?.username && myUsername === user.username,
  );
  const avatar = toPublicUrl(user?.avatar);

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.md, gap: 12 }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Pressable onPress={() => navigation.goBack()}>
            <Text style={{ color: theme.colors.green, fontWeight: "900" }}>
              Back
            </Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate("FlamehubSearch")}>
            <Text style={{ color: theme.colors.muted, fontWeight: "900" }}>
              Search
            </Text>
          </Pressable>
        </View>

        {query.isLoading ? (
          <Text style={{ color: theme.colors.muted }}>Loading…</Text>
        ) : null}
        {query.isError ? (
          <Text style={{ color: theme.colors.danger }}>
            Failed to load profile.
          </Text>
        ) : null}

        {user ? (
          <Card style={{ gap: 12 }}>
            <View
              style={{ flexDirection: "row", gap: 12, alignItems: "center" }}
            >
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 22,
                  borderWidth: 1,
                  borderColor: "rgba(34,197,94,0.25)",
                  backgroundColor: "rgba(34,197,94,0.12)",
                  overflow: "hidden",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {avatar ? (
                  <Image
                    source={{ uri: avatar }}
                    style={{ width: 72, height: 72 }}
                  />
                ) : (
                  <Text
                    style={{
                      color: theme.colors.green,
                      fontWeight: "900",
                      fontSize: 22,
                    }}
                  >
                    {(user.username?.[0] ?? "F").toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: theme.colors.text,
                    fontSize: 20,
                    fontWeight: "900",
                  }}
                >
                  @{user.username}
                </Text>
                {user.full_name ? (
                  <Text style={{ color: theme.colors.muted }} numberOfLines={1}>
                    {user.full_name}
                  </Text>
                ) : null}
                <View style={{ flexDirection: "row", gap: 14, marginTop: 8 }}>
                  <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                    <Text
                      style={{ color: theme.colors.text, fontWeight: "900" }}
                    >
                      {query.data?.stats?.followers ?? 0}
                    </Text>{" "}
                    followers
                  </Text>
                  <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                    <Text
                      style={{ color: theme.colors.text, fontWeight: "900" }}
                    >
                      {query.data?.stats?.following ?? 0}
                    </Text>{" "}
                    following
                  </Text>
                </View>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
              {!isMe ? (
                <Button
                  style={{ flex: 1 }}
                  variant={query.data?.is_following ? "secondary" : "primary"}
                  onPress={() =>
                    followMutation.mutate({ follow: !query.data?.is_following })
                  }
                  disabled={followMutation.isPending}
                >
                  {query.data?.is_following ? "Following" : "Follow"}
                </Button>
              ) : null}
              <Button
                style={{ flex: 1 }}
                variant="secondary"
                onPress={() => navigation.navigate("FlamehubCreate")}
              >
                Post
              </Button>
            </View>
          </Card>
        ) : null}

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {posts.map((p: any) => {
            const m = p.media?.[0];
            const src = toPublicUrl(m?.path);
            return (
              <Pressable
                key={String(p.id)}
                onPress={() =>
                  navigation.navigate("FlamehubPost", { id: Number(p.id) })
                }
                style={{
                  width: "31%",
                  aspectRatio: 1,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  backgroundColor: "#0a0f0c",
                  overflow: "hidden",
                }}
              >
                {src && m?.type === "image" ? (
                  <Image
                    source={{ uri: src }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={{
                      flex: 1,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{ color: theme.colors.muted, fontWeight: "900" }}
                    >
                      {m?.type === "video" ? "Video" : "Post"}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {user && !posts.length ? (
          <Text style={{ color: theme.colors.muted }}>Belum ada post.</Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
