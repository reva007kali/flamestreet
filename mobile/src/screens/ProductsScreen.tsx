import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
  Dimensions,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../lib/api";
import AppFlatList from "../ui/AppFlatList";
import Screen from "../ui/Screen";
import { theme } from "../ui/theme";
import { toPublicUrl } from "../lib/assets";
import { usePullToRefresh } from "../lib/usePullToRefresh";
import { useCartStore } from "../store/cartStore";
import { useMemo, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");
const COLUMN_WIDTH = (width - theme.spacing.md * 3) / 2;

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
          backgroundColor: active ? theme.colors.green : "#1a1a1a",
          borderRadius: 14,
          paddingHorizontal: 20,
          paddingVertical: 10,
          borderWidth: 1,
          borderColor: active ? theme.colors.green : "rgba(255,255,255,0.05)",
          shadowColor: active ? theme.colors.green : "#000",
          shadowOpacity: active ? 0.3 : 0,
          shadowRadius: 8,
          elevation: active ? 4 : 0,
        }}
      >
        <Text
          style={{
            color: active ? "#000" : "rgba(255,255,255,0.6)",
            fontWeight: "900",
            fontSize: 13,
          }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

export default function ProductsScreen() {
  const navigation = useNavigation<any>();
  const { refreshing, onRefresh } = usePullToRefresh();
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
      return r.data?.categories ?? [];
    },
  });

  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);
  const hasCartItems = cartCount() > 0;

  return (
    <Screen>
      <AppFlatList
        columnWrapperStyle={{ justifyContent: "space-between", paddingHorizontal: theme.spacing.md }}
        numColumns={2}
        contentContainerStyle={{
          paddingBottom: hasCartItems ? 140 : 40,
        }}
        data={query.data ?? []}
        keyExtractor={(item) => String(item.id)}
        refreshing={refreshing || query.isFetching}
        onRefresh={onRefresh}
        ListHeaderComponent={
          <View style={{ padding: theme.spacing.md, gap: 20 }}>
            <View>
              <Text style={{ color: "#fff", fontSize: 28, fontWeight: "900", letterSpacing: -0.5 }}>
                Fuel Your Body
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, marginTop: 4 }}>
                {category ? `Exploring ${category.name}` : "Selection of healthy meals"}
              </Text>
            </View>
            
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10 }}
            >
              <CategoryChip
                label="All Menu"
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
          <View style={{ flex: 1, alignItems: 'center', marginTop: 100 }}>
             <Ionicons name="fast-food-outline" size={60} color="#333" />
             <Text style={{ color: theme.colors.muted, marginTop: 10 }}>
               {query.isLoading ? "Preparing menu..." : "No products found"}
             </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate("ProductDetail", { slug: item.slug })}
            style={{ marginBottom: 16, width: COLUMN_WIDTH }}
          >
            <View style={{ 
              backgroundColor: "#151515", 
              borderRadius: 24, 
              overflow: "hidden",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.05)"
            }}>
              <View style={{ width: "100%", height: 160, backgroundColor: "#0b0b0b" }}>
                {toPublicUrl(item.image) ? (
                  <Image
                    source={{ uri: toPublicUrl(item.image) as string }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="image-outline" size={32} color="#222" />
                  </View>
                )}
                <LinearGradient 
                  colors={['transparent', 'rgba(0,0,0,0.7)']} 
                  style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60 }}
                />
                {item.modifiers_count ? (
                  <View style={{ position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{item.modifiers_count} VARIANTS</Text>
                  </View>
                ) : null}
              </View>

              <View style={{ padding: 12, gap: 4 }}>
                <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: "800", textTransform: 'uppercase' }}>
                  {item.category?.name ?? "General"}
                </Text>
                <Text style={{ color: "#fff", fontSize: 15, fontWeight: "800" }} numberOfLines={1}>
                  {item.name}
                </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <Text style={{ color: theme.colors.green, fontWeight: "900", fontSize: 14 }}>
                    Rp {Number(item.price ?? 0).toLocaleString("id-ID")}
                  </Text>
                  <View style={{ backgroundColor: theme.colors.green, borderRadius: 8, padding: 4 }}>
                    <Ionicons name="add" size={16} color="#000" />
                  </View>
                </View>
              </View>
            </View>
          </Pressable>
        )}
      />

      {hasCartItems && (
        <View style={{ position: 'absolute', bottom: 20, left: 20, right: 20, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20 }}>
          <BlurView intensity={30} tint="dark" style={{ borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
            <Pressable
              onPress={() => navigation.navigate("Cart")}
              style={{
                padding: 16,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "rgba(20,20,20,0.8)",
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ backgroundColor: theme.colors.green, width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="cart" size={20} color="#000" />
                </View>
                <View>
                  <Text style={{ color: "#fff", fontWeight: "900", fontSize: 15 }}>
                    {cartCount()} Items in Cart
                  </Text>
                  <Text style={{ color: theme.colors.green, fontSize: 12, fontWeight: "700" }}>
                    Rp {Number(cartTotal()).toLocaleString("id-ID")}
                  </Text>
                </View>
              </View>
              
              <View style={{ backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14 }}>
                <Text style={{ color: "#000", fontWeight: "900", fontSize: 13 }}>Checkout</Text>
              </View>
            </Pressable>
          </BlurView>
        </View>
      )}
    </Screen>
  );
}