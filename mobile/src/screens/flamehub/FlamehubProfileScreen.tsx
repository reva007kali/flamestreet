import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "../../lib/api";
import { toPublicUrl } from "../../lib/assets";
import { RootStackParamList } from "../../navigation/types";
import Button from "../../ui/Button";
import Screen from "../../ui/Screen";
import { theme } from "../../ui/theme";
import { useAuthStore } from "../../store/authStore";

type ProfileRoute = RouteProp<RootStackParamList, "FlamehubProfile">;

export default function FlamehubProfileScreen({
  usernameOverride,
}: {
  usernameOverride?: string;
} = {}) {
  const navigation = useNavigation<any>();
  const route = useRoute<ProfileRoute>();
  const qc = useQueryClient();
  const myUsername = useAuthStore((s) => s.user?.username ?? null);
  const username = usernameOverride ?? route.params.username;
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<"posts" | "saved">("posts");

  const goRoot = (name: string, params?: any) => {
    const root = navigation.getParent?.("RootStack");
    if (root?.navigate) root.navigate(name as never, params as never);
    else navigation.navigate(name as never, params as never);
  };

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
  const gridGap = 2; // Gap lebih kecil untuk tampilan ala medsos
  const tileWidth = (width - gridGap * 2) / 3;
  const isMe = Boolean(
    myUsername && user?.username && myUsername === user.username,
  );
  const avatar = toPublicUrl(user?.avatar);

  const savedQuery = useInfiniteQuery({
    queryKey: ["flamehub", "saved"],
    enabled: isMe && tab === "saved",
    initialPageParam: null as number | null,
    queryFn: async ({ pageParam }) => {
      const r = await api.get("/flamehub/saved", {
        params: { cursor: pageParam },
      });
      return r.data as { data: any[]; next_cursor: number | null };
    },
    getNextPageParam: (last) => last?.next_cursor ?? null,
  });

  const savedPosts = (savedQuery.data?.pages ?? []).flatMap(
    (p) => p?.data ?? [],
  );
  const gridPosts = tab === "saved" ? savedPosts : posts;

  return (
    <Screen headerShown={false} allowUnderHeader>
      {/* HEADER NAV */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingTop: 50,
          paddingBottom: 10,
          backgroundColor: theme.colors.bg,
        }}
      >
        <Pressable
          onPress={() => {
            const tabs = navigation.getParent?.("FlamehubTabs");
            if (tabs?.navigate) tabs.navigate("Hub");
            else navigation.goBack();
          }}
          style={{ padding: 8, backgroundColor: "#1a1a1a", borderRadius: 12 }}
        >
          <Ionicons name="chevron-back" size={20} color={theme.colors.green} />
        </Pressable>
        <Text style={{ color: "#fff", fontWeight: "900", fontSize: 16 }}>
          @{user?.username ?? "Profile"}
        </Text>
        <Pressable
          onPress={() => navigation.navigate("FlamehubSearch")}
          style={{ padding: 8, backgroundColor: "#1a1a1a", borderRadius: 12 }}
        >
          <Ionicons name="search" size={20} color={theme.colors.muted} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* PROFILE INFO SECTION */}
        <View style={{ padding: 20, gap: 20 }}>
          <View style={{ flexDirection: "row", gap: 20, alignItems: "center" }}>
            <View
              style={{
                width: 86,
                height: 86,
                borderRadius: 43,
                borderWidth: 2,
                borderColor: theme.colors.green,
                padding: 3,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: 40,
                  backgroundColor: "#222",
                  overflow: "hidden",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {avatar ? (
                  <Image
                    source={{ uri: avatar }}
                    style={{ width: "100%", height: "100%" }}
                  />
                ) : (
                  <Text
                    style={{
                      color: theme.colors.green,
                      fontWeight: "900",
                      fontSize: 28,
                    }}
                  >
                    {(user?.username?.[0] ?? "F").toUpperCase()}
                  </Text>
                )}
              </View>
            </View>

            <View
              style={{
                flex: 1,
                flexDirection: "row",
                justifyContent: "space-around",
              }}
            >
              <View style={{ alignItems: "center" }}>
                <Text
                  style={{ color: "#fff", fontWeight: "900", fontSize: 18 }}
                >
                  {posts.length}
                </Text>
                <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                  Posts
                </Text>
              </View>
              <Pressable
                onPress={() =>
                  navigation.navigate("FlamehubFollowers", {
                    username: user?.username ?? username,
                  })
                }
                style={{ alignItems: "center" }}
              >
                <Text
                  style={{ color: "#fff", fontWeight: "900", fontSize: 18 }}
                >
                  {query.data?.stats?.followers ?? 0}
                </Text>
                <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                  Followers
                </Text>
              </Pressable>
              <View style={{ alignItems: "center" }}>
                <Text
                  style={{ color: "#fff", fontWeight: "900", fontSize: 18 }}
                >
                  {query.data?.stats?.following ?? 0}
                </Text>
                <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                  Following
                </Text>
              </View>
            </View>
          </View>

          <View>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Text style={{ color: "#fff", fontSize: 18, fontWeight: "900" }}>
                {user?.full_name ?? user?.username}
              </Text>
              {user?.is_trainer ? (
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={theme.colors.green}
                />
              ) : null}
            </View>
            {user?.flamehub_bio ? (
              <Text
                style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: 13,
                  marginTop: 6,
                  lineHeight: 18,
                }}
              >
                {user.flamehub_bio}
              </Text>
            ) : null}
            <Text
              style={{ color: theme.colors.muted, fontSize: 14, marginTop: 4 }}
            >
              Flame Street Member
            </Text>
          </View>

          {/* ACTIONS */}
          <View style={{ flexDirection: "row", gap: 10 }}>
            {!isMe ? (
              <Button
                style={{ flex: 1, borderRadius: 14, height: 44 }}
                variant={query.data?.is_following ? "secondary" : "primary"}
                onPress={() =>
                  followMutation.mutate({ follow: !query.data?.is_following })
                }
                disabled={followMutation.isPending}
              >
                <Text style={{ fontWeight: "900" }}>
                  {query.data?.is_following ? "Following" : "Follow"}
                </Text>
              </Button>
            ) : null}
            <Button
              style={{
                flex: 1,
                borderRadius: 14,
                height: 44,
                backgroundColor: isMe
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(255,255,255,0.05)",
              }}
              variant="secondary"
              onPress={() =>
                isMe ? goRoot("Profile") : navigation.navigate("FlamehubCreate")
              }
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Ionicons
                  name={isMe ? "create-outline" : "add-circle"}
                  size={18}
                  color="#fff"
                />
                <Text style={{ fontWeight: "900", color: "#fff" }}>
                  {isMe ? "Edit Profile" : "Share"}
                </Text>
              </View>
            </Button>
            {isMe ? (
              <Button
                style={{
                  flex: 1,
                  borderRadius: 14,
                  height: 44,
                  backgroundColor: theme.colors.green,
                }}
                variant="secondary"
                onPress={() => navigation.navigate("FlamehubCreate")}
              >
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <Ionicons name="add-circle" size={18} color="#000" />
                  <Text style={{ fontWeight: "900", color: "#000" }}>
                    New Post
                  </Text>
                </View>
              </Button>
            ) : null}
          </View>

          {isMe ? (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={() => setTab("posts")}
                style={{
                  flex: 1,
                  borderRadius: 14,
                  height: 40,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor:
                    tab === "posts"
                      ? "rgba(34,197,94,0.35)"
                      : "rgba(255,255,255,0.06)",
                  backgroundColor:
                    tab === "posts"
                      ? "rgba(34,197,94,0.10)"
                      : "rgba(255,255,255,0.03)",
                }}
              >
                <Text
                  style={{ color: "#fff", fontWeight: "900", fontSize: 12 }}
                >
                  Posts
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setTab("saved")}
                style={{
                  flex: 1,
                  borderRadius: 14,
                  height: 40,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor:
                    tab === "saved"
                      ? "rgba(34,197,94,0.35)"
                      : "rgba(255,255,255,0.06)",
                  backgroundColor:
                    tab === "saved"
                      ? "rgba(34,197,94,0.10)"
                      : "rgba(255,255,255,0.03)",
                }}
              >
                <Text
                  style={{ color: "#fff", fontWeight: "900", fontSize: 12 }}
                >
                  Saved
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        {/* POSTS GRID */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: gridGap }}>
          {gridPosts.map((p: any) => {
            const m = p.media?.[0];
            const src = toPublicUrl(m?.path);
            return (
              <Pressable
                key={String(p.id)}
                onPress={() =>
                  navigation.navigate("FlamehubPost", { id: Number(p.id) })
                }
                style={{
                  width: tileWidth,
                  aspectRatio: 3 / 5, // Ratio 3:5 sesuai permintaan
                  backgroundColor: "#111",
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
                      backgroundColor: "#050505",
                    }}
                  >
                    <Ionicons
                      name={m?.type === "video" ? "play" : "document-text"}
                      size={24}
                      color="#333"
                    />
                  </View>
                )}

                {/* Overlay details */}
                <LinearGradient
                  colors={["transparent", "rgba(0,0,0,0.6)"]}
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 40,
                    padding: 8,
                    justifyContent: "flex-end",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Ionicons name="heart" size={10} color="#fff" />
                    <Text
                      style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}
                    >
                      {p.like_count ?? 0}
                    </Text>
                  </View>
                </LinearGradient>

                {m?.type === "video" && (
                  <Ionicons
                    name="videocam"
                    size={16}
                    color="#fff"
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      opacity: 0.8,
                    }}
                  />
                )}
              </Pressable>
            );
          })}
        </View>

        {user && tab === "posts" && !posts.length ? (
          <View style={{ padding: 60, alignItems: "center", gap: 10 }}>
            <Ionicons name="images-outline" size={48} color="#222" />
            <Text style={{ color: theme.colors.muted, fontWeight: "700" }}>
              No posts yet
            </Text>
          </View>
        ) : null}

        {isMe &&
        tab === "saved" &&
        !savedQuery.isLoading &&
        savedPosts.length === 0 ? (
          <View style={{ padding: 60, alignItems: "center", gap: 10 }}>
            <Ionicons name="bookmark-outline" size={48} color="#222" />
            <Text style={{ color: theme.colors.muted, fontWeight: "700" }}>
              No saved posts yet
            </Text>
          </View>
        ) : null}

        {isMe && tab === "saved" && savedQuery.hasNextPage ? (
          <View style={{ padding: 20 }}>
            <Button
              variant="secondary"
              onPress={() => savedQuery.fetchNextPage()}
              disabled={savedQuery.isFetchingNextPage}
            >
              {savedQuery.isFetchingNextPage ? "Loading…" : "Load more"}
            </Button>
          </View>
        ) : null}

        <View style={{ height: 100 }} />
      </ScrollView>
    </Screen>
  );
}
