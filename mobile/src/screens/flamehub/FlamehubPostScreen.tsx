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
  TextInput,
  View,
} from "react-native";
import { api } from "../../lib/api";
import { toPublicUrl } from "../../lib/assets";
import { RootStackParamList } from "../../navigation/types";
import Button from "../../ui/Button";
import Card from "../../ui/Card";
import Screen from "../../ui/Screen";
import { theme } from "../../ui/theme";

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
  const postId = route.params.id;

  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [body, setBody] = useState("");

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
      qc.invalidateQueries({ queryKey: ["flamehub", "feed"] });
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

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.md, gap: 12 }}
        keyboardShouldPersistTaps="handled"
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

        {postQuery.isLoading ? (
          <Text style={{ color: theme.colors.muted }}>Loading…</Text>
        ) : null}
        {postQuery.isError ? (
          <Text style={{ color: theme.colors.danger }}>
            Failed to load post.
          </Text>
        ) : null}

        {post ? (
          <Card style={{ gap: 10 }}>
            <Pressable
              onPress={() =>
                navigation.navigate("FlamehubProfile", {
                  username: post.user.username,
                })
              }
            >
              <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                @{post.user.username}
              </Text>
              {post.user.full_name ? (
                <Text
                  style={{ color: theme.colors.muted, fontSize: 12 }}
                  numberOfLines={1}
                >
                  {post.user.full_name}
                </Text>
              ) : null}
            </Pressable>

            {post.caption ? (
              <Text style={{ color: theme.colors.text }}>{post.caption}</Text>
            ) : null}

            {(post.media ?? []).length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  {post.media.map((m) => {
                    const src = toPublicUrl(m.path);
                    return (
                      <View
                        key={m.id}
                        style={{
                          width: 300,
                          height: 220,
                          borderRadius: theme.radius.md,
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                          backgroundColor: "#0a0f0c",
                          overflow: "hidden",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {m.type === "image" && src ? (
                          <Image
                            source={{ uri: src }}
                            style={{ width: 300, height: 220 }}
                            resizeMode="cover"
                          />
                        ) : (
                          <Text
                            style={{
                              color: theme.colors.muted,
                              fontWeight: "900",
                            }}
                          >
                            Video
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            ) : null}

            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={() => likeMutation.mutate({ like: !post.liked_by_me })}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: post.liked_by_me
                    ? "rgba(34,197,94,0.45)"
                    : theme.colors.border,
                  backgroundColor: post.liked_by_me
                    ? "rgba(34,197,94,0.12)"
                    : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                  Like {post.like_count ?? 0}
                </Text>
              </Pressable>
              <View
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
                  Comments {post.comment_count ?? 0}
                </Text>
              </View>
            </View>
          </Card>
        ) : null}

        <Card style={{ gap: 10 }}>
          <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
            Comments
          </Text>
          {replyTo ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                Replying to @{replyTo.user?.username ?? "user"}
              </Text>
              <Pressable onPress={() => setReplyTo(null)}>
                <Text style={{ color: theme.colors.muted, fontWeight: "900" }}>
                  Cancel
                </Text>
              </Pressable>
            </View>
          ) : null}

          <View
            style={{
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.md,
              backgroundColor: "#0a0f0c",
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
          >
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder={replyTo ? "Tulis balasan…" : "Tulis komentar…"}
              placeholderTextColor={theme.colors.muted}
              style={{ color: theme.colors.text, minHeight: 40 }}
              multiline
            />
          </View>

          <Button
            onPress={() => createComment.mutate()}
            disabled={!body.trim() || createComment.isPending}
          >
            {createComment.isPending ? "Sending…" : "Send"}
          </Button>

          {commentsQuery.isLoading ? (
            <Text style={{ color: theme.colors.muted }}>Loading…</Text>
          ) : null}
          {commentsQuery.isError ? (
            <Text style={{ color: theme.colors.danger }}>
              Failed to load comments.
            </Text>
          ) : null}

          {(byParent.get(0) ?? []).map((c) => (
            <View key={c.id} style={{ gap: 8 }}>
              <Pressable
                onPress={() => setReplyTo(c)}
                style={{
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radius.md,
                  padding: 12,
                  backgroundColor: "#0a0f0c",
                }}
              >
                <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                  @{c.user?.username ?? "user"}
                </Text>
                <Text style={{ color: theme.colors.text, marginTop: 4 }}>
                  {c.body}
                </Text>
                <Text
                  style={{
                    color: theme.colors.green,
                    marginTop: 6,
                    fontWeight: "900",
                    fontSize: 12,
                  }}
                >
                  Reply
                </Text>
              </Pressable>
              {(byParent.get(c.id) ?? []).map((r) => (
                <Pressable
                  key={r.id}
                  onPress={() => setReplyTo(r)}
                  style={{
                    marginLeft: 14,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    borderRadius: theme.radius.md,
                    padding: 12,
                    backgroundColor: "#0a0f0c",
                  }}
                >
                  <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                    @{r.user?.username ?? "user"}
                  </Text>
                  <Text style={{ color: theme.colors.text, marginTop: 4 }}>
                    {r.body}
                  </Text>
                </Pressable>
              ))}
            </View>
          ))}

          {commentsQuery.hasNextPage ? (
            <Button
              variant="secondary"
              onPress={() => commentsQuery.fetchNextPage()}
              disabled={commentsQuery.isFetchingNextPage}
            >
              {commentsQuery.isFetchingNextPage ? "Loading…" : "Load more"}
            </Button>
          ) : null}
        </Card>
      </ScrollView>
    </Screen>
  );
}
