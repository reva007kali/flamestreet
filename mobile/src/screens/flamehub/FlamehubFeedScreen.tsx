import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { Image, Pressable, Share, Text, View } from "react-native";
import { api } from "../../lib/api";
import { toPublicUrl } from "../../lib/assets";
import AppFlatList from "../../ui/AppFlatList";
import Button from "../../ui/Button";
import Card from "../../ui/Card";
import Screen from "../../ui/Screen";
import { theme } from "../../ui/theme";

type UserBrief = {
  id: number;
  username: string;
  full_name?: string | null;
  avatar?: string | null;
};

type Media = {
  id: number;
  type: "image" | "video";
  path: string;
  sort_order?: number;
};

type Post = {
  id: number;
  caption?: string | null;
  created_at?: string | null;
  user: UserBrief;
  media: Media[];
  like_count?: number;
  comment_count?: number;
  liked_by_me?: boolean;
};

export default function FlamehubFeedScreen() {
  const navigation = useNavigation<any>();
  const qc = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: ["flamehub", "feed"],
    initialPageParam: null as number | null,
    queryFn: async ({ pageParam }) => {
      const r = await api.get("/flamehub/feed", {
        params: { cursor: pageParam },
      });
      return r.data as { data: Post[]; next_cursor: number | null };
    },
    getNextPageParam: (lastPage) => lastPage?.next_cursor ?? null,
  });

  const likeMutation = useMutation({
    mutationFn: async ({ postId, like }: { postId: number; like: boolean }) => {
      if (like) return (await api.post(`/flamehub/posts/${postId}/like`)).data;
      return (await api.delete(`/flamehub/posts/${postId}/like`)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flamehub", "feed"] });
    },
  });

  const items = (query.data?.pages ?? []).flatMap((p) => p?.data ?? []);

  return (
    <Screen>
      <AppFlatList
        contentContainerStyle={{ padding: theme.spacing.md, gap: 12 }}
        data={items}
        keyExtractor={(i) => String(i.id)}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage)
            query.fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <View style={{ gap: 10 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View>
                <Text
                  style={{
                    color: theme.colors.muted,
                    fontSize: 12,
                    fontWeight: "800",
                  }}
                >
                  Flamehub
                </Text>
                <Text
                  style={{
                    color: theme.colors.text,
                    fontSize: 24,
                    fontWeight: "900",
                  }}
                >
                  Feed
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Button
                  variant="secondary"
                  onPress={() => navigation.navigate("FlamehubSearch")}
                >
                  Search
                </Button>
                <Button onPress={() => navigation.navigate("FlamehubCreate")}>
                  Post
                </Button>
              </View>
            </View>
            {query.isLoading ? (
              <Text style={{ color: theme.colors.muted }}>Loading…</Text>
            ) : null}
            {query.isError ? (
              <Text style={{ color: theme.colors.danger }}>
                Failed to load feed.
              </Text>
            ) : null}
          </View>
        }
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <Text style={{ color: theme.colors.muted, textAlign: "center" }}>
              Loading…
            </Text>
          ) : !query.hasNextPage && items.length ? (
            <Text style={{ color: theme.colors.muted, textAlign: "center" }}>
              End of feed
            </Text>
          ) : null
        }
        renderItem={({ item }) => {
          const avatar = toPublicUrl(item.user?.avatar);
          const images = (item.media ?? []).filter((m) => m.type === "image");
          const videos = (item.media ?? []).filter((m) => m.type === "video");
          return (
            <Card style={{ gap: 10 }}>
              <View
                style={{ flexDirection: "row", gap: 12, alignItems: "center" }}
              >
                <Pressable
                  onPress={() =>
                    navigation.navigate("FlamehubProfile", {
                      username: item.user.username,
                    })
                  }
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 16,
                    backgroundColor: "rgba(34,197,94,0.12)",
                    borderWidth: 1,
                    borderColor: "rgba(34,197,94,0.25)",
                    overflow: "hidden",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {avatar ? (
                    <Image
                      source={{ uri: avatar }}
                      style={{ width: 44, height: 44 }}
                    />
                  ) : (
                    <Text
                      style={{ color: theme.colors.green, fontWeight: "900" }}
                    >
                      {(item.user.username?.[0] ?? "F").toUpperCase()}
                    </Text>
                  )}
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                    @{item.user.username}
                  </Text>
                  {item.user.full_name ? (
                    <Text
                      style={{ color: theme.colors.muted, fontSize: 12 }}
                      numberOfLines={1}
                    >
                      {item.user.full_name}
                    </Text>
                  ) : null}
                </View>
                <Pressable
                  onPress={() =>
                    Share.share({
                      message: `Flamehub post #${item.id}`,
                    })
                  }
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                  }}
                >
                  <Text style={{ color: theme.colors.text, fontWeight: "800" }}>
                    Share
                  </Text>
                </Pressable>
              </View>

              {item.caption ? (
                <Text style={{ color: theme.colors.text }}>{item.caption}</Text>
              ) : null}

              {videos.length ? (
                <Pressable
                  onPress={() => {
                    const src = toPublicUrl(videos[0].path);
                    if (src) Share.share({ message: src });
                  }}
                  style={{
                    width: "100%",
                    height: 220,
                    borderRadius: theme.radius.md,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    backgroundColor: "#0a0f0c",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{ color: theme.colors.muted, fontWeight: "900" }}
                  >
                    Video
                  </Text>
                  <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                    Tap to copy link
                  </Text>
                </Pressable>
              ) : images.length ? (
                <AppFlatList
                  horizontal
                  data={images}
                  keyExtractor={(m) => String(m.id)}
                  showsHorizontalScrollIndicator={false}
                  ItemSeparatorComponent={() => <View style={{ width: 10 }} />}
                  renderItem={({ item: m }) => {
                    const src = toPublicUrl(m.path);
                    return (
                      <Pressable
                        onPress={() =>
                          navigation.navigate("FlamehubPost", { id: item.id })
                        }
                      >
                        {src ? (
                          <Image
                            source={{ uri: src }}
                            style={{
                              width: 300,
                              height: 220,
                              borderRadius: theme.radius.md,
                              backgroundColor: "#0a0f0c",
                            }}
                            resizeMode="cover"
                          />
                        ) : null}
                      </Pressable>
                    );
                  }}
                />
              ) : null}

              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                  onPress={() =>
                    likeMutation.mutate({
                      postId: item.id,
                      like: !item.liked_by_me,
                    })
                  }
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: item.liked_by_me
                      ? "rgba(34,197,94,0.45)"
                      : theme.colors.border,
                    backgroundColor: item.liked_by_me
                      ? "rgba(34,197,94,0.12)"
                      : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                    Like {item.like_count ?? 0}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    navigation.navigate("FlamehubPost", { id: item.id })
                  }
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                    Comment {item.comment_count ?? 0}
                  </Text>
                </Pressable>
              </View>
            </Card>
          );
        }}
      />
    </Screen>
  );
}
