import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { theme } from "../ui/theme";

export default function ChatFab() {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  let tabBarHeight = 0;
  try {
    tabBarHeight = useBottomTabBarHeight();
  } catch {}

  const q = useQuery({
    queryKey: ["chatThreads"],
    queryFn: async () => (await api.get("/chats/threads")).data?.threads ?? [],
    refetchInterval: 8000,
    staleTime: 5000,
  });

  const unread = useMemo(() => {
    const list = q.data ?? [];
    return list.reduce(
      (sum: number, t: any) => sum + (Number(t?.unread_count ?? 0) || 0),
      0,
    );
  }, [q.data]);

  const go = () => {
    const parent = nav.getParent?.();
    if (parent?.navigate) parent.navigate("Chats");
    else nav.navigate("Chats");
  };

  const bottom = (tabBarHeight > 0 ? tabBarHeight : insets.bottom) + 12;

  return (
    <View style={{ position: "absolute", right: 16, bottom, zIndex: 50 }}>
      <Pressable
        onPress={go}
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: theme.colors.green,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOpacity: 0.25,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 10 },
          elevation: 10,
        }}
      >
        <Text style={{ color: "#041009", fontWeight: "900" }}>Chat</Text>
        {unread > 0 ? (
          <View
            style={{
              position: "absolute",
              right: -4,
              top: -4,
              minWidth: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: theme.colors.bg,
              borderWidth: 2,
              borderColor: theme.colors.green,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 5,
            }}
          >
            <Text
              style={{
                color: theme.colors.green,
                fontSize: 10,
                fontWeight: "900",
              }}
            >
              {unread > 9 ? "9+" : String(unread)}
            </Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}
