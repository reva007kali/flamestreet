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
  Share,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../lib/api";
import { toPublicUrl } from "../../lib/assets";
import { RootStackParamList } from "../../navigation/types";
import Button from "../../ui/Button";
import Screen from "../../ui/Screen";
import { theme } from "../../ui/theme";
import { useAuthStore } from "../../store/authStore";
import ActionSheet from "../../ui/ActionSheet";
import ConfirmSheet from "../../ui/ConfirmSheet";

type PostRoute = RouteProp<RootStackParamList, "FlamehubPost">;

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

type Comment = {
  id: number;
  post_id: number;
  user_id: number;
  parent_id?: number | null;
  body: string;
  user: UserBrief;
  created_at?: string | null;
};

export default function FlamehubPostScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<PostRoute>();
  const qc = useQueryClient();
  const { width } = useWindowDimensions();
  const postId = route.params.id;
  const myId = useAuthStore((s) => s.user?.id ?? null);

  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [body, setBody] = useState("");
  const [showAllComments, setShowAllComments] = useState(false);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // -- Queries Logic (Tetap) --
  const postQuery = useQuery({
    queryKey: ["flamehub", "post", postId],
    queryFn: async () =>
      (await api.get(`/flamehub/posts/${postId}`)).data?.post as Post,
  });

  const commentsQuery = useInfiniteQuery({
    queryKey: ["flamehub", "comments", postId],
    initialPageParam: null as number | null,
    queryFn: async ({ pageParam }) => {
      const r = await api.get(`/flamehub/posts/${postId}/comments`, {
        params: { cursor: pageParam },
      });
      return r.data as { data: Comment[]; next_cursor: number | null };
    },
    getNextPageParam: (lastPage) => lastPage?.next_cursor ?? null,
  });

  const createComment = useMutation({
    mutationFn: async () => {
      const payload: any = { body: body.trim() };
      if (replyTo?.id) payload.parent_id = replyTo.id;
      const r = await api.post(`/flamehub/posts/${postId}/comments`, payload);
      return r.data?.comment as Comment;
    },
    onSuccess: () => {
      setBody("");
      setReplyTo(null);
      qc.invalidateQueries({ queryKey: ["flamehub", "comments", postId] });
      qc.invalidateQueries({ queryKey: ["flamehub", "post", postId] });
    },
  });

  const likeMutation = useMutation({
    mutationFn: async ({ like }: { like: boolean }) => {
      if (like) return (await api.post(`/flamehub/posts/${postId}/like`)).data;
      return (await api.delete(`/flamehub/posts/${postId}/like`)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flamehub", "post", postId] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ save }: { save: boolean }) => {
      if (save) return (await api.post(`/flamehub/posts/${postId}/save`)).data;
      return (await api.delete(`/flamehub/posts/${postId}/save`)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flamehub", "post", postId] });
    },
  });

  const hideMutation = useMutation({
    mutationFn: async () =>
      (await api.post(`/flamehub/posts/${postId}/hide`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flamehub", "feed"] });
      qc.invalidateQueries({ queryKey: ["flamehub", "profile"] });
      navigation.goBack();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () =>
      (await api.delete(`/flamehub/posts/${postId}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flamehub", "feed"] });
      qc.invalidateQueries({ queryKey: ["flamehub", "profile"] });
      navigation.goBack();
    },
  });

  const post = postQuery.data;
  const comments = (commentsQuery.data?.pages ?? [])
    .flatMap((p) => p?.data ?? [])
    .reverse();
  const byParent = new Map<number, Comment[]>();
  comments.forEach((c) => {
    const key = c.parent_id ?? 0;
    const arr = byParent.get(key) ?? [];
    arr.push(c);
    byParent.set(key, arr);
  });
  const rootComments = byParent.get(0) ?? [];
  const visibleComments = showAllComments
    ? rootComments
    : rootComments.slice(0, 3);

  async function onSharePost() {
    if (!post) return;
    try {
      await Share.share({
        message: `Check out @${post.user.username}'s post on Flamehub!\n\n${post.caption ?? ""}`,
      });
    } catch {}
  }

  const isOwner = Boolean(myId && post?.user?.id && myId === post.user.id);

  return (
    <Screen headerShown={false} allowUnderHeader>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        {/* -- CUSTOM HEADER -- */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingTop: 50,
            paddingBottom: 15,
          }}
        >
          <Pressable
            onPress={() => navigation.goBack()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "#1a1a1a",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "900" }}>
            Flame Post
          </Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={() => navigation.navigate("FlamehubSearch")}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "#1a1a1a",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="search" size={20} color={theme.colors.muted} />
            </Pressable>
            <Pressable
              onPress={() => setMenuOpen(true)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "#1a1a1a",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="ellipsis-horizontal" size={20} color="#fff" />
            </Pressable>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {post && (
            <View style={{ gap: 20 }}>
              {/* POST CONTENT */}
              <View style={{ paddingHorizontal: 20, gap: 12 }}>
                {/* User Header */}
                <Pressable
                  onPress={() =>
                    navigation.navigate("FlamehubProfile", {
                      username: post.user.username,
                    })
                  }
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: "#222",
                      overflow: "hidden",
                    }}
                  >
                    {toPublicUrl(post.user.avatar) ? (
                      <Image
                        source={{ uri: toPublicUrl(post.user.avatar)! }}
                        style={{ width: "100%", height: "100%" }}
                      />
                    ) : null}
                  </View>
                  <View>
                    <Text
                      style={{ color: "#fff", fontWeight: "900", fontSize: 15 }}
                    >
                      @{post.user.username}
                    </Text>
                    {post.user.full_name && (
                      <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                        {post.user.full_name}
                      </Text>
                    )}
                  </View>
                </Pressable>

                {/* Caption */}
                {post.caption && (
                  <Text style={{ color: "#fff", fontSize: 15, lineHeight: 22 }}>
                    {post.caption}
                  </Text>
                )}

                {/* Media Slider */}
                {(post.media ?? []).length > 0 && (
                  <View>
                    <ScrollView
                      horizontal
                      pagingEnabled
                      showsHorizontalScrollIndicator={false}
                      onMomentumScrollEnd={(e) => {
                        const x = e.nativeEvent.contentOffset.x;
                        setMediaIndex(Math.max(0, Math.round(x / width)));
                      }}
                    >
                      {post.media.map((m) => (
                        <View
                          key={m.id}
                          style={{
                            width: width - 40,
                            height: (width - 40) * 1.25,
                            borderRadius: 24,
                            overflow: "hidden",
                            backgroundColor: "#111",
                            marginRight: 10,
                          }}
                        >
                          {m.type === "image" ? (
                            toPublicUrl(m.path) ? (
                              <Image
                                source={{ uri: toPublicUrl(m.path)! }}
                                style={{ width: "100%", height: "100%" }}
                                resizeMode="cover"
                              />
                            ) : null
                          ) : (
                            <View
                              style={{
                                flex: 1,
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Ionicons
                                name="play"
                                size={48}
                                color={theme.colors.green}
                              />
                              <Text
                                style={{
                                  color: theme.colors.muted,
                                  marginTop: 8,
                                }}
                              >
                                Video Clip
                              </Text>
                            </View>
                          )}
                        </View>
                      ))}
                    </ScrollView>

                    {post.media.length > 1 && (
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "center",
                          gap: 5,
                          marginTop: 12,
                        }}
                      >
                        {post.media.map((m, idx) => (
                          <View
                            key={m.id}
                            style={{
                              width: idx === mediaIndex ? 16 : 6,
                              height: 6,
                              borderRadius: 3,
                              backgroundColor:
                                idx === mediaIndex
                                  ? theme.colors.green
                                  : "#333",
                            }}
                          />
                        ))}
                      </View>
                    )}
                  </View>
                )}

                {/* Interaction Bar */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 5,
                  }}
                >
                  <View style={{ flexDirection: "row", gap: 20 }}>
                    <Pressable
                      onPress={() =>
                        likeMutation.mutate({ like: !post.liked_by_me })
                      }
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Ionicons
                        name={post.liked_by_me ? "heart" : "heart-outline"}
                        size={28}
                        color={post.liked_by_me ? "#ef4444" : "#fff"}
                      />
                      <Text style={{ color: "#fff", fontWeight: "800" }}>
                        {post.like_count ?? 0}
                      </Text>
                    </Pressable>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Ionicons
                        name="chatbubble-outline"
                        size={24}
                        color="#fff"
                      />
                      <Text style={{ color: "#fff", fontWeight: "800" }}>
                        {post.comment_count ?? 0}
                      </Text>
                    </View>
                    <Pressable onPress={onSharePost}>
                      <Ionicons
                        name="paper-plane-outline"
                        size={24}
                        color="#fff"
                      />
                    </Pressable>
                  </View>
                  <Pressable
                    onPress={() =>
                      saveMutation.mutate({ save: !post.saved_by_me })
                    }
                  >
                    <Ionicons
                      name={post.saved_by_me ? "bookmark" : "bookmark-outline"}
                      size={24}
                      color={post.saved_by_me ? theme.colors.green : "#fff"}
                    />
                  </Pressable>
                </View>
              </View>

              {/* COMMENTS SECTION */}
              <View style={{ paddingHorizontal: 20, gap: 15 }}>
                <Text
                  style={{ color: "#fff", fontSize: 18, fontWeight: "900" }}
                >
                  Comments
                </Text>

                {/* Input Area */}
                <View
                  style={{
                    backgroundColor: "#151515",
                    borderRadius: 20,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.05)",
                  }}
                >
                  {replyTo && (
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginBottom: 8,
                        paddingBottom: 8,
                        borderBottomWidth: 1,
                        borderBottomColor: "#222",
                      }}
                    >
                      <Text style={{ color: theme.colors.green, fontSize: 12 }}>
                        Replying to @{replyTo.user.username}
                      </Text>
                      <Pressable onPress={() => setReplyTo(null)}>
                        <Ionicons
                          name="close-circle"
                          size={16}
                          color={theme.colors.muted}
                        />
                      </Pressable>
                    </View>
                  )}
                  <TextInput
                    value={body}
                    onChangeText={setBody}
                    placeholder="Write a comment..."
                    placeholderTextColor={theme.colors.muted}
                    multiline
                    style={{ color: "#fff", fontSize: 14, minHeight: 40 }}
                  />
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "flex-end",
                      marginTop: 10,
                    }}
                  >
                    <Pressable
                      onPress={() => createComment.mutate()}
                      disabled={!body.trim() || createComment.isPending}
                      style={{
                        backgroundColor: body.trim()
                          ? theme.colors.green
                          : "#222",
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 12,
                      }}
                    >
                      <Text
                        style={{
                          color: body.trim() ? "#000" : theme.colors.muted,
                          fontWeight: "900",
                        }}
                      >
                        Send
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {/* Comments List */}
                <View style={{ gap: 20 }}>
                  {visibleComments.map((c) => (
                    <View key={c.id} style={{ gap: 10 }}>
                      <View style={{ flexDirection: "row", gap: 12 }}>
                        <View
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            backgroundColor: "#333",
                            overflow: "hidden",
                          }}
                        >
                          {toPublicUrl(c.user.avatar) ? (
                            <Image
                              source={{ uri: toPublicUrl(c.user.avatar)! }}
                              style={{ width: "100%", height: "100%" }}
                            />
                          ) : null}
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                            }}
                          >
                            <Text
                              style={{
                                color: "#fff",
                                fontWeight: "800",
                                fontSize: 14,
                              }}
                            >
                              @{c.user.username}
                            </Text>
                            <Pressable onPress={() => setReplyTo(c)}>
                              <Text
                                style={{
                                  color: theme.colors.green,
                                  fontSize: 11,
                                  fontWeight: "700",
                                }}
                              >
                                Reply
                              </Text>
                            </Pressable>
                          </View>
                          <Text
                            style={{
                              color: "rgba(255,255,255,0.7)",
                              fontSize: 14,
                            }}
                          >
                            {c.body}
                          </Text>
                        </View>
                      </View>

                      {/* Replies Threading */}
                      {(byParent.get(c.id) ?? []).map((r) => (
                        <View
                          key={r.id}
                          style={{
                            marginLeft: 44,
                            flexDirection: "row",
                            gap: 10,
                          }}
                        >
                          <View
                            style={{
                              width: 2,
                              backgroundColor: "#222",
                              marginVertical: 4,
                            }}
                          />
                          <View style={{ flex: 1, gap: 2 }}>
                            <Text
                              style={{
                                color: "#fff",
                                fontWeight: "800",
                                fontSize: 13,
                              }}
                            >
                              @{r.user.username}
                            </Text>
                            <Text
                              style={{
                                color: "rgba(255,255,255,0.6)",
                                fontSize: 13,
                              }}
                            >
                              {r.body}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>

                {!showAllComments && rootComments.length > 3 && (
                  <Pressable onPress={() => setShowAllComments(true)}>
                    <Text
                      style={{
                        color: theme.colors.green,
                        fontWeight: "800",
                        textAlign: "center",
                        marginTop: 10,
                      }}
                    >
                      View all {post.comment_count} comments
                    </Text>
                  </Pressable>
                )}

                {commentsQuery.hasNextPage && (
                  <Button
                    variant="secondary"
                    onPress={() => commentsQuery.fetchNextPage()}
                    disabled={commentsQuery.isFetchingNextPage}
                  >
                    {commentsQuery.isFetchingNextPage
                      ? "Loading…"
                      : "Load more comments"}
                  </Button>
                )}
              </View>
            </View>
          )}
        </ScrollView>

        <ActionSheet
          open={menuOpen}
          title="Post"
          onClose={() => setMenuOpen(false)}
          items={[
            ...(isOwner
              ? [
                  {
                    key: "edit",
                    label: "Edit",
                    onPress: () =>
                      navigation.navigate("FlamehubEditPost", { id: postId }),
                  },
                  {
                    key: "delete",
                    label: "Delete",
                    destructive: true,
                    onPress: () => setDeleteOpen(true),
                  },
                ]
              : []),
            {
              key: "hide",
              label: "Hide",
              onPress: () => hideMutation.mutate(),
            },
          ]}
        />

        <ConfirmSheet
          open={deleteOpen}
          title="Delete post?"
          message="This cannot be undone."
          confirmText="Delete"
          destructive
          onClose={() => setDeleteOpen(false)}
          onConfirm={() => {
            deleteMutation.mutate();
            setDeleteOpen(false);
          }}
        />
      </KeyboardAvoidingView>
    </Screen>
  );
}
