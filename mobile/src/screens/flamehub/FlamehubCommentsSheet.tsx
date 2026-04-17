import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Pressable,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { api } from "../../lib/api";
import AppFlatList from "../../ui/AppFlatList";
import BottomSheet from "../../ui/BottomSheet";
import { theme } from "../../ui/theme";

type UserBrief = {
  id: number;
  username: string;
  avatar?: string | null;
};

type Comment = {
  id: number;
  post_id: number;
  parent_id?: number | null;
  body: string;
  user: UserBrief;
};

function CommentRow({
  item,
  indent = 0,
  onReply,
}: {
  item: Comment;
  indent?: number;
  onReply: (c: Comment) => void;
}) {
  const initial = (item.user?.username?.[0] ?? "U").toUpperCase();

  return (
    <View
      style={{
        flexDirection: "row",
        paddingVertical: 10,
        paddingHorizontal: 16,
        marginLeft: indent ? 44 : 0,
        gap: 12,
      }}
    >
      <View
        style={{
          width: indent ? 24 : 34,
          height: indent ? 24 : 34,
          borderRadius: 17,
          backgroundColor: "rgba(34,197,94,0.15)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            color: theme.colors.green,
            fontSize: indent ? 10 : 13,
            fontWeight: "bold",
          }}
        >
          {initial}
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={{ color: theme.colors.text, fontSize: 13, lineHeight: 18 }}
        >
          <Text style={{ fontWeight: "700" }}>{item.user?.username} </Text>
          {item.body}
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 16,
            marginTop: 6,
          }}
        >
          <Text style={{ color: theme.colors.muted, fontSize: 11 }}>2h</Text>
          <Pressable onPress={() => onReply(item)}>
            <Text
              style={{
                color: theme.colors.muted,
                fontWeight: "700",
                fontSize: 11,
              }}
            >
              Reply
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default function FlamehubCommentsSheet({
  visible,
  postId,
  onClose,
}: {
  visible: boolean;
  postId: number | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [body, setBody] = useState("");

  const query = useInfiniteQuery({
    queryKey: ["flamehub", "comments", postId],
    enabled: Boolean(visible && postId),
    initialPageParam: null as number | null,
    queryFn: async ({ pageParam }) => {
      const r = await api.get(`/flamehub/posts/${postId}/comments`, {
        params: { cursor: pageParam },
      });
      return r.data as { data: Comment[]; next_cursor: number | null };
    },
    getNextPageParam: (lastPage) => lastPage?.next_cursor ?? null,
  });

  const comments = useMemo(() => {
    const pages = query.data?.pages ?? [];
    return pages.flatMap((p) => p?.data ?? []).reverse();
  }, [query.data]);

  const byParent = useMemo(() => {
    const m = new Map<number, Comment[]>();
    comments.forEach((c) => {
      const key = c.parent_id ?? 0;
      const arr = m.get(key) ?? [];
      arr.push(c);
      m.set(key, arr);
    });
    return m;
  }, [comments]);

  const create = useMutation({
    mutationFn: async () => {
      const payload: any = { body: body.trim() };
      if (replyTo?.id) payload.parent_id = replyTo.id;
      const r = await api.post(`/flamehub/posts/${postId}/comments`, payload);
      return r.data?.comment;
    },
    onSuccess: () => {
      setBody("");
      setReplyTo(null);
      qc.invalidateQueries({ queryKey: ["flamehub", "comments", postId] });
      qc.invalidateQueries({ queryKey: ["flamehub", "feed"] });
    },
  });

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      heightPct={0.8}
      // Pastikan style internal BottomSheet tidak menambah padding
      style={{ padding: 0, margin: 0 }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, backgroundColor: theme.colors.bg }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {/* Header Minimalis */}
        <View
          style={{
            height: 54,
            alignItems: "center",
            justifyContent: "center",
            borderBottomWidth: 0.3,
            borderColor: "rgba(255,255,255,0.1)",
          }}
        >
          <Text
            style={{
              color: theme.colors.text,
              fontSize: 15,
              fontWeight: "700",
            }}
          >
            Comments
          </Text>
        </View>

        {/* List Komentar */}
        <AppFlatList
          data={byParent.get(0) ?? []}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={{ paddingVertical: 8 }}
          renderItem={({ item }) => (
            <View>
              <CommentRow item={item} onReply={(c) => setReplyTo(c)} />
              {(byParent.get(item.id) ?? []).map((r) => (
                <CommentRow
                  key={r.id}
                  item={r}
                  indent={1}
                  onReply={(c) => setReplyTo(c)}
                />
              ))}
            </View>
          )}
          ListFooterComponent={
            query.hasNextPage ? (
              <Pressable
                onPress={() => query.fetchNextPage()}
                style={{ padding: 16 }}
              >
                <Text
                  style={{
                    color: theme.colors.muted,
                    textAlign: "center",
                    fontSize: 13,
                  }}
                >
                  Load more comments
                </Text>
              </Pressable>
            ) : (
              <View style={{ height: 20 }} />
            )
          }
        />

        {/* Input Area: Fixed at Bottom & Keyboard Aware */}
        <View
          style={{
            borderTopWidth: 0.3,
            borderColor: "rgba(255,255,255,0.1)",
            backgroundColor: theme.colors.bg,
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: Platform.OS === "ios" ? 32 : 12, // Sesuaikan untuk safe area ios
          }}
        >
          {replyTo && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                Replying to{" "}
                <Text style={{ fontWeight: "bold", color: theme.colors.green }}>
                  @{replyTo.user?.username}
                </Text>
              </Text>
              <Pressable onPress={() => setReplyTo(null)}>
                <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                  Cancel
                </Text>
              </Pressable>
            </View>
          )}

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              backgroundColor: "rgba(255,255,255,0.06)",
              borderRadius: 25,
              paddingHorizontal: 16,
              paddingVertical: 4,
              borderWidth: 0.5,
              borderColor: "rgba(255,255,255,0.1)",
            }}
          >
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="Add a comment..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              style={{
                color: theme.colors.text,
                flex: 1,
                fontSize: 14,
                minHeight: 40,
              }}
              multiline
            />
            {create.isPending ? (
              <ActivityIndicator size="small" color={theme.colors.green} />
            ) : (
              <Pressable
                onPress={() => create.mutate()}
                disabled={!body.trim()}
              >
                <Text
                  style={{
                    color: body.trim()
                      ? theme.colors.green
                      : "rgba(255,255,255,0.2)",
                    fontWeight: "700",
                    fontSize: 14,
                  }}
                >
                  Post
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </BottomSheet>
  );
}
