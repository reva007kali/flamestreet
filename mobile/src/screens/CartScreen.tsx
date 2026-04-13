import { useNavigation } from "@react-navigation/native";
import { Image, Text, View } from "react-native";
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
        contentContainerStyle={{ padding: theme.spacing.md, gap: 12 }}
        data={items}
        keyExtractor={(i) => i.key}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <Card style={{ gap: 12, padding: 16, alignItems: "center" }}>
            <View
              style={{
                width: 54,
                height: 54,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: theme.colors.border,
                backgroundColor: "#0a0f0c",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="cart-outline" size={22} color={theme.colors.muted} />
            </View>
            <View style={{ gap: 4, alignItems: "center" }}>
              <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }}>
                Keranjang masih kosong
              </Text>
              <Text style={{ color: theme.colors.muted, fontSize: 12, textAlign: "center" }}>
                Yuk pilih menu dulu, lalu checkout dengan cepat.
              </Text>
            </View>
            <Button
              onPress={() => navigation.navigate("Products")}
              style={{ width: "100%" }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="fast-food" size={18} color="#041009" />
                <Text style={{ color: "#041009", fontWeight: "900" }}>
                  Pesan Sekarang
                </Text>
              </View>
            </Button>
          </Card>
        }
        renderItem={({ item }) => (
          <Card style={{ gap: 8 }}>
            <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
              {toPublicUrl(item.image) ? (
                <Image
                  source={{ uri: toPublicUrl(item.image) as string }}
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 12,
                    backgroundColor: "#0a0f0c",
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                  }}
                  resizeMode="contain"
                />
              ) : (
                <View
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 12,
                    backgroundColor: "#0a0f0c",
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="image" size={18} color={theme.colors.muted} />
                </View>
              )}
              <View style={{ flex: 1, gap: 4 }}>
                <Text
                  style={{
                    color: theme.colors.text,
                    fontSize: 16,
                    fontWeight: "900",
                  }}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                {(item.modifier_options ?? []).length ? (
                  <View style={{ gap: 4 }}>
                    {(item.modifier_options ?? []).map((m, idx) => (
                      <Text
                        key={`${item.key}:${idx}`}
                        style={{ color: theme.colors.muted, fontSize: 12 }}
                        numberOfLines={1}
                      >
                        {m.modifier_name}: {m.option_name}
                      </Text>
                    ))}
                  </View>
                ) : null}
                <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                  {item.quantity} × Rp{" "}
                  {(
                    Number(item.base_price ?? 0) +
                    (item.modifier_options ?? []).reduce(
                      (s, o) => s + Number(o.additional_price ?? 0),
                      0,
                    )
                  ).toLocaleString("id-ID")}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button
                variant="secondary"
                onPress={() =>
                  setQuantity(item.key, Math.max(1, item.quantity - 1))
                }
                style={{ paddingVertical: 10, flex: 1 }}
              >
                -
              </Button>
              <Button
                variant="secondary"
                onPress={() => setQuantity(item.key, item.quantity + 1)}
                style={{ paddingVertical: 10, flex: 1 }}
              >
                +
              </Button>
              <Button
                variant="secondary"
                onPress={() => removeItem(item.key)}
                style={{ paddingVertical: 10, paddingHorizontal: 12 }}
              >
                Remove
              </Button>
            </View>
          </Card>
        )}
      />

      <View
        style={{
          padding: theme.spacing.md,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          gap: 10,
        }}
      >
        <Text
          style={{ color: theme.colors.text, fontSize: 16, fontWeight: "800" }}
        >
          Total: Rp {Number(total()).toLocaleString("id-ID")}
        </Text>
        <Button
          onPress={() => navigation.navigate("Checkout")}
          disabled={items.length === 0}
        >
          Checkout
        </Button>
      </View>
    </Screen>
  );
}
