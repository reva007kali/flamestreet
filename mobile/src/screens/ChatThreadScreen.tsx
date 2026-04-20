import { useEffect, useMemo, useRef, useState } from "react";
import { Image, Modal, Pressable, Text, TextInput, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import Screen from "../ui/Screen";
import { theme } from "../ui/theme";
import { api } from "../lib/api";
import { getApiBaseUrl } from "../lib/env";
import { useAuthStore } from "../store/authStore";
import { createEcho } from "../lib/realtime";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import AppFlatList from "../ui/AppFlatList";

type Message = {
  id: number;
  order_id: number;
  sender_id: number;
  sender?: { id: number; full_name: string; avatar?: string | null } | null;
  type: "text" | "image";
  body?: string | null;
  image_path?: string | null;
  created_at?: string | null;
};

function toAssetUrl(p?: string | null) {
  if (!p) return null;
  const v = String(p).trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  const base = getApiBaseUrl().replace(/\/$/, "");
  if (v.startsWith("uploads/")) return `${base}/${v}`;
  if (v.startsWith("storage/")) return `${base}/${v}`;
  return `${base}/storage/${v}`;
}

function pad2(v: number) {
  return String(v).padStart(2, "0");
}

function fmtTime(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

async function compressForChat(uri: string) {
  const max = 1280;
  let current = uri;
  const steps = [
    { size: max, quality: 0.72 },
    { size: 1024, quality: 0.62 },
    { size: 800, quality: 0.55 },
  ];

  for (const s of steps) {
    const r = await ImageManipulator.manipulateAsync(
      current,
      [{ resize: { width: s.size } }],
      { compress: s.quality, format: ImageManipulator.SaveFormat.WEBP },
    );
    current = r.uri;
  }
  return current;
}

export default function ChatThreadScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();

  let tabBarHeight = 0;
  try {
    tabBarHeight = useBottomTabBarHeight();
  } catch {}

  const token = useAuthStore((s) => s.token);
  const me = useAuthStore((s) => s.user);
  const meId = Number(me?.id) || 0;

  const orderNumber: string = String(route.params?.orderNumber ?? "");
  const orderIdParam = route.params?.orderId;
  const orderId: number | null =
    orderIdParam != null ? Number(orderIdParam) : null;

  const [text, setText] = useState("");
  const [pickedUri, setPickedUri] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [avatarModal, setAvatarModal] = useState<{
    url: string;
    name: string;
  } | null>(null);
  const [imageModal, setImageModal] = useState<string | null>(null);

  const listRef = useRef<any>(null);
  const echo = useMemo(() => (token ? createEcho(token) : null), [token]);

  const messagesQuery = useQuery({
    queryKey: ["orderChat", orderId],
    enabled: Boolean(orderId),
    queryFn: async (): Promise<Message[]> =>
      (await api.get(`/orders/${orderId}/chat/messages`)).data?.messages ?? [],
  });

  const messages = messagesQuery.data ?? [];

  const markRead = useMutation({
    mutationFn: async () => {
      if (!orderId) return;
      await api.post(`/chats/threads/${orderId}/read`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chatThreads"] });
    },
  });

  useEffect(() => {
    if (!orderId) return;
    if (!messagesQuery.isSuccess) return;
    markRead.mutate();
  }, [orderId, messagesQuery.isSuccess]);

  useEffect(() => {
    if (!echo || !orderId) return;
    const ch = echo.private(`order.${orderId}`);
    ch.listen(".OrderChatMessageCreated", (payload: any) => {
      const m = payload as any;
      if (!m?.id) return;
      qc.setQueryData(["orderChat", orderId], (prev: any) => {
        const list: any[] = Array.isArray(prev) ? prev : [];
        if (list.some((x) => Number(x?.id) === Number(m.id))) return list;
        return [...list, m];
      });
      qc.invalidateQueries({ queryKey: ["chatThreads"] });
      if (Number(m?.sender_id) !== meId) markRead.mutate();
    });
    return () => {
      try {
        echo.leave(`order.${orderId}`);
      } catch {}
    };
  }, [echo, orderId, qc, meId]);

  useEffect(() => {
    setTimeout(() => listRef.current?.scrollToEnd?.({ animated: true }), 50);
  }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!orderId) return;
      setSending(true);
      const fd = new FormData();
      const body = String(text ?? "").trim();
      if (body) fd.append("body", body);
      if (pickedUri) {
        const uri = await compressForChat(pickedUri);
        const name = `chat_${Date.now()}.webp`;
        fd.append("image", { uri, name, type: "image/webp" } as any);
      }
      const r = await api.post(`/orders/${orderId}/chat/messages`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return r.data?.message as Message | null;
    },
    onSuccess: (msg) => {
      if (msg && orderId) {
        qc.setQueryData(["orderChat", orderId], (prev: any) => {
          const list: any[] = Array.isArray(prev) ? prev : [];
          if (list.some((x) => Number(x?.id) === Number(msg.id))) return list;
          return [...list, msg];
        });
      }
      setText("");
      setPickedUri(null);
      markRead.mutate();
      qc.invalidateQueries({ queryKey: ["chatThreads"] });
    },
    onSettled: () => setSending(false),
  });

  const composerBottom = tabBarHeight > 0 ? tabBarHeight : insets.bottom;
  const composerHeight = pickedUri ? 178 : 124;
  const listBottomInset = composerBottom + composerHeight + 12;
  const canSend = Boolean(orderId) && !sending && (text.trim() || pickedUri);

  return (
    <Screen headerShown={false} allowUnderHeader>
      <View
        style={{
          position: "absolute",
          top: insets.top,
          left: 0,
          right: 0,
          height: 56,
          paddingHorizontal: 14,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          backgroundColor: theme.colors.bg,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        }}
      >
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={{ color: theme.colors.green, fontWeight: "900" }}>
            Back
          </Text>
        </Pressable>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={1}
            style={{ color: theme.colors.text, fontWeight: "900" }}
          >
            #{orderNumber}
          </Text>
        </View>
      </View>

      <View style={{ flex: 1, paddingTop: insets.top + 56 }}>
        <View style={{ flex: 1, paddingHorizontal: 12 }}>
          <View style={{ height: 10 }} />

          <View style={{ flex: 1 }}>
            <AppFlatList
              ref={listRef}
              contentContainerStyle={{
                gap: 10,
                paddingBottom: listBottomInset,
              }}
              data={messages}
              keyExtractor={(m) => String(m.id)}
              renderItem={({ item: m }) => {
                const mine = Number(m.sender_id) === meId;
                const img =
                  m.type === "image" ? toAssetUrl(m.image_path) : null;
                const av = toAssetUrl(m.sender?.avatar ?? null);
                const bubbleBg = mine ? theme.colors.green : theme.colors.card;
                const bubbleText = mine ? "#041009" : theme.colors.text;
                return (
                  <View
                    style={{
                      flexDirection: mine ? "row-reverse" : "row",
                      alignItems: "flex-end",
                      gap: 8,
                    }}
                  >
                    <Pressable
                      onPress={() => {
                        if (!av) return;
                        setAvatarModal({
                          url: av,
                          name: m.sender?.full_name ?? "Avatar",
                        });
                      }}
                      disabled={!av}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        overflow: "hidden",
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        backgroundColor: theme.colors.card,
                      }}
                    >
                      {av ? (
                        <Image
                          source={{ uri: av }}
                          style={{ width: 32, height: 32 }}
                        />
                      ) : null}
                    </Pressable>

                    <View
                      style={{
                        maxWidth: "82%",
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        borderRadius: 16,
                        backgroundColor: bubbleBg,
                        borderWidth: mine ? 0 : 1,
                        borderColor: theme.colors.border,
                      }}
                    >
                      {m.body ? (
                        <Text style={{ color: bubbleText, fontWeight: "600" }}>
                          {m.body}
                        </Text>
                      ) : null}
                      {img ? (
                        <Pressable onPress={() => setImageModal(img)}>
                          <Image
                            source={{ uri: img }}
                            style={{
                              width: 220,
                              height: 220,
                              borderRadius: 12,
                              marginTop: 8,
                              backgroundColor: "#000",
                            }}
                            resizeMode="cover"
                          />
                        </Pressable>
                      ) : null}
                      <Text
                        style={{
                          color: mine
                            ? "rgba(4,16,9,0.55)"
                            : theme.colors.muted,
                          fontSize: 10,
                          fontWeight: "800",
                          marginTop: 6,
                        }}
                      >
                        {fmtTime(m.created_at)}
                      </Text>
                    </View>
                  </View>
                );
              }}
              ListEmptyComponent={
                <Text style={{ color: theme.colors.muted }}>
                  {messagesQuery.isLoading ? "Loading…" : "Belum ada chat"}
                </Text>
              }
            />
          </View>
        </View>
      </View>

      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: composerBottom,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          backgroundColor: theme.colors.bg,
          paddingHorizontal: 12,
          paddingTop: 10,
          paddingBottom: Math.max(10, insets.bottom > 0 && tabBarHeight <= 0 ? insets.bottom : 10),
        }}
      >
        {pickedUri ? (
          <View
            style={{
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.lg,
              padding: 10,
              marginBottom: 10,
              backgroundColor: theme.colors.card,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text
              style={{
                color: theme.colors.text,
                fontWeight: "900",
                fontSize: 12,
              }}
            >
              Foto siap dikirim
            </Text>
            <Pressable onPress={() => setPickedUri(null)}>
              <Text style={{ color: theme.colors.muted, fontWeight: "900" }}>
                Remove
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Tulis pesan…"
              placeholderTextColor={theme.colors.muted}
              multiline
              style={{
                minHeight: 42,
                maxHeight: 120,
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.lg,
                paddingHorizontal: 12,
                paddingVertical: 10,
                color: theme.colors.text,
                backgroundColor: "rgba(0,0,0,0.25)",
              }}
            />
            <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
              <Pressable
                onPress={async () => {
                  const perm =
                    await ImagePicker.requestCameraPermissionsAsync();
                  if (!perm.granted) return;
                  const r = await ImagePicker.launchCameraAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    quality: 1,
                  });
                  if (r.canceled) return;
                  const uri = r.assets?.[0]?.uri;
                  if (uri) setPickedUri(uri);
                }}
              >
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    borderRadius: theme.radius.lg,
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    backgroundColor: theme.colors.card,
                  }}
                >
                  <Text
                    style={{
                      color: theme.colors.text,
                      fontWeight: "900",
                      fontSize: 11,
                    }}
                  >
                    Foto
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>

          <Pressable disabled={!canSend} onPress={() => sendMutation.mutate()}>
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 16,
                backgroundColor: canSend
                  ? theme.colors.green
                  : theme.colors.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#041009", fontWeight: "900" }}>Send</Text>
            </View>
          </Pressable>
        </View>
      </View>

      <Modal
        transparent
        visible={Boolean(avatarModal?.url)}
        onRequestClose={() => setAvatarModal(null)}
        animationType="fade"
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.75)",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onPress={() => setAvatarModal(null)}
        >
          <Pressable
            onPress={() => {}}
            style={{
              width: "100%",
              maxWidth: 360,
              borderRadius: theme.radius.lg,
              borderWidth: 1,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.bg,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.border,
              }}
            >
              <Text
                numberOfLines={1}
                style={{ color: theme.colors.text, fontWeight: "900", flex: 1 }}
              >
                {avatarModal?.name ?? "Avatar"}
              </Text>
              <Pressable onPress={() => setAvatarModal(null)}>
                <Text style={{ color: theme.colors.green, fontWeight: "900" }}>
                  Close
                </Text>
              </Pressable>
            </View>
            {avatarModal?.url ? (
              <Image
                source={{ uri: avatarModal.url }}
                style={{ width: "100%", height: 360, backgroundColor: "#000" }}
                resizeMode="cover"
              />
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        transparent
        visible={Boolean(imageModal)}
        onRequestClose={() => setImageModal(null)}
        animationType="fade"
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.85)",
            alignItems: "center",
            justifyContent: "center",
            padding: 14,
          }}
          onPress={() => setImageModal(null)}
        >
          {imageModal ? (
            <Image
              source={{ uri: imageModal }}
              style={{ width: "100%", height: "80%", borderRadius: 18 }}
              resizeMode="contain"
            />
          ) : null}
          <View style={{ height: 12 }} />
          <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
            Tap untuk tutup
          </Text>
        </Pressable>
      </Modal>
    </Screen>
  );
}
