import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import {
  FlatList,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import { api } from "../lib/api";
import Card from "../ui/Card";
import Screen from "../ui/Screen";
import { theme } from "../ui/theme";
import { toPublicUrl } from "../lib/assets";
import { usePullToRefresh } from "../lib/usePullToRefresh";
import { useCartStore } from "../store/cartStore";
import { useMemo, useState } from "react";

type Product = {
  id: number;
  slug: string;
  name: string;
  price: number;
  image?: string | null;
  description?: string | null;
  modifiers_count?: number | null;
  category?: { id: number; name: string; slug: string } | null;
};

type Category = { id: number; name: string; slug: string };

function CategoryChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <View
        style={{
          borderWidth: 1,
          borderColor: active ? theme.colors.green : theme.colors.border,
          backgroundColor: active ? "#0b1b12" : "transparent",
          borderRadius: 999,
          paddingHorizontal: 12,
          paddingVertical: 8,
        }}
      >
        <Text
          style={{
            color: active ? theme.colors.text : theme.colors.muted,
            fontWeight: "900",
            fontSize: 12,
          }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
};

export default function ProductsScreen() {
  const navigation = useNavigation<any>();
  const { refreshing, onRefresh } = usePullToRefresh();
  const cartItems = useCartStore((s) => s.items);
  const cartTotal = useCartStore((s) => s.total);
  const cartCount = useCartStore((s) => s.totalItems);
  const [category, setCategory] = useState<Category | null>(null);

  const query = useQuery({
    queryKey: ["products", { category: category?.id ?? null }],
    queryFn: async (): Promise<Product[]> => {
      const r = await api.get("/products", {
        params: category?.id ? { category: category.id } : undefined,
      });
      return r.data?.data ?? r.data ?? [];
    },
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: async (): Promise<Category[]> => {
      const r = await api.get("/categories");
      const list = r.data?.categories ?? [];
      return Array.isArray(list) ? list : [];
    },
  });

  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);
  const showCart = (cartItems?.length ?? 0) > 0;

  return (
    <Screen>
      <FlatList
        contentContainerStyle={{
          padding: theme.spacing.md,
          gap: 12,
          paddingBottom: showCart ? 120 : theme.spacing.md,
        }}
        data={query.data ?? []}
        keyExtractor={(item) => String(item.id)}
        refreshing={refreshing || query.isFetching}
        onRefresh={onRefresh}
        ListHeaderComponent={
          <View style={{ gap: 10 }}>
            <View style={{ gap: 4 }}>
              <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: "900" }}>
                Meals
              </Text>
              <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                {category ? `Category: ${category.name}` : "All categories"}
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10 }}
            >
              <CategoryChip
                label="All"
                active={!category}
                onPress={() => setCategory(null)}
              />
              {categories.map((c) => (
                <CategoryChip
                  key={c.id}
                  label={c.name}
                  active={category?.id === c.id}
                  onPress={() => setCategory(c)}
                />
              ))}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          <Text style={{ color: theme.colors.muted }}>
            {query.isLoading ? "Loading…" : "No products"}
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              navigation.navigate("ProductDetail", { slug: item.slug })
            }
          >
            <Card style={{ gap: 10 }}>
              <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                <View
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: theme.radius.md,
                    backgroundColor: "#0a0f0c",
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    overflow: "hidden",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {toPublicUrl(item.image) ? (
                    <Image
                      source={{ uri: toPublicUrl(item.image) as string }}
                      style={{ width: 78, height: 78 }}
                      resizeMode="contain"
                    />
                  ) : null}
                </View>
                <View style={{ flex: 1, gap: 6 }}>
                  <Text
                    style={{ color: theme.colors.text, fontSize: 16, fontWeight: "900" }}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  <Text style={{ color: theme.colors.muted, fontSize: 12 }} numberOfLines={1}>
                    {item.category?.name ?? "—"}
                    {item.modifiers_count ? ` • ${Number(item.modifiers_count)} variants` : ""}
                  </Text>
                  {item.description ? (
                    <Text style={{ color: theme.colors.muted, fontSize: 12 }} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}
                  <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                    Rp {Number(item.price ?? 0).toLocaleString("id-ID")}
                  </Text>
                </View>
              </View>
            </Card>
          </Pressable>
        )}
      />

      {showCart ? (
        <View
          style={{
            position: "absolute",
            left: 12,
            right: 12,
            bottom: 12,
            borderRadius: 16,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}
          pointerEvents="box-none"
        >
          <BlurView intensity={18} tint="dark">
            <Pressable
              onPress={() => navigation.navigate("Cart")}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 12,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "rgba(5,8,7,0.65)",
              }}
            >
              <View style={{ gap: 2 }}>
                <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                  Cart • {cartCount()} items
                </Text>
                <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                  Total: Rp {Number(cartTotal()).toLocaleString("id-ID")}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: theme.colors.green,
                  borderRadius: 999,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                }}
              >
                <Text style={{ color: "#041009", fontWeight: "900" }}>
                  View cart
                </Text>
              </View>
            </Pressable>
          </BlurView>
        </View>
      ) : null}
    </Screen>
  );
}
