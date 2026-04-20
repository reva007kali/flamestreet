import { useEffect, useMemo, useRef } from "react";
import { Animated, Dimensions, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { theme } from "../ui/theme";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../store/authStore";
import { navigationRef } from "../navigation/navRef";
import * as SecureStore from "expo-secure-store";
import { PanResponder } from "react-native";

const EMPTY_ROLES: readonly string[] = [];
const POS_KEY = "flamestreet_chat_fab_pos_v1";

export default function ChatFab() {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  let tabBarHeight = 0;
  try {
    tabBarHeight = useBottomTabBarHeight();
  } catch {}

  const token = useAuthStore((s) => s.token);
  const roles = useAuthStore((s) => s.user?.roles ?? EMPTY_ROLES);
  const userId = useAuthStore((s) => s.user?.id ?? 0);
  const isAdmin = roles.includes("admin");
  const isCashier = roles.includes("cashier");
  const show = Boolean(token) && !isAdmin && !isCashier;
  if (!show) return null;

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
    if (navigationRef.isReady()) {
      navigationRef.navigate("Chats");
      return;
    }
    nav.navigate("Chats");
  };

  const size = 52;
  const bottomInset = (tabBarHeight > 0 ? tabBarHeight : insets.bottom) + 12;
  const topInset = insets.top + 90;
  const { width: sw, height: sh } = Dimensions.get("window");
  const maxX = Math.max(0, sw - 16 - size);
  const maxY = Math.max(0, sh - bottomInset - size);

  const position = useRef(
    new Animated.ValueXY({ x: maxX, y: maxY }),
  ).current;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync(`${POS_KEY}:${userId}`);
        if (cancelled) return;
        if (!raw) return;
        const parsed = JSON.parse(raw);
        const x = Number(parsed?.x);
        const y = Number(parsed?.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        const cx = Math.min(maxX, Math.max(0, x));
        const cy = Math.min(maxY, Math.max(topInset, y));
        position.setValue({ x: cx, y: cy });
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, maxX, maxY, topInset, position]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        position.setOffset({
          x: (position.x as any).__getValue(),
          y: (position.y as any).__getValue(),
        });
        position.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: position.x, dy: position.y }],
        { useNativeDriver: false },
      ),
      onPanResponderRelease: async (_evt, g) => {
        position.flattenOffset();
        const x = Number((position.x as any).__getValue());
        const y = Number((position.y as any).__getValue());
        const cx = Math.min(maxX, Math.max(0, x));
        const cy = Math.min(maxY, Math.max(topInset, y));
        position.setValue({ x: cx, y: cy });

        const moved = Math.abs(g.dx) + Math.abs(g.dy);
        if (moved < 6) {
          go();
          return;
        }

        if (userId) {
          try {
            await SecureStore.setItemAsync(
              `${POS_KEY}:${userId}`,
              JSON.stringify({ x: cx, y: cy }),
            );
          } catch {}
        }
      },
    }),
  ).current;

  return (
    <Animated.View
      style={{
        position: "absolute",
        zIndex: 50,
        transform: position.getTranslateTransform(),
      }}
      {...panResponder.panHandlers}
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
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
        <Ionicons name="chatbubble-ellipses" size={20} color="#041009" />
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
      </View>
    </Animated.View>
  );
}
