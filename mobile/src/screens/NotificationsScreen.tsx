import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { loadInbox, markRead, type InboxItem } from "../lib/notificationInbox";
import Screen from "../ui/Screen";
import { theme } from "../ui/theme";
import { usePullToRefresh } from "../lib/usePullToRefresh";
import Card from "../ui/Card";
import { useAuthStore } from "../store/authStore";

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const roles = useAuthStore((s) => s.user?.roles ?? []);
  const { refreshing, onRefresh } = usePullToRefresh();
  const [items, setItems] = useState<InboxItem[]>([]);

  const reload = useCallback(async () => {
    const list = await loadInbox();
    setItems(list);
  }, []);

  useEffect(() => {
    reload();
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const unreadCount = useMemo(
    () => items.filter((i) => !i.read).length,
    [items],
  );

  const goFromNotification = (n: InboxItem) => {
    const d: any = n.data ?? {};
    if (d.order_id && (roles.includes("cashier") || roles.includes("admin"))) {
      navigation.navigate("CashierOrderDetail", { id: Number(d.order_id) });
      return;
    }
    if (d.order_number) {
      navigation.navigate("OrderDetail", {
        orderNumber: String(d.order_number),
        orderId: d.order_id ? Number(d.order_id) : undefined,
      });
      return;
    }
    if (d.slug) {
      navigation.navigate("ArticleDetail", { slug: String(d.slug) });
      return;
    }
  };

  return (
    <Screen>
      <FlatList
        contentContainerStyle={{ padding: theme.spacing.md, gap: 12 }}
        data={items}
        keyExtractor={(i) => i.id}
        refreshControl={
          <RefreshControl
            tintColor={theme.colors.text}
            refreshing={refreshing}
            onRefresh={async () => {
              await onRefresh();
              await reload();
            }}
          />
        }
        ListHeaderComponent={
          <View style={{ gap: 6 }}>
            <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: "900" }}>
              Notifications
            </Text>
            <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
              {unreadCount ? `${unreadCount} unread` : "All read"}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={{ color: theme.colors.muted }}>No notifications yet.</Text>
        }
        renderItem={({ item }) => {
          const when = new Date(item.createdAt).toLocaleString("id-ID");
          const icon =
            item.type === "order_created"
              ? "receipt"
              : item.type === "order_paid"
                ? "checkmark-circle"
                : item.type === "order_status"
                  ? "time"
                  : item.type === "order_queue"
                    ? "notifications"
                    : "information-circle";
          return (
            <Pressable
              onPress={async () => {
                await markRead(item.id);
                await reload();
                goFromNotification(item);
              }}
            >
              <Card
                style={{
                  gap: 8,
                  borderColor: item.read ? theme.colors.border : theme.colors.green,
                }}
              >
                <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      backgroundColor: "#0a0f0c",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name={icon as any} size={18} color={theme.colors.green} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ color: theme.colors.text, fontWeight: "900" }} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {item.body ? (
                      <Text style={{ color: theme.colors.muted, fontSize: 12 }} numberOfLines={2}>
                        {item.body}
                      </Text>
                    ) : null}
                    <Text style={{ color: theme.colors.muted, fontSize: 11 }}>{when}</Text>
                  </View>
                  {!item.read ? (
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: theme.colors.green,
                      }}
                    />
                  ) : null}
                </View>
              </Card>
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}
