import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import * as SecureStore from "expo-secure-store";
import Screen from "../ui/Screen";
import { theme } from "../ui/theme";
import { api } from "../lib/api";
import { toPublicUrl } from "../lib/assets";
import { useAuthStore } from "../store/authStore";
import { Ionicons } from "@expo/vector-icons";
import ChatFab from "../components/ChatFab";
import { useNavigation } from "@react-navigation/native";

const LAST_ADDRESS_KEY = "flamestreet_last_delivery_address";

type Banner = { id: string; title: string; subtitle: string; image?: any };
type Product = {
  id: number;
  slug: string;
  name: string;
  price: number;
  image?: string | null;
  is_featured?: boolean;
};
type Order = {
  id: number;
  order_number: string;
  status: string;
  total_amount: number;
  items?: { product_name: string }[];
};

function fmtMoney(v: any) {
  return `Rp ${Number(v ?? 0).toLocaleString("id-ID")}`;
}

export default function HomeScreen() {
  const nav = useNavigation<any>();
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);
  const roles = user?.roles ?? [];
  const isTrainer = roles.includes("trainer");

  const [defaultAddress, setDefaultAddress] = useState<string>("");
  const [refreshing, setRefreshing] = useState(false);

  const width = Dimensions.get("window").width;
  const bannerW = width - 24;
  const bannerH = Math.round((bannerW * 9) / 16);

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get("/me")).data.user,
    staleTime: 20_000,
  });

  useEffect(() => {
    if (meQuery.data) setUser(meQuery.data);
  }, [meQuery.data, setUser]);

  const pointsQuery = useQuery({
    queryKey: [isTrainer ? "trainerPoints" : "memberPoints"],
    queryFn: async () => {
      const r = await api.get(isTrainer ? "/trainer/points" : "/member/points");
      return r.data;
    },
    staleTime: 20_000,
  });

  const promoQuery = useQuery({
    queryKey: ["promo-banners", { audience: isTrainer ? "trainer" : "member" }],
    queryFn: async () =>
      (
        await api.get("/promo-banners", {
          params: { audience: isTrainer ? "trainer" : "member" },
        })
      ).data.banners,
    staleTime: 30_000,
  });

  const productsQuery = useQuery({
    queryKey: ["products", { featured: true }],
    queryFn: async (): Promise<Product[]> =>
      (await api.get("/products", { params: { featured: 1 } })).data?.data ?? [],
    staleTime: 30_000,
  });

  const ordersQuery = useQuery({
    queryKey: ["orders", { limit: 3 }],
    queryFn: async (): Promise<Order[]> =>
      (await api.get("/orders")).data?.data ?? [],
    staleTime: 20_000,
  });

  const nutritionQuery = useQuery({
    queryKey: ["member", "nutrition", "weekly"],
    queryFn: async () => (await api.get("/member/nutrition/weekly")).data,
    staleTime: 20_000,
    enabled: !isTrainer,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        meQuery.refetch(),
        pointsQuery.refetch(),
        promoQuery.refetch(),
        productsQuery.refetch(),
        ordersQuery.refetch(),
        nutritionQuery.refetch(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [
    meQuery,
    pointsQuery,
    promoQuery,
    productsQuery,
    ordersQuery,
    nutritionQuery,
  ]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const addr = await SecureStore.getItemAsync(LAST_ADDRESS_KEY);
        if (!cancelled && addr) setDefaultAddress(addr);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const banners: Banner[] = useMemo(() => {
    const raw = promoQuery.data ?? [];
    const mapped = raw
      .filter((b: any) => b && (b.title || b.subtitle || b.image))
      .map((b: any) => ({
        id: String(b.id ?? b.title ?? Math.random()),
        title: String(b.title ?? "Promo"),
        subtitle: String(b.subtitle ?? ""),
        image:
          typeof b.image === "string" ? { uri: toPublicUrl(b.image) } : undefined,
      }));
    if (mapped.length) return mapped;
    return [
      { id: "b1", title: "Flamestreet", subtitle: "Protein · Fresh daily" },
      { id: "b2", title: "Delivery", subtitle: "Fast & safe" },
      { id: "b3", title: "Points", subtitle: "Collect rewards" },
    ];
  }, [promoQuery.data]);

  const featured = useMemo(() => {
    const list = productsQuery.data ?? [];
    return list.slice(0, 10);
  }, [productsQuery.data]);

  const recentOrders = useMemo(
    () => (ordersQuery.data ?? []).slice(0, 3),
    [ordersQuery.data],
  );

  const [bannerIndex, setBannerIndex] = useState(0);
  const bannerRef = useRef<ScrollView | null>(null);

  const scrollToBanner = (idx: number) => {
    bannerRef.current?.scrollTo({ x: idx * bannerW, animated: true });
    setBannerIndex(idx);
  };

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.green}
          />
        }
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View style={{ paddingHorizontal: 12, paddingTop: 14 }}>
          <View style={{ height: bannerH }}>
            <ScrollView
              ref={(r) => {
                bannerRef.current = r;
              }}
              horizontal
              pagingEnabled
              snapToInterval={bannerW}
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / bannerW);
                setBannerIndex(idx);
              }}
            >
              {banners.map((b) => (
                <View
                  key={b.id}
                  style={{
                    width: bannerW,
                    height: bannerH,
                    borderRadius: 24,
                    overflow: "hidden",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.06)",
                    backgroundColor: "#0b0d0c",
                    marginRight: 0,
                  }}
                >
                  {b.image ? (
                    <Image
                      source={b.image}
                      style={{ width: "100%", height: "100%" }}
                    />
                  ) : (
                    <LinearGradient
                      colors={["#0c2316", "#050807", "#000"]}
                      style={{ width: "100%", height: "100%" }}
                    />
                  )}
                </View>
              ))}
            </ScrollView>

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
              {banners.map((_, idx) => (
                <Pressable key={idx} onPress={() => scrollToBanner(idx)}>
                  <View
                    style={{
                      height: 4,
                      width: idx === bannerIndex ? 22 : 6,
                      borderRadius: 99,
                      backgroundColor:
                        idx === bannerIndex
                          ? theme.colors.green
                          : "rgba(255,255,255,0.2)",
                    }}
                  />
                </Pressable>
              ))}
            </View>
          </View>

          <View style={{ height: 12 }} />

          <View
            style={{
              borderRadius: 24,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.06)",
            }}
          >
            <LinearGradient
              colors={["#065f46", "#022c22", "#000"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 16 }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      overflow: "hidden",
                      borderWidth: 2,
                      borderColor: theme.colors.green,
                      backgroundColor: "#1f2937",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: theme.colors.green,
                        fontWeight: "900",
                        fontSize: 18,
                      }}
                    >
                      {(user?.full_name?.charAt(0) ?? "U").toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: "#fff", fontSize: 12 }}>
                      Hi {isTrainer ? "Coach!" : "Flamer!"}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={{
                        color: "#fff",
                        fontWeight: "900",
                        fontSize: 16,
                        textTransform: "uppercase",
                      }}
                    >
                      {(
                        user?.full_name?.split(" ")?.[0] ??
                        (isTrainer ? "Trainer" : "Member")
                      ).toString()}
                    </Text>
                  </View>
                </View>

                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <View style={{ alignItems: "flex-end" }}>
                    <Text
                      style={{
                        color: "rgba(255,255,255,0.6)",
                        fontSize: 10,
                        letterSpacing: 2,
                      }}
                    >
                      Flame Points
                    </Text>
                    <Text
                      style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}
                    >
                      {Number(pointsQuery.data?.balance ?? 0).toLocaleString(
                        "id-ID",
                      )}
                    </Text>
                  </View>
                  <Ionicons name="flame" size={18} color={theme.colors.green} />
                </View>
              </View>
            </LinearGradient>
          </View>

          {defaultAddress ? (
            <View
              style={{
                marginTop: 10,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 6,
              }}
            >
              <Ionicons name="location" size={12} color={theme.colors.green} />
              <Text
                numberOfLines={1}
                style={{
                  color: "rgba(255,255,255,0.55)",
                  fontSize: 11,
                  fontWeight: "800",
                }}
              >
                {defaultAddress}
              </Text>
            </View>
          ) : null}

          <View style={{ height: 14 }} />

          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable
              onPress={() => nav.navigate("Products")}
              style={{
                flex: 1,
                borderRadius: 24,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.08)",
                backgroundColor: "#141416",
              }}
            >
              <View style={{ height: 120, backgroundColor: "#0b0d0c" }}>
                <LinearGradient
                  colors={["transparent", "rgba(0,0,0,0.85)"]}
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: 80,
                  }}
                />
              </View>
              <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
                <Text
                  style={{ color: "#fff", fontWeight: "900", fontSize: 14 }}
                >
                  Order Flame Meal
                </Text>
                <Text
                  style={{
                    color: "rgba(255,255,255,0.3)",
                    fontSize: 11,
                    fontWeight: "700",
                    marginTop: 3,
                  }}
                >
                  High protein · Fresh daily
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => nav.navigate(isTrainer ? "PointsHistory" : "Nutrition")}
              style={{
                flex: 1,
                borderRadius: 24,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.06)",
                backgroundColor: "#141416",
                padding: 14,
              }}
            >
              <View
                style={{
                  position: "absolute",
                  right: -60,
                  top: -60,
                  width: 160,
                  height: 160,
                  borderRadius: 80,
                  backgroundColor: "rgba(9,221,97,0.12)",
                }}
              />
              <View
                style={{
                  position: "absolute",
                  left: -20,
                  bottom: -40,
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  backgroundColor: "rgba(9,221,97,0.06)",
                }}
              />

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={{
                      color: "rgba(255,255,255,0.3)",
                      fontSize: 10,
                      fontWeight: "900",
                      letterSpacing: 2,
                    }}
                  >
                    This Month
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{
                      color: "#fff",
                      fontWeight: "900",
                      fontSize: 15,
                      marginTop: 3,
                    }}
                  >
                    {isTrainer ? "Coach Stats" : "Nutrition"}
                  </Text>
                  <Text
                    style={{
                      color: "rgba(255,255,255,0.35)",
                      fontSize: 11,
                      fontWeight: "700",
                      marginTop: 3,
                    }}
                  >
                    {isTrainer
                      ? "Track earnings"
                      : nutritionQuery.isLoading
                        ? "Loading…"
                        : nutritionQuery.isError
                          ? "Not available"
                          : `${Number(nutritionQuery.data?.totals?.kcal ?? 0).toLocaleString("id-ID")} kcal this week`}
                  </Text>
                  {!isTrainer &&
                  !nutritionQuery.isLoading &&
                  !nutritionQuery.isError ? (
                    <View style={{ gap: 2, marginTop: 6 }}>
                      <Text
                        style={{
                          color: "rgba(255,255,255,0.28)",
                          fontSize: 10,
                          fontWeight: "800",
                        }}
                      >
                        Protein:{" "}
                        {Number(
                          nutritionQuery.data?.totals?.protein_g ?? 0,
                        ).toLocaleString("id-ID")}
                        g
                      </Text>
                      <Text
                        style={{
                          color: "rgba(255,255,255,0.28)",
                          fontSize: 10,
                          fontWeight: "800",
                        }}
                      >
                        Energy:{" "}
                        {Number(
                          nutritionQuery.data?.totals?.kcal ?? 0,
                        ).toLocaleString("id-ID")}
                        kcal
                      </Text>
                      <Text
                        style={{
                          color: "rgba(255,255,255,0.28)",
                          fontSize: 10,
                          fontWeight: "800",
                        }}
                      >
                        Carbs:{" "}
                        {Number(
                          nutritionQuery.data?.totals?.carbs_g ?? 0,
                        ).toLocaleString("id-ID")}
                        g
                      </Text>
                      <Text
                        style={{
                          color: "rgba(255,255,255,0.28)",
                          fontSize: 10,
                          fontWeight: "800",
                        }}
                      >
                        Fat:{" "}
                        {Number(
                          nutritionQuery.data?.totals?.fat_g ?? 0,
                        ).toLocaleString("id-ID")}
                        g
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Ionicons
                  name={isTrainer ? "stats-chart" : "fitness"}
                  size={18}
                  color={theme.colors.green}
                />
              </View>
            </Pressable>
          </View>

          <View style={{ height: 12 }} />
          <Pressable
            onPress={() => nav.navigate("FpShop")}
            style={{
              borderRadius: 24,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.08)",
              backgroundColor: "#141416",
              padding: 14,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                position: "absolute",
                right: -60,
                top: -60,
                width: 160,
                height: 160,
                borderRadius: 80,
                backgroundColor: "rgba(9,221,97,0.12)",
              }}
            />
            <View
              style={{
                position: "absolute",
                left: -20,
                bottom: -40,
                width: 120,
                height: 120,
                borderRadius: 60,
                backgroundColor: "rgba(9,221,97,0.06)",
              }}
            />
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={{
                    color: "rgba(255,255,255,0.3)",
                    fontSize: 10,
                    fontWeight: "900",
                    letterSpacing: 2,
                  }}
                >
                  Flame Points
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    color: "#fff",
                    fontWeight: "900",
                    fontSize: 15,
                    marginTop: 3,
                  }}
                >
                  FP Shop
                </Text>
                <Text
                  style={{
                    color: "rgba(255,255,255,0.35)",
                    fontSize: 11,
                    fontWeight: "700",
                    marginTop: 3,
                  }}
                >
                  Beli kupon diskon
                </Text>
              </View>
              <Ionicons name="ticket" size={18} color={theme.colors.green} />
            </View>
          </Pressable>

          <View style={{ height: 22 }} />

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: "rgba(255,255,255,0.45)",
                fontSize: 11,
                fontWeight: "900",
                letterSpacing: 2,
              }}
            >
              Top Flame Meals
            </Text>
            <Pressable onPress={() => nav.navigate("Products")}>
              <Text
                style={{
                  color: theme.colors.green,
                  fontSize: 10,
                  fontWeight: "900",
                  letterSpacing: 1,
                }}
              >
                See All
              </Text>
            </Pressable>
          </View>

          <View style={{ height: 10 }} />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingBottom: 8 }}
          >
            {featured.map((p) => {
              const url = p.image ? toPublicUrl(p.image) : null;
              const img = url ? ({ uri: url } as const) : null;
              return (
                <Pressable
                  key={p.id}
                  onPress={() =>
                    nav.navigate("ProductDetail", { slug: p.slug })
                  }
                >
                  <View style={{ width: 150 }}>
                    <View
                      style={{
                        width: 150,
                        height: 190,
                        borderRadius: 24,
                        overflow: "hidden",
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.06)",
                        backgroundColor: "#111",
                      }}
                    >
                      {img ? (
                        <Image
                          source={img}
                          style={{ width: "100%", height: "100%" }}
                        />
                      ) : null}
                    </View>
                    <Text
                      numberOfLines={1}
                      style={{
                        marginTop: 8,
                        color: "#fff",
                        fontWeight: "900",
                        fontSize: 12,
                        textTransform: "uppercase",
                      }}
                    >
                      {p.name}
                    </Text>
                    <Text
                      style={{
                        color: theme.colors.green,
                        fontSize: 11,
                        fontWeight: "900",
                        marginTop: 2,
                      }}
                    >
                      {fmtMoney(p.price)}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={{ height: 22 }} />

          <Text
            style={{
              color: "rgba(255,255,255,0.3)",
              fontSize: 10,
              fontWeight: "900",
              letterSpacing: 2,
            }}
          >
            Recent Orders
          </Text>
          <View style={{ height: 10 }} />
          <View style={{ gap: 10 }}>
            {recentOrders.map((o) => {
              const st = String(o.status ?? "").toLowerCase();
              const isDone = st === "completed" || st === "delivered";
              const title =
                (o.items ?? [])
                  .slice(0, 1)
                  .map((it) => it.product_name)
                  .join("") || "Order";
              return (
                <Pressable
                  key={o.id}
                  onPress={() =>
                    nav.navigate("OrderDetail", {
                      orderNumber: o.order_number,
                      orderId: o.id,
                    })
                  }
                >
                  <View
                    style={{
                      borderRadius: 20,
                      borderWidth: 1,
                      borderColor: isDone
                        ? "rgba(16,185,129,0.15)"
                        : "rgba(255,255,255,0.07)",
                      backgroundColor: isDone
                        ? "rgba(6,78,59,0.28)"
                        : "rgba(28,28,32,0.95)",
                      padding: 14,
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                      <Text
                        numberOfLines={1}
                        style={{
                          color: "#fff",
                          fontWeight: "900",
                          fontSize: 13,
                          textTransform: "uppercase",
                        }}
                      >
                        {title}
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <View
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: isDone
                              ? theme.colors.green
                              : "#f97316",
                          }}
                        />
                        <Text
                          style={{
                            color: isDone ? theme.colors.green : "#f97316",
                            fontSize: 10,
                            fontWeight: "900",
                            letterSpacing: 1,
                          }}
                        >
                          {o.status}
                        </Text>
                        <Text
                          style={{
                            color: "rgba(255,255,255,0.2)",
                            fontSize: 10,
                          }}
                        >
                          ·
                        </Text>
                        <Text
                          style={{
                            color: "rgba(255,255,255,0.35)",
                            fontSize: 10,
                            fontWeight: "900",
                          }}
                        >
                          #{o.order_number}
                        </Text>
                      </View>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 6 }}>
                      <Text
                        style={{ color: "#fff", fontWeight: "900", fontSize: 13 }}
                      >
                        {fmtMoney(o.total_amount)}
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={14}
                        color="rgba(255,255,255,0.25)"
                      />
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <ChatFab />
    </Screen>
  );
}
