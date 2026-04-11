import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
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
import { api } from "../lib/api";
import { toPublicUrl } from "../lib/assets";
import { useAuthStore } from "../store/authStore";
import Card from "../ui/Card";
import { theme } from "../ui/theme";
import Screen from "../ui/Screen";
import { usePullToRefresh } from "../lib/usePullToRefresh";

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
  const [lastAddress, setLastAddress] = useState<string>("");

  const promoBannersQuery = useQuery({
    queryKey: ["promo-banners", "member"],
    queryFn: async () => {
      const r = await api.get("/promo-banners", {
        params: { audience: "member" },
      });
      const items = r.data?.banners ?? [];
      return Array.isArray(items) ? items : [];
    },
  });

  const productsQuery = useQuery({
    queryKey: ["products", "featured"],
    queryFn: async () => {
      const r = await api.get("/products");
      const data = r.data?.data ?? [];
      return Array.isArray(data) ? data : [];
    },
  });

  const ordersQuery = useQuery({
    queryKey: ["orders", "recent"],
    queryFn: async () => {
      const r = await api.get("/orders");
      const data = r.data?.data ?? [];
      return Array.isArray(data) ? data : [];
    },
  });

  const pinnedArticlesQuery = useQuery({
    queryKey: ["articles", "pinned"],
    queryFn: async () => {
      const r = await api.get("/articles", { params: { pinned: 1, limit: 5 } });
      const items = r.data?.data ?? r.data?.articles ?? [];
      return Array.isArray(items) ? items : [];
    },
  });

  const latestArticlesQuery = useQuery({
    queryKey: ["articles", "latest"],
    enabled: (pinnedArticlesQuery.data?.length ?? 0) === 0,
    queryFn: async () => {
      const r = await api.get("/articles", { params: { limit: 5 } });
      const items = r.data?.data ?? [];
      return Array.isArray(items) ? items : [];
    },
  });

  const featured = (productsQuery.data ?? [])
    .filter((p: any) => p.is_featured)
    .slice(0, 6);
  const recentOrders = (ordersQuery.data ?? []).slice(0, 3);
  const articles =
    (pinnedArticlesQuery.data?.length
      ? pinnedArticlesQuery.data
      : latestArticlesQuery.data) ?? [];
  const isTrainer = (user?.roles ?? []).includes("trainer");
  const points = isTrainer
    ? (user?.trainer_profile?.total_points ?? 0)
    : (user?.member_profile?.total_points ?? 0);
  const banners =
    (promoBannersQuery.data?.length
      ? promoBannersQuery.data
      : fallbackBanners) ?? [];

  const gymsQuery = useQuery({
    queryKey: ["gyms"],
    queryFn: async () => {
      const r = await api.get("/gyms");
      const items = r.data?.gyms ?? [];
      return Array.isArray(items) ? items : [];
    },
    enabled: !isTrainer,
  });

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
    const parts = [g.gym_name, g.address, g.city, g.province].filter(Boolean);
    return parts.join(", ");
  }, [lastAddress, gymsQuery.data, user?.member_profile?.default_gym_id]);

  return (
    <Screen allowUnderHeader>
      <ScrollView
        contentContainerStyle={{
          gap: theme.spacing.md,
        }}
        refreshControl={
          <RefreshControl
            tintColor={theme.colors.text}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      >
        <View style={{ width: "100%" }}>
          <FlatList
            data={banners}
            keyExtractor={(i: any) => String(i.id)}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onViewableItemsChanged={({ viewableItems }) => {
              const i = viewableItems?.[0]?.index;
              if (typeof i === "number") setBannerIndex(i);
            }}
            viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
            renderItem={({ item }: any) => {
              const remote =
                typeof item?.image === "string"
                  ? toPublicUrl(item.image)
                  : null;
              const source = remote ? { uri: remote } : item?.image;
              return (
                <View
                  style={{
                    width,
                    height: 300,
                    borderRadius: theme.radius.lg,
                    overflow: "hidden",
                  }}
                >
                  {source ? (
                    <Image
                      source={source}
                      style={{ width: "100%", height: 300 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={{
                        width: "100%",
                        height: 300,
                        backgroundColor: "#0a0f0c",
                        borderBottomWidth: 1,
                        borderBottomColor: theme.colors.border,
                      }}
                    />
                  )}
                  <View
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      bottom: 0,
                      top: 0,
                      backgroundColor: "rgba(0,0,0,0.45)",
                    }}
                  />
                  <View
                    style={{
                      position: "absolute",
                      left: 16,
                      right: 16,
                      bottom: 38,
                      gap: 6,
                    }}
                  >
                    <Text
                      style={{
                        color: theme.colors.text,
                        fontSize: 25,
                        fontWeight: "900",
                      }}
                    >
                      {item.title}
                    </Text>
                    <Text style={{ color: theme.colors.muted }}>
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
              bottom: 10,
              left: 0,
              right: 0,
              flexDirection: "row",
              justifyContent: "center",
              gap: 6,
            }}
          >
            {banners.map((b: any, idx: number) => (
              <View
                key={String(b.id)}
                style={{
                  width: idx === bannerIndex ? 18 : 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor:
                    idx === bannerIndex
                      ? theme.colors.green
                      : "rgba(255,255,255,0.35)",
                }}
              />
            ))}
          </View>
        </View>

        <View style={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
          <Card
            style={{
              borderRadius: theme.radius.md,
              borderColor: theme.colors.green,
              borderWidth: 0.3,
              flexDirection: "column",
              alignItems: "stretch",
              justifyContent: "center",
              gap: 10,
              padding: 12,
            }}
          >
            {defaultAddressText ? (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Ionicons
                  name="location"
                  size={14}
                  color={theme.colors.muted}
                />
                <Text
                  style={{ color: theme.colors.muted, fontSize: 12, flex: 1 }}
                  numberOfLines={1}
                >
                  {defaultAddressText}
                </Text>
              </View>
            ) : null}

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                {toPublicUrl(user?.avatar) ? (
                  <Image
                    source={{ uri: toPublicUrl(user?.avatar) as string }}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      borderWidth: 2,
                      borderColor: theme.colors.border,
                    }}
                  />
                ) : (
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons
                      name="person"
                      size={22}
                      color={theme.colors.text}
                    />
                  </View>
                )}
                <View style={{ gap: 2 }}>
                  <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                    {user?.full_name ?? "Member"}
                  </Text>
                  <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                    @{user?.username ?? "username"}
                  </Text>
                </View>
              </View>

              <Pressable onPress={() => goRoot("PointsHistory")}>
                <View
                  style={{
                    alignItems: "flex-end",
                    gap: 2,
                    backgroundColor: "#0b1b12",
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    borderRadius: 14,
                    paddingVertical: 8,
                    paddingHorizontal: 10,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Ionicons
                      name="flame"
                      size={16}
                      color={theme.colors.green}
                    />
                    <Text
                      style={{ color: theme.colors.text, fontWeight: "900" }}
                    >
                      {Number(points).toLocaleString("id-ID")} fp
                    </Text>
                  </View>
                  <Text style={{ color: theme.colors.muted, fontSize: 11 }}>
                    Flame Points
                  </Text>
                </View>
              </Pressable>
            </View>
          </Card>

          <Card
            style={{
              flexDirection: "column",
              alignItems: "flex-start",
              justifyContent: "center",
              gap: 12,
              padding: 12,
            }}
          >
            <Text
              style={{
                color: theme.colors.text,
                fontSize: 16,
                fontWeight: "900",
              }}
            >
              Quick Menu
            </Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
              }}
            >
              <Pressable onPress={() => navigation.navigate("Products")}>
                <View
                  style={{
                    alignItems: "center",
                    justifyContent: "center",
                    width: 100,
                    borderRadius: theme.radius.md,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    padding: 12,
                    gap: 8,
                  }}
                >
                  <Ionicons name="fast-food" size={20} color="#22c55e" />
                  <Text style={{ color: theme.colors.text, fontWeight: "800" }}>
                    Meals
                  </Text>
                </View>
              </Pressable>
              {isTrainer ? (
                <>
                  <Pressable onPress={() => goRoot("TrainerMembers")}>
                    <View
                      style={{
                        alignItems: "center",
                        justifyContent: "center",
                        width: 100,
                        borderRadius: theme.radius.md,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        padding: 12,
                        gap: 8,
                      }}
                    >
                      <Ionicons name="people" size={20} color="#60a5fa" />
                      <Text
                        style={{ color: theme.colors.text, fontWeight: "800" }}
                      >
                        Members
                      </Text>
                    </View>
                  </Pressable>
                  <Pressable onPress={() => goRoot("TrainerWithdraw")}>
                    <View
                      style={{
                        alignItems: "center",
                        justifyContent: "center",
                        width: 100,
                        borderRadius: theme.radius.md,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        padding: 12,
                        gap: 8,
                      }}
                    >
                      <Ionicons name="cash" size={20} color="#fbbf24" />
                      <Text
                        style={{ color: theme.colors.text, fontWeight: "800" }}
                      >
                        Withdraw
                      </Text>
                    </View>
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable onPress={() => navigation.navigate("Cart")}>
                    <View
                      style={{
                        alignItems: "center",
                        justifyContent: "center",
                        width: 100,
                        borderRadius: theme.radius.md,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        padding: 12,
                        gap: 8,
                      }}
                    >
                      <Ionicons name="cart" size={20} color="#a78bfa" />
                      <Text
                        style={{ color: theme.colors.text, fontWeight: "800" }}
                      >
                        Cart
                      </Text>
                      <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                        Checkout
                      </Text>
                    </View>
                  </Pressable>
                  <Pressable onPress={() => navigation.navigate("Orders")}>
                    <View
                      style={{
                        alignItems: "center",
                        justifyContent: "center",
                        width: 100,
                        borderRadius: theme.radius.md,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        padding: 12,
                        gap: 8,
                      }}
                    >
                      <Ionicons name="receipt" size={20} color="#fb7185" />
                      <Text
                        style={{ color: theme.colors.text, fontWeight: "800" }}
                      >
                        Orders
                      </Text>
                      <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                        Track status
                      </Text>
                    </View>
                  </Pressable>
                </>
              )}
            </View>
          </Card>

          <Card style={{ gap: 10 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: theme.colors.text,
                  fontSize: 16,
                  fontWeight: "900",
                }}
              >
                Menu Pilihan
              </Text>
              <Pressable onPress={() => navigation.navigate("Products")}>
                <Text style={{ color: theme.colors.green, fontWeight: "800" }}>
                  View all
                </Text>
              </Pressable>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12 }}
            >
              {(featured.length
                ? featured
                : (productsQuery.data ?? []).slice(0, 6)
              ).map((p: any) => {
                const img = toPublicUrl(p.image);
                return (
                  <Pressable
                    key={p.id}
                    onPress={() =>
                      navigation.navigate("ProductDetail", { slug: p.slug })
                    }
                  >
                    <View style={{ width: 220, gap: 8 }}>
                      {img ? (
                        <Image
                          source={{ uri: img }}
                          style={{
                            width: 220,
                            height: 120,
                            borderRadius: theme.radius.md,
                            backgroundColor: "#0a0f0c",
                          }}
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          style={{
                            width: 180,
                            height: 120,
                            borderRadius: theme.radius.md,
                            backgroundColor: "#0a0f0c",
                            borderWidth: 1,
                            borderColor: theme.colors.border,
                          }}
                        />
                      )}
                      <Text
                        numberOfLines={1}
                        style={{ color: theme.colors.text, fontWeight: "800" }}
                      >
                        {p.name}
                      </Text>
                      <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                        Rp {Number(p.price ?? 0).toLocaleString("id-ID")}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Card>

          <Card style={{ gap: 10 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: theme.colors.text,
                  fontSize: 16,
                  fontWeight: "900",
                }}
              >
                Flame-news
              </Text>
              <Pressable onPress={() => navigation.navigate("Articles")}>
                <Text style={{ color: theme.colors.green, fontWeight: "800" }}>
                  View all
                </Text>
              </Pressable>
            </View>
            {(articles as any[]).slice(0, 5).map((a: any) => {
              const img = toPublicUrl(a.cover_image);
              return (
                <Pressable
                  key={a.id}
                  onPress={() =>
                    navigation.navigate("ArticleDetail", { slug: a.slug })
                  }
                >
                  <View
                    style={{
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      borderRadius: theme.radius.md,
                      padding: 12,
                      flexDirection: "row",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    {img ? (
                      <Image
                        source={{ uri: img }}
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: theme.radius.md,
                          backgroundColor: "#0a0f0c",
                        }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: theme.radius.md,
                          backgroundColor: "#0a0f0c",
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Ionicons
                          name="newspaper"
                          size={18}
                          color={theme.colors.muted}
                        />
                      </View>
                    )}
                    <View style={{ flex: 1, gap: 6 }}>
                      <Text
                        style={{ color: theme.colors.text, fontWeight: "900" }}
                        numberOfLines={1}
                      >
                        {a.title}
                      </Text>
                      {a.excerpt ? (
                        <Text
                          style={{ color: theme.colors.muted, fontSize: 12 }}
                          numberOfLines={2}
                        >
                          {a.excerpt}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </Pressable>
              );
            })}
            {!articles.length ? (
              <Text style={{ color: theme.colors.muted }}>
                No articles yet.
              </Text>
            ) : null}
          </Card>

          <Card style={{ gap: 10 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: theme.colors.text,
                  fontSize: 16,
                  fontWeight: "900",
                }}
              >
                Recent Orders
              </Text>
              <Pressable onPress={() => navigation.navigate("Orders")}>
                <Text style={{ color: theme.colors.green, fontWeight: "800" }}>
                  View all
                </Text>
              </Pressable>
            </View>

            {(recentOrders.length ? recentOrders : []).map((o: any) => (
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
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    borderRadius: theme.radius.md,
                    padding: 12,
                    gap: 6,
                  }}
                >
                  <Text style={{ color: theme.colors.text, fontWeight: "800" }}>
                    #{o.order_number}
                  </Text>
                  <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                    {o.status ?? "—"} • {o.payment_status ?? "—"} • Rp{" "}
                    {Number(o.total_amount ?? 0).toLocaleString("id-ID")}
                  </Text>
                </View>
              </Pressable>
            ))}
            {!recentOrders.length ? (
              <Text style={{ color: theme.colors.muted }}>No orders yet.</Text>
            ) : null}
          </Card>
        </View>
      </ScrollView>
    </Screen>
  );
}
