import { useNavigation } from "@react-navigation/native";
import { Image, Text, View, Pressable } from "react-native";
import { useCartStore } from "../store/cartStore";
import AppFlatList from "../ui/AppFlatList";
import Button from "../ui/Button";
import Card from "../ui/Card";
import Screen from "../ui/Screen";
import { theme } from "../ui/theme";
import { usePullToRefresh } from "../lib/usePullToRefresh";
import { toPublicUrl } from "../lib/assets";
import { Ionicons } from "@expo/vector-icons";

export default function CartScreen() {
  const navigation = useNavigation<any>();
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const total = useCartStore((s) => s.total);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const { refreshing, onRefresh } = usePullToRefresh();

  return (
    <Screen>
      <AppFlatList
        contentContainerStyle={{ padding: theme.spacing.md, gap: 16, paddingBottom: 100 }}
        data={items}
        keyExtractor={(i) => i.key}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListHeaderComponent={
          items.length > 0 ? (
            <Text style={{ color: theme.colors.text, fontSize: 24, fontWeight: "900", marginBottom: 8 }}>
              My Cart
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", marginTop: 80, gap: 20 }}>
            <View
              style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                backgroundColor: "#111",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <Ionicons name="cart-outline" size={48} color={theme.colors.muted} />
            </View>
            <View style={{ gap: 8, alignItems: "center", paddingHorizontal: 40 }}>
              <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 20 }}>
                Your cart is empty
              </Text>
              <Text style={{ color: theme.colors.muted, fontSize: 14, textAlign: "center", lineHeight: 20 }}>
                Looks like you haven't added any meals to your cart yet.
              </Text>
            </View>
            <Button
              onPress={() => navigation.navigate("Products")}
              style={{ paddingHorizontal: 30, borderRadius: 16, marginTop: 10 }}
            >
              <Text style={{ color: "#041009", fontWeight: "900" }}>Start Ordering</Text>
            </Button>
          </View>
        }
        renderItem={({ item }) => {
          const itemPrice = (
            Number(item.base_price ?? 0) +
            (item.modifier_options ?? []).reduce(
              (s, o) => s + Number(o.additional_price ?? 0),
              0
            )
          );

          return (
            <Card style={{ padding: 12, borderRadius: 24, backgroundColor: "#151515", borderWidth: 1, borderColor: "rgba(255,255,255,0.03)" }}>
              <View style={{ flexDirection: "row", gap: 16 }}>
                {/* Product Image */}
                <View style={{ width: 80, height: 80, borderRadius: 16, backgroundColor: "#0b0b0b", overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" }}>
                  {toPublicUrl(item.image) ? (
                    <Image
                      source={{ uri: toPublicUrl(item.image) as string }}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="fast-food" size={24} color="#222" />
                    </View>
                  )}
                </View>

                {/* Product Details */}
                <View style={{ flex: 1, justifyContent: "space-between", paddingVertical: 2 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: "900" }} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {item.modifier_options?.map((m, idx) => (
                        <Text key={idx} style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 1 }}>
                          {m.option_name}
                        </Text>
                      ))}
                    </View>
                    <Pressable 
                      onPress={() => removeItem(item.key)}
                      style={{ padding: 4 }}
                    >
                      <Ionicons name="trash-outline" size={18} color="#fb7185" />
                    </Pressable>
                  </View>

                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                    <Text style={{ color: theme.colors.green, fontWeight: "900", fontSize: 15 }}>
                      Rp {itemPrice.toLocaleString("id-ID")}
                    </Text>

                    {/* Quantity Selector Bar */}
                    <View style={{ 
                      flexDirection: "row", 
                      alignItems: "center", 
                      backgroundColor: "#222", 
                      borderRadius: 12, 
                      padding: 4,
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.05)"
                    }}>
                      <Pressable 
                        onPress={() => setQuantity(item.key, Math.max(1, item.quantity - 1))}
                        style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2a2a2a', borderRadius: 8 }}
                      >
                        <Ionicons name="remove" size={16} color="#fff" />
                      </Pressable>
                      
                      <Text style={{ color: "#fff", fontWeight: "900", paddingHorizontal: 12, fontSize: 14 }}>
                        {item.quantity}
                      </Text>
                      
                      <Pressable 
                        onPress={() => setQuantity(item.key, item.quantity + 1)}
                        style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.green, borderRadius: 8 }}
                      >
                        <Ionicons name="add" size={16} color="#000" />
                      </Pressable>
                    </View>
                  </View>
                </View>
              </View>
            </Card>
          );
        }}
      />

      {/* Footer Summary */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: 20,
          paddingBottom: 30,
          backgroundColor: "#111",
          borderTopWidth: 1,
          borderTopColor: "rgba(255,255,255,0.05)",
          flexDirection: "row",
          alignItems: "center",
          gap: 20,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: "700", textTransform: 'uppercase' }}>
            Total Price
          </Text>
          <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: "900" }}>
            Rp {Number(total()).toLocaleString("id-ID")}
          </Text>
        </View>
        
        <View style={{ flex: 1.2 }}>
          <Button
            onPress={() => navigation.navigate("Checkout")}
            disabled={items.length === 0}
            style={{ borderRadius: 16, height: 54 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ color: "#000", fontWeight: "900", fontSize: 16 }}>Checkout</Text>
              <Ionicons name="arrow-forward" size={18} color="#000" />
            </View>
          </Button>
        </View>
      </View>
    </Screen>
  );
}