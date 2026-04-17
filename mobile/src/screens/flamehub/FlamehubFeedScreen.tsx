import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BackHandler,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  Share,
  Text,
  useWindowDimensions,
  View,
  ViewToken,
} from "react-native";
import { api } from "../../lib/api";
import { toPublicUrl } from "../../lib/assets";
import AppFlatList from "../../ui/AppFlatList";
import Screen from "../../ui/Screen";
import { theme } from "../../ui/theme";
import FlamehubCommentsSheet from "./FlamehubCommentsSheet";
import { useAuthStore } from "../../store/authStore";
import ActionSheet from "../../ui/ActionSheet";
import ConfirmSheet from "../../ui/ConfirmSheet";

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
  saved_by_me?: boolean;
};

type VideoPost = Post & { videoSrc: string };

function VideoTile({
  uri,
  active,
  muted,
  contentFit,
  onPress,
}: {
  uri: string;
  active: boolean;
  muted: boolean;
  contentFit: "contain" | "cover" | "fill";
  onPress?: () => void;
}) {
  const player = useVideoPlayer({ uri }, (p) => {
    p.loop = true;
    p.muted = muted;
  });

  useEffect(() => {
    player.muted = muted;
  }, [muted, player]);

  useEffect(() => {
    if (active) player.play();
    else player.pause();
  }, [active, player]);

  useEffect(() => {
    return () => {
      try {
        player.pause();
      } catch {}
    };
  }, [player]);

  return (
    <Pressable onPress={onPress} style={{ width: "100%", height: "100%" }}>
      <VideoView
        player={player}
        style={{ width: "100%", height: "100%" }}
        contentFit={contentFit}
        nativeControls={false}
      />
    </Pressable>
  );
}

export default function FlamehubFeedScreen() {
  const navigation = useNavigation<any>();
  const qc = useQueryClient();
  const { width, height } = useWindowDimensions();
  const myId = useAuthStore((s) => s.user?.id ?? null);
  const [activePostId, setActivePostId] = useState<number | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [activeVideoPostId, setActiveVideoPostId] = useState<number | null>(
    null,
  );
  const [mutedByPost, setMutedByPost] = useState<Record<number, boolean>>({});
  const [reelsOpen, setReelsOpen] = useState(false);
  const [reelsIndex, setReelsIndex] = useState(0);
  const [menuPost, setMenuPost] = useState<Post | null>(null);
  const [deletePost, setDeletePost] = useState<Post | null>(null);
  const feedListRef = useRef<any>(null);
  const feedScrollYRef = useRef(0);
  const savedFeedScrollYRef = useRef(0);
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 70,
    minimumViewTime: 180,
  }).current;

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

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      qc.invalidateQueries({ queryKey: ["flamehub", "feed"] });
    });
    return unsubscribe;
  }, [navigation, qc]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("blur", () => {
      setActiveVideoPostId(null);
      setReelsOpen(false);
      setCommentsOpen(false);
    });
    return unsubscribe;
  }, [navigation]);

  const likeMutation = useMutation({
    mutationFn: async ({ postId, like }: { postId: number; like: boolean }) => {
      if (like) return (await api.post(`/flamehub/posts/${postId}/like`)).data;
      return (await api.delete(`/flamehub/posts/${postId}/like`)).data;
    },
    onMutate: async ({ postId, like }) => {
      await qc.cancelQueries({ queryKey: ["flamehub", "feed"] });
      const prev = qc.getQueryData(["flamehub", "feed"]);
      qc.setQueryData(["flamehub", "feed"], (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((p: any) => ({
            ...p,
            data: (p?.data ?? []).map((it: any) => {
              if (it.id !== postId) return it;
              const before = Boolean(it.liked_by_me);
              const liked = Boolean(like);
              const delta = liked === before ? 0 : liked ? 1 : -1;
              return {
                ...it,
                liked_by_me: liked,
                like_count: Math.max(0, Number(it.like_count ?? 0) + delta),
              };
            }),
          })),
        };
      });
      return { prev };
    },
    onError: (_e, _v, ctx: any) => {
      if (ctx?.prev) qc.setQueryData(["flamehub", "feed"], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["flamehub", "feed"] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ postId, save }: { postId: number; save: boolean }) => {
      if (save) return (await api.post(`/flamehub/posts/${postId}/save`)).data;
      return (await api.delete(`/flamehub/posts/${postId}/save`)).data;
    },
    onMutate: async ({ postId, save }) => {
      qc.setQueriesData({ queryKey: ["flamehub", "feed"] }, (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((p: any) =>
            p.id === postId ? { ...p, saved_by_me: save } : p,
          ),
        };
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["flamehub", "feed"] }),
  });

  const hideMutation = useMutation({
    mutationFn: async ({ postId }: { postId: number }) =>
      (await api.post(`/flamehub/posts/${postId}/hide`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["flamehub", "feed"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ postId }: { postId: number }) =>
      (await api.delete(`/flamehub/posts/${postId}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["flamehub", "feed"] }),
  });

  const items = useMemo(
    () => (query.data?.pages ?? []).flatMap((p) => p?.data ?? []),
    [query.data],
  );

  // Layout full-width:
  const mediaSize = width;

  const videoPosts = useMemo(() => {
    const list: VideoPost[] = [];
    for (const p of items) {
      const v = (p.media ?? []).find((m) => m.type === "video");
      const src = v ? toPublicUrl(v.path) : null;
      if (src) list.push({ ...(p as Post), videoSrc: String(src) });
    }
    return list;
  }, [items]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<ViewToken> }) => {
      const firstVisibleVideo = viewableItems.find((v) => {
        if (!v.isViewable) return false;
        const post = v.item as Post;
        return (
          Array.isArray(post?.media) &&
          post.media.some((m) => m.type === "video")
        );
      });
      const nextId = firstVisibleVideo
        ? (firstVisibleVideo.item as Post).id
        : null;
      setActiveVideoPostId(nextId);
    },
  ).current;

  const onReelsViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<ViewToken> }) => {
      const first = viewableItems.find((v) => v.isViewable);
      if (typeof first?.index === "number") setReelsIndex(first.index);
    },
  ).current;

  const closeReels = () => {
    setReelsOpen(false);
    requestAnimationFrame(() => {
      const y = savedFeedScrollYRef.current ?? 0;
      feedListRef.current?.scrollToOffset?.({ offset: y, animated: false });
    });
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (commentsOpen) {
        setCommentsOpen(false);
        return true;
      }
      if (reelsOpen) {
        closeReels();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [commentsOpen, reelsOpen]);

  return (
    <Screen headerShown={false} allowUnderHeader>
      <AppFlatList
        ref={feedListRef}
        contentContainerStyle={{ paddingBottom: 40 }}
        data={items}
        keyExtractor={(i) => String(i.id)}
        refreshing={query.isRefetching && !query.isFetchingNextPage}
        onRefresh={() => query.refetch()}
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          feedScrollYRef.current = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage)
            query.fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <View
            style={{
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View>
              <Text
                style={{
                  color: theme.colors.green,
                  fontSize: 22,
                  fontWeight: "900",
                  letterSpacing: -0.5,
                }}
              >
                FLAMEHUB
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Pressable onPress={() => navigation.navigate("FlamehubSearch")}>
                <Ionicons name="search" size={24} color={theme.colors.text} />
              </Pressable>
              <Pressable onPress={() => navigation.navigate("FlamehubCreate")}>
                <Ionicons
                  name="add-circle-outline"
                  size={26}
                  color={theme.colors.text}
                />
              </Pressable>
            </View>
          </View>
        }
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <Text
              style={{
                color: theme.colors.muted,
                textAlign: "center",
                padding: 20,
              }}
            >
              Loading…
            </Text>
          ) : null
        }
        renderItem={({ item }) => {
          const avatar = toPublicUrl(item.user?.avatar);
          const images = (item.media ?? []).filter((m) => m.type === "image");
          const videos = (item.media ?? []).filter((m) => m.type === "video");
          const videoSrc = videos[0] ? toPublicUrl(videos[0].path) : null;

          return (
            <View
              style={{ marginBottom: 12, backgroundColor: theme.colors.card }}
            >
              {/* Header: User Info */}
              <View
                style={{
                  padding: 10,
                  flexDirection: "row",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <Pressable
                  onPress={() =>
                    navigation.navigate("FlamehubProfile", {
                      username: item.user.username,
                    })
                  }
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    backgroundColor: "#f0f0f0",
                    borderWidth: 0.5,
                    borderColor: "rgba(0,0,0,0.1)",
                    overflow: "hidden",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {avatar ? (
                    <Image
                      source={{ uri: avatar }}
                      style={{ width: 34, height: 34 }}
                    />
                  ) : (
                    <Text
                      style={{
                        color: theme.colors.green,
                        fontWeight: "bold",
                        fontSize: 12,
                      }}
                    >
                      {item.user.username?.[0].toUpperCase()}
                    </Text>
                  )}
                </Pressable>
                <Pressable
                  onPress={() =>
                    navigation.navigate("FlamehubProfile", {
                      username: item.user.username,
                    })
                  }
                  style={{ flex: 1 }}
                >
                  <Text
                    style={{
                      color: theme.colors.text,
                      fontWeight: "700",
                      fontSize: 14,
                    }}
                  >
                    {item.user.username}
                  </Text>
                </Pressable>
                <Ionicons
                  name="ellipsis-horizontal"
                  size={18}
                  color={theme.colors.muted}
                />
              </View>

              {/* Media: Full Width */}
              <View
                style={{
                  width: mediaSize,
                  height: mediaSize,
                  backgroundColor: "#000",
                }}
              >
                {videos.length ? (
                  videoSrc ? (
                    <VideoTile
                      uri={String(videoSrc)}
                      active={
                        activeVideoPostId === item.id &&
                        !commentsOpen &&
                        !reelsOpen
                      }
                      muted={mutedByPost[item.id] ?? true}
                      contentFit="cover"
                      onPress={() => {
                        const idx = videoPosts.findIndex(
                          (p) => p.id === item.id,
                        );
                        if (idx >= 0) {
                          savedFeedScrollYRef.current =
                            feedScrollYRef.current ?? 0;
                          setReelsIndex(idx);
                          setReelsOpen(true);
                        }
                      }}
                    />
                  ) : null
                ) : images.length ? (
                  <AppFlatList
                    horizontal
                    data={images}
                    keyExtractor={(m) => String(m.id)}
                    showsHorizontalScrollIndicator={false}
                    pagingEnabled
                    renderItem={({ item: m }) => {
                      const src = toPublicUrl(m.path);
                      return (
                        <Pressable
                          onPress={() =>
                            navigation.navigate("FlamehubPost", { id: item.id })
                          }
                        >
                          <Image
                            source={{ uri: String(src) }}
                            style={{ width: mediaSize, height: mediaSize }}
                            resizeMode="cover"
                          />
                        </Pressable>
                      );
                    }}
                  />
                ) : null}

                {videos.length ? (
                  <Pressable
                    onPress={() =>
                      setMutedByPost((prev) => ({
                        ...prev,
                        [item.id]: !(prev[item.id] ?? true),
                      }))
                    }
                    style={{
                      position: "absolute",
                      right: 12,
                      bottom: 12,
                      borderRadius: 20,
                      width: 30,
                      height: 30,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "rgba(0,0,0,0.5)",
                    }}
                  >
                    <Ionicons
                      name={
                        (mutedByPost[item.id] ?? true)
                          ? "volume-mute"
                          : "volume-high"
                      }
                      size={16}
                      color="#fff"
                    />
                  </Pressable>
                ) : null}
              </View>

              {/* Actions */}
              <View
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <Pressable
                  onPress={() =>
                    likeMutation.mutate({
                      postId: item.id,
                      like: !item.liked_by_me,
                    })
                  }
                >
                  <Ionicons
                    name={item.liked_by_me ? "heart" : "heart-outline"}
                    size={26}
                    color={item.liked_by_me ? "#ef4444" : theme.colors.text}
                  />
                </Pressable>
                <Pressable
                  onPress={() => {
                    setActivePostId(item.id);
                    setCommentsOpen(true);
                  }}
                >
                  <Ionicons
                    name="chatbubble-outline"
                    size={24}
                    color={theme.colors.text}
                  />
                </Pressable>
                <Pressable
                  onPress={() =>
                    Share.share({ message: `Flamehub post #${item.id}` })
                  }
                >
                  <Ionicons
                    name="paper-plane-outline"
                    size={24}
                    color={theme.colors.text}
                  />
                </Pressable>
                <View style={{ flex: 1 }} />
                <Pressable
                  onPress={() =>
                    saveMutation.mutate({
                      postId: item.id,
                      save: !Boolean(item.saved_by_me),
                    })
                  }
                >
                  <Ionicons
                    name={item.saved_by_me ? "bookmark" : "bookmark-outline"}
                    size={24}
                    color={item.saved_by_me ? theme.colors.green : theme.colors.text}
                  />
                </Pressable>
                <Pressable
                  onPress={() => {
                    setMenuPost(item);
                  }}
                >
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={22}
                    color={theme.colors.text}
                  />
                </Pressable>
              </View>

              {/* Caption & Metadata */}
              <View style={{ paddingHorizontal: 12 }}>
                <Text
                  style={{
                    color: theme.colors.text,
                    fontWeight: "700",
                    fontSize: 14,
                  }}
                >
                  {(item.like_count ?? 0).toLocaleString("id-ID")} likes
                </Text>

                {item.caption ? (
                  <Text
                    style={{
                      color: theme.colors.text,
                      marginTop: 4,
                      fontSize: 14,
                      lineHeight: 18,
                    }}
                    numberOfLines={2}
                  >
                    <Text style={{ fontWeight: "700" }}>
                      {item.user.username}{" "}
                    </Text>
                    {item.caption}
                  </Text>
                ) : null}

                {Number(item.comment_count) > 0 ? (
                  <Pressable
                    onPress={() => {
                      setActivePostId(item.id);
                      setCommentsOpen(true);
                    }}
                    style={{ marginTop: 4 }}
                  >
                    <Text style={{ color: theme.colors.muted, fontSize: 13 }}>
                      View all {item.comment_count} comments
                    </Text>
                  </Pressable>
                ) : null}

                <Text
                  style={{
                    color: theme.colors.muted,
                    fontSize: 10,
                    marginTop: 4,
                    textTransform: "uppercase",
                  }}
                >
                  Just now
                </Text>
              </View>
            </View>
          );
        }}
      />

      <FlamehubCommentsSheet
        visible={commentsOpen}
        postId={activePostId}
        onClose={() => setCommentsOpen(false)}
      />

      <ActionSheet
        open={Boolean(menuPost)}
        title="Post"
        onClose={() => setMenuPost(null)}
        items={
          menuPost
            ? [
                ...(myId && menuPost.user?.id === myId
                  ? [
                      {
                        key: "edit",
                        label: "Edit",
                        onPress: () =>
                          navigation.navigate("FlamehubEditPost", { id: menuPost.id }),
                      },
                      {
                        key: "delete",
                        label: "Delete",
                        destructive: true,
                        onPress: () => setDeletePost(menuPost),
                      },
                    ]
                  : []),
                {
                  key: "hide",
                  label: "Hide",
                  onPress: () => hideMutation.mutate({ postId: menuPost.id }),
                },
              ]
            : []
        }
      />

      <ConfirmSheet
        open={Boolean(deletePost)}
        title="Delete post?"
        message="This cannot be undone."
        confirmText="Delete"
        destructive
        onClose={() => setDeletePost(null)}
        onConfirm={() => {
          if (!deletePost) return;
          deleteMutation.mutate({ postId: deletePost.id });
          setDeletePost(null);
        }}
      />

      {reelsOpen ? (
        <View
          style={{ position: "absolute", inset: 0, backgroundColor: "#000" }}
        >
          <FlatList
            data={videoPosts}
            keyExtractor={(p) => String(p.id)}
            pagingEnabled
            decelerationRate="fast"
            showsVerticalScrollIndicator={false}
            initialScrollIndex={reelsIndex}
            getItemLayout={(_d, index) => ({
              length: height,
              offset: height * index,
              index,
            })}
            onViewableItemsChanged={onReelsViewableItemsChanged}
            viewabilityConfig={{ itemVisiblePercentThreshold: 70 }}
            renderItem={({ item: p, index }) => (
              <View style={{ width: "100%", height }}>
                <VideoTile
                  uri={p.videoSrc}
                  active={index === reelsIndex && !commentsOpen}
                  muted={mutedByPost[p.id] ?? true}
                  contentFit="contain"
                />

                <View
                  style={{
                    position: "absolute",
                    right: 14,
                    bottom: 120,
                    gap: 18,
                    alignItems: "center",
                  }}
                >
                  <Pressable
                    onPress={() =>
                      likeMutation.mutate({
                        postId: p.id,
                        like: !p.liked_by_me,
                      })
                    }
                    style={{ alignItems: "center" }}
                  >
                    <Ionicons
                      name={p.liked_by_me ? "heart" : "heart-outline"}
                      size={32}
                      color={p.liked_by_me ? "#ef4444" : "#fff"}
                    />
                    <Text
                      style={{
                        color: "#fff",
                        fontWeight: "600",
                        fontSize: 12,
                        marginTop: 4,
                      }}
                    >
                      {p.like_count}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      setActivePostId(p.id);
                      setCommentsOpen(true);
                    }}
                    style={{ alignItems: "center" }}
                  >
                    <Ionicons
                      name="chatbubble-outline"
                      size={28}
                      color="#fff"
                    />
                    <Text
                      style={{
                        color: "#fff",
                        fontWeight: "600",
                        fontSize: 12,
                        marginTop: 4,
                      }}
                    >
                      {p.comment_count}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => Share.share({ message: p.videoSrc })}
                    style={{ alignItems: "center" }}
                  >
                    <Ionicons
                      name="paper-plane-outline"
                      size={28}
                      color="#fff"
                    />
                  </Pressable>

                  <Pressable
                    onPress={() =>
                      setMutedByPost((prev) => ({
                        ...prev,
                        [p.id]: !(prev[p.id] ?? true),
                      }))
                    }
                  >
                    <Ionicons
                      name={
                        (mutedByPost[p.id] ?? true)
                          ? "volume-mute"
                          : "volume-high"
                      }
                      size={26}
                      color="#fff"
                    />
                  </Pressable>
                </View>

                <View
                  style={{
                    position: "absolute",
                    left: 16,
                    right: 80,
                    bottom: 40,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: theme.colors.green,
                        alignItems: "center",
                        justifyContent: "center",
                        borderWidth: 1,
                        borderColor: "#fff",
                      }}
                    >
                      <Text
                        style={{
                          color: "#fff",
                          fontWeight: "bold",
                          fontSize: 12,
                        }}
                      >
                        {p.user.username[0].toUpperCase()}
                      </Text>
                    </View>
                    <Text
                      style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}
                    >
                      {p.user.username}
                    </Text>
                  </View>
                  {p.caption ? (
                    <Text
                      style={{ color: "#fff", fontSize: 14, lineHeight: 20 }}
                      numberOfLines={2}
                    >
                      {p.caption}
                    </Text>
                  ) : null}
                </View>

                <Pressable
                  onPress={closeReels}
                  style={{ position: "absolute", top: 50, right: 20 }}
                >
                  <Ionicons name="close" size={30} color="#fff" />
                </Pressable>
              </View>
            )}
          />
        </View>
      ) : null}
    </Screen>
  );
}
