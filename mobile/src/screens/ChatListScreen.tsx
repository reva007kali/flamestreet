import { useMemo } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import Screen from "../ui/Screen";
import Card from "../ui/Card";
import AppFlatList from "../ui/AppFlatList";
import { api } from "../lib/api";
import { theme } from "../ui/theme";
import { getApiBaseUrl } from "../lib/env";
import * as WebBrowser from "expo-web-browser";

type Thread = {
  order_id: number;
  order_number: string;
  other_user: { id: number; full_name: string; avatar?: string | null } | null;
  last_message: {
    id: number;
    type: "text" | "image";
    body?: string | null;
    created_at?: string | null;
  } | null;
  unread_count: number;
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

function previewText(last: Thread["last_message"]) {
  if (!last) return "Belum ada chat";
  if (last.type === "image") return "[Foto]";
  const b = String(last.body ?? "").trim();
  return b || "Pesan";
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

export default function ChatListScreen() {
  const navigation = useNavigation<any>();

  const q = useQuery({
    queryKey: ["chatThreads"],
    queryFn: async (): Promise<Thread[]> =>
      (await api.get("/chats/threads")).data?.threads ?? [],
    refetchInterval: 6000,
  });

  const threads = q.data ?? [];

  const totalUnread = useMemo(
    () =>
      threads.reduce((sum, t) => sum + (Number(t?.unread_count ?? 0) || 0), 0),
    [threads],
  );

  const header = useMemo(() => {
    return (
      <Card style={{ gap: 10 }}>
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
                color: theme.colors.text,
                fontSize: 18,
                fontWeight: "900",
              }}
            >
              Chats
            </Text>
            <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
              {totalUnread > 0 ? `${totalUnread} unread` : "All read"}
            </Text>
          </View>
          <Pressable
            onPress={() =>
              WebBrowser.openBrowserAsync("https://wa.me/6285182841385")
            }
          >
            <View
              style={{
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: 999,
                paddingVertical: 8,
                paddingHorizontal: 12,
                backgroundColor: "rgba(255,255,255,0.04)",
              }}
            >
              <Text
                style={{
                  color: theme.colors.text,
                  fontWeight: "900",
                  fontSize: 11,
                }}
              >
                WhatsApp
              </Text>
            </View>
          </Pressable>
        </View>
      </Card>
    );
  }, [totalUnread]);

  return (
    <Screen>
      <AppFlatList
        contentContainerStyle={{ padding: theme.spacing.md, gap: 12 }}
        data={threads}
        keyExtractor={(i) => String(i.order_id)}
        refreshing={q.isFetching}
        onRefresh={() => q.refetch()}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <Text style={{ color: theme.colors.muted }}>
            {q.isLoading ? "Loading…" : "Belum ada chat"}
          </Text>
        }
        renderItem={({ item }) => {
          const other = item.other_user;
          const avatar = toAssetUrl(other?.avatar ?? null);
          const unread = Number(item.unread_count ?? 0) || 0;
          return (
            <Pressable
              onPress={() =>
                navigation.navigate("ChatThread", {
                  orderNumber: item.order_number,
                  orderId: item.order_id,
                })
              }
            >
              <View
                style={{ flexDirection: "row", gap: 12, alignItems: "center" }}
              >
                <View style={{ width: 44, height: 44 }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      overflow: "hidden",
                      backgroundColor: theme.colors.card,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                    }}
                  >
                    {avatar ? (
                      <Image
                        source={{ uri: avatar }}
                        style={{ width: 44, height: 44 }}
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
                          style={{
                            color: theme.colors.muted,
                            fontWeight: "900",
                          }}
                        >
                          {(other?.full_name ?? "C").slice(0, 1).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                  {unread > 0 ? (
                    <View
                      style={{
                        position: "absolute",
                        right: -4,
                        top: -4,
                        minWidth: 18,
                        height: 18,
                        borderRadius: 9,
                        backgroundColor: theme.colors.green,
                        alignItems: "center",
                        justifyContent: "center",
                        paddingHorizontal: 5,
                        borderWidth: 2,
                        borderColor: theme.colors.bg,
                      }}
                    >
                      <Text
                        style={{
                          color: "#041009",
                          fontSize: 10,
                          fontWeight: "900",
                        }}
                      >
                        {unread > 9 ? "9+" : String(unread)}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <Text
                      numberOfLines={1}
                      style={{
                        color: theme.colors.text,
                        fontWeight: "900",
                        flex: 1,
                      }}
                    >
                      {other?.full_name || "Chat"}
                    </Text>
                    <Text style={{ color: theme.colors.muted, fontSize: 11 }}>
                      {fmtTime(item.last_message?.created_at ?? null)}
                    </Text>
                  </View>
                  <Text
                    numberOfLines={1}
                    style={{
                      color: theme.colors.muted,
                      fontSize: 12,
                      marginTop: 2,
                    }}
                  >
                    #{item.order_number} • {previewText(item.last_message)}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}
