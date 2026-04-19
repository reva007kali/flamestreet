import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "../lib/api";
import { toPublicUrl } from "../lib/assets";
import { useAuthStore } from "../store/authStore";
import AppFlatList from "../ui/AppFlatList";
import { theme } from "../ui/theme";
import Screen from "../ui/Screen";
import { usePullToRefresh } from "../lib/usePullToRefresh";
import ChatFab from "../components/ChatFab";

const LAST_ADDRESS_KEY = "flamestreet_last_delivery_address";

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const { refreshing, onRefresh } = usePullToRefresh();

  const goRoot = (name: string, params?: any) => {
    const parent = navigation.getParent?.();
    if (parent?.navigate) parent.navigate(name, params);
    else navigation.navigate(name, params);
  };

  const fallbackBanners = [
    {
      id: "b1",
      title: "Green Week",
      subtitle: "Diskon menu pilihan",
      image: require("../../assets/splash-icon.png"),
    },
    {
      id: "b2",
      title: "Free Delivery",
      subtitle: "Untuk area tertentu",
      image: require("../../assets/icon.png"),
    },
    {
      id: "b3",
      title: "Flame Points",
      subtitle: "Kumpulkan & tukar",
      image: require("../../assets/adaptive-icon.png"),
    },
  ];

  const [bannerIndex, setBannerIndex] = useState(0);
  const bannerIndexRef = useRef(0);
  const bannerListRef = useRef<any>(null);
  const [lastAddress, setLastAddress] = useState<string>("");

  const promoBannersQuery = useQuery({
    queryKey: ["promo-banners", "member"],
    queryFn: async () => {
      const r = await api.get("/promo-banners", {
        params: { audience: "member" },
      });
      return Array.isArray(r.data?.banners) ? r.data.banners : [];
    },
  });

  const productsQuery = useQuery({
    queryKey: ["products", "featured"],
    queryFn: async () => {
      const r = await api.get("/products");
      return Array.isArray(r.data?.data) ? r.data.data : [];
    },
  });

  const ordersQuery = useQuery({
    queryKey: ["orders", "recent"],
    queryFn: async () => {
      const r = await api.get("/orders");
      return Array.isArray(r.data?.data) ? r.data.data : [];
    },
  });

  const flamehubFeedQuery = useQuery({
    queryKey: ["flamehub", "feed", "home"],
    queryFn: async () => {
      const r = await api.get("/flamehub/feed");
      return Array.isArray(r.data?.data) ? r.data.data : [];
    },
  });

  const gymsQuery = useQuery({
    queryKey: ["gyms"],
    queryFn: async () => {
      const r = await api.get("/gyms");
      return Array.isArray(r.data?.gyms) ? r.data.gyms : [];
    },
    enabled: !(user?.roles ?? []).includes("trainer"),
  });

  const featured = (productsQuery.data ?? []).filter((p: any) => p.is_featured);
  const recentOrders = (ordersQuery.data ?? []).slice(0, 3);
  const flamePosts = (flamehubFeedQuery.data ?? []).slice(0, 5);
  const isTrainer = (user?.roles ?? []).includes("trainer");
  const points = isTrainer
    ? (user?.trainer_profile?.total_points ?? 0)
    : (user?.member_profile?.total_points ?? 0);
  const banners =
    (promoBannersQuery.data?.length
      ? promoBannersQuery.data
      : fallbackBanners) ?? [];

  const onBannerViewableItemsChanged = useRef(({ viewableItems }: any) => {
    const i = viewableItems?.[0]?.index;
    if (typeof i === "number") {
      bannerIndexRef.current = i;
      setBannerIndex(i);
    }
  });

  useEffect(() => {
    if ((banners?.length ?? 0) <= 1) return;
    const id = setInterval(() => {
      const current = bannerIndexRef.current ?? 0;
      const next = (current + 1) % banners.length;
      bannerIndexRef.current = next;
      setBannerIndex(next);
      bannerListRef.current?.scrollToIndex?.({ index: next, animated: true });
    }, 4000);
    return () => clearInterval(id);
  }, [banners.length, width]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const v = await SecureStore.getItemAsync(LAST_ADDRESS_KEY);
        if (!cancelled && v) setLastAddress(v);
      } catch {}
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const defaultAddressText = useMemo(() => {
    if (lastAddress) return lastAddress;
    const defGymId = user?.member_profile?.default_gym_id;
    if (!defGymId) return "";
    const g = (gymsQuery.data ?? []).find(
      (x: any) => Number(x.id) === Number(defGymId),
    );
    if (!g) return "";
    return [g.gym_name, g.address].filter(Boolean).join(", ");
  }, [lastAddress, gymsQuery.data, user?.member_profile?.default_gym_id]);

  return (
    <Screen allowUnderHeader>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            tintColor={theme.colors.green}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      >
        {/* -- HERO SECTION (COMPACT) -- */}
        <View style={{ height: 300, width: "100%" }}>
          <AppFlatList
            ref={bannerListRef}
            data={banners}
            keyExtractor={(i: any) => String(i.id)}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onViewableItemsChanged={onBannerViewableItemsChanged.current}
            viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
            renderItem={({ item }: any) => {
              const remote =
                typeof item?.image === "string"
                  ? toPublicUrl(item.image)
                  : null;
              const source = remote ? { uri: remote } : item?.image;
              return (
                <View style={{ width, height: 300 }}>
                  <Image
                    source={source}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={[
                      "transparent",
                      "rgba(0,0,0,0.4)",
                      "rgba(0,0,0,0.9)",
                    ]}
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: 160,
                    }}
                  />
                  <View
                    style={{
                      position: "absolute",
                      bottom: 70,
                      left: 24,
                      right: 24,
                    }}
                  >
                    <Text
                      style={{
                        color: theme.colors.green,
                        fontWeight: "900",
                        fontSize: 10,
                        textTransform: "uppercase",
                        marginBottom: 4,
                      }}
                    >
                      Promo
                    </Text>
                    <Text
                      style={{
                        color: "#fff",
                        fontSize: 24,
                        fontWeight: "900",
                        lineHeight: 28,
                        width: "60%",
                      }}
                    >
                      {item.title}
                    </Text>
                    <Text
                      style={{
                        color: "rgba(255,255,255,0.7)",
                        fontSize: 10,
                        marginTop: 2,
                        width: "50%",
                      }}
                    >
                      {item.subtitle}
                    </Text>
                  </View>
                </View>
              );
            }}
          />
          <View
            style={{
              position: "absolute",
              bottom: 55,
              left: 24,
              flexDirection: "row",
              gap: 5,
            }}
          >
            {banners.map((_: any, idx: number) => (
              <View
                key={idx}
                style={{
                  width: idx === bannerIndex ? 16 : 5,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor:
                    idx === bannerIndex
                      ? theme.colors.green
                      : "rgba(255,255,255,0.3)",
                }}
              />
            ))}
          </View>
        </View>

        {/* -- PROFILE CARD (RE-ADJUSTED) -- */}
        <View style={{ marginTop: -35, paddingHorizontal: 20 }}>
          <View
            style={{
              backgroundColor: "#181818",
              borderRadius: 24,
              padding: 18,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.08)",
              shadowColor: "#000",
              shadowOpacity: 0.2,
              shadowRadius: 10,
              elevation: 5,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <Image
                  source={
                    toPublicUrl(user?.avatar)
                      ? { uri: toPublicUrl(user?.avatar) as string }
                      : require("../../assets/icon.png")
                  }
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: "#222",
                  }}
                />
                <View>
                  <Text
                    style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}
                  >
                    {user?.full_name?.split(" ")[0] ?? "Member"}
                  </Text>
                  <Text
                    style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}
                  >
                    Verified Member
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => goRoot("PointsHistory")}
                style={{ alignItems: "flex-end" }}
              >
                <Text
                  style={{ color: "#fff", fontWeight: "900", fontSize: 18 }}
                >
                  {Number(points).toLocaleString("id-ID")}
                </Text>
                <Text
                  style={{
                    color: theme.colors.green,
                    fontSize: 9,
                    fontWeight: "800",
                    textTransform: "uppercase",
                  }}
                >
                  Flame Points
                </Text>
              </Pressable>
            </View>
            {defaultAddressText && (
              <View
                style={{
                  marginTop: 14,
                  paddingTop: 14,
                  borderTopWidth: 1,
                  borderTopColor: "rgba(255,255,255,0.05)",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Ionicons
                  name="location"
                  size={14}
                  color={theme.colors.green}
                />
                <Text
                  style={{
                    color: "rgba(255,255,255,0.5)",
                    fontSize: 11,
                    flex: 1,
                  }}
                  numberOfLines={1}
                >
                  {defaultAddressText}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* -- QUICK ACTIONS (BENTO) -- */}
        <View style={{ padding: 20, gap: 12 }}>
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "900" }}>
            Discovery
          </Text>
          <View style={{ flexDirection: "row", gap: 12, height: 140 }}>
            <Pressable
              onPress={() => navigation.navigate("Products")}
              style={{
                flex: 1.2,
                backgroundColor: "#151515",
                borderRadius: 20,
                padding: 16,
                justifyContent: "space-between",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.03)",
              }}
            >
              <View
                style={{
                  backgroundColor: "rgba(34, 197, 94, 0.1)",
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name="fast-food"
                  size={20}
                  color={theme.colors.green}
                />
              </View>
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}>
                Flame Meals
              </Text>
            </Pressable>
            <View style={{ flex: 1, gap: 12 }}>
              <Pressable
                onPress={() =>
                  navigation.navigate(isTrainer ? "TrainerMembers" : "Cart")
                }
                style={{
                  flex: 1,
                  backgroundColor: "#151515",
                  borderRadius: 20,
                  paddingHorizontal: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.03)",
                }}
              >
                <Ionicons
                  name={isTrainer ? "people" : "cart"}
                  size={18}
                  color={isTrainer ? "#60a5fa" : "#a78bfa"}
                />
                <Text
                  style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}
                >
                  {isTrainer ? "Clients" : "Cart"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  navigation.navigate(isTrainer ? "TrainerWithdraw" : "Orders")
                }
                style={{
                  flex: 1,
                  backgroundColor: "#151515",
                  borderRadius: 20,
                  paddingHorizontal: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.03)",
                }}
              >
                <Ionicons
                  name={isTrainer ? "cash" : "receipt"}
                  size={18}
                  color={isTrainer ? "#fbbf24" : "#fb7185"}
                />
                <Text
                  style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}
                >
                  {isTrainer ? "Payout" : "Orders"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* -- POPULAR MENU -- */}
        <View style={{ paddingVertical: 10 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: 20,
              marginBottom: 12,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "900" }}>
              Weekly Popular
            </Text>
            <Pressable onPress={() => navigation.navigate("Products")}>
              <Text
                style={{
                  color: theme.colors.green,
                  fontWeight: "800",
                  fontSize: 12,
                }}
              >
                See all
              </Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 20, gap: 14 }}
          >
            {featured.map((p: any) => (
              <Pressable
                key={p.id}
                onPress={() =>
                  navigation.navigate("ProductDetail", { slug: p.slug })
                }
              >
                <View style={{ width: 140 }}>
                  <Image
                    source={
                      toPublicUrl(p.image)
                        ? { uri: toPublicUrl(p.image) }
                        : require("../../assets/icon.png")
                    }
                    style={{
                      width: 140,
                      height: 160,
                      borderRadius: 20,
                      backgroundColor: "#151515",
                    }}
                  />
                  <Text
                    style={{
                      color: "#fff",
                      fontWeight: "700",
                      fontSize: 13,
                      marginTop: 8,
                    }}
                    numberOfLines={1}
                  >
                    {p.name}
                  </Text>
                  <Text
                    style={{
                      color: theme.colors.green,
                      fontWeight: "800",
                      fontSize: 12,
                    }}
                  >
                    Rp {Number(p.price).toLocaleString("id-ID")}
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* -- FLAME FEED (FIXED ALIGNMENT) -- */}
        <View style={{ paddingVertical: 20, gap: 12 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: 20,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "900" }}>
              Flame Feed
            </Text>
            <Pressable
              onPress={() =>
                navigation.navigate("Flamehub", { screen: "Hub" } as any)
              }
            >
              <Text
                style={{
                  color: theme.colors.green,
                  fontWeight: "800",
                  fontSize: 12,
                }}
              >
                Explore
              </Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
          >
            {flamePosts.map((p: any) => {
              const coverSrc = p.media?.[0]?.path
                ? toPublicUrl(p.media[0].path)
                : null;
              return (
                <Pressable
                  key={p.id}
                  onPress={() =>
                    navigation.navigate("FlamehubPost", { id: p.id })
                  }
                >
                  <View
                    style={{
                      width: 180,
                      height: 260,
                      borderRadius: 24,
                      overflow: "hidden",
                      backgroundColor: "#111",
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.06)",
                    }}
                  >
                    <Image
                      source={
                        coverSrc
                          ? { uri: coverSrc }
                          : require("../../assets/icon.png")
                      }
                      style={{ width: "100%", height: "100%" }}
                    />
                    <LinearGradient
                      colors={["transparent", "rgba(0,0,0,0.8)"]}
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: 120,
                      }}
                    />
                    <View
                      style={{
                        position: "absolute",
                        bottom: 12,
                        left: 12,
                        right: 12,
                        gap: 4,
                      }}
                    >
                      <Text
                        style={{
                          color: "#fff",
                          fontSize: 12,
                          fontWeight: "800",
                        }}
                        numberOfLines={2}
                      >
                        {p.caption || "View Post"}
                      </Text>
                      <Text
                        style={{ color: "rgba(255,255,255,0.5)", fontSize: 10 }}
                      >
                        @{p.user?.username}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* -- RECENT ORDERS (MUTED ACCENT) -- */}
        <View style={{ padding: 20, gap: 12 }}>
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "900" }}>
            Recent Orders
          </Text>
          {recentOrders.map((o: any) => {
            const isDelivered =
              o.status === "completed" || o.status === "delivered";
            const items = Array.isArray(o.items) ? o.items : [];
            const itemsText = items
              .slice(0, 2)
              .map(
                (it: any) =>
                  `${Number(it.quantity ?? 1) || 1}x ${it.product_name}`,
              )
              .join(" • ");
            const more = Math.max(0, items.length - 2);
            const itemsSummary = itemsText
              ? `${itemsText}${more ? ` • +${more}` : ""}`
              : "Items tidak tersedia";
            const dateStr = o.created_at
              ? new Date(o.created_at).toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "";
            return (
              <Pressable
                key={o.id}
                onPress={() =>
                  navigation.navigate("OrderDetail", {
                    orderNumber: o.order_number,
                    orderId: o.id,
                  })
                }
              >
                <View
                  style={{
                    padding: 16,
                    borderRadius: 20,
                    backgroundColor: isDelivered
                      ? "rgba(34, 197, 94, 0.05)"
                      : "#151515",
                    borderWidth: 1,
                    borderColor: isDelivered
                      ? "rgba(34, 197, 94, 0.15)"
                      : "rgba(255,255,255,0.03)",
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <View>
                    <Text
                      style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}
                      numberOfLines={1}
                    >
                      {itemsSummary}
                    </Text>
                    <Text
                      style={{
                        color: "rgba(255,255,255,0.4)",
                        fontSize: 11,
                        marginTop: 2,
                      }}
                      numberOfLines={1}
                    >
                      {dateStr ? `${dateStr} • ` : ""}
                      {String(o.status ?? "").toUpperCase()} •{" "}
                      {o.payment_status}
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: isDelivered ? theme.colors.green : "#fff",
                      fontWeight: "900",
                      fontSize: 14,
                    }}
                  >
                    Rp {Number(o.total_amount).toLocaleString("id-ID")}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      <ChatFab />
    </Screen>
  );
}
