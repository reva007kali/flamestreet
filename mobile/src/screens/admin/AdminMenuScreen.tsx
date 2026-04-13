import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import AppFlatList from "../../ui/AppFlatList";
import Screen from "../../ui/Screen";
import Card from "../../ui/Card";
import { theme } from "../../ui/theme";

type Row = {
  key: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  to: string;
};

export default function AdminMenuScreen() {
  const navigation = useNavigation<any>();
  const go = (name: string) => {
    const parent = navigation.getParent?.();
    if (parent?.navigate) parent.navigate(name);
    else navigation.navigate(name);
  };

  const rows: Row[] = [
    {
      key: "orders",
      title: "Orders",
      subtitle: "Manage status, payment, courier",
      icon: "receipt",
      to: "AdminOrders",
    },
    {
      key: "redeems",
      title: "Redeems",
      subtitle: "Approve / reject withdraw requests",
      icon: "cash",
      to: "AdminRedeems",
    },
    {
      key: "products",
      title: "Products",
      subtitle: "Catalog list",
      icon: "fast-food",
      to: "AdminProducts",
    },
    {
      key: "categories",
      title: "Categories",
      subtitle: "Product categories list",
      icon: "albums",
      to: "AdminProductCategories",
    },
    {
      key: "gyms",
      title: "Gyms",
      subtitle: "Gym coverage list",
      icon: "business",
      to: "AdminGyms",
    },
    {
      key: "promo",
      title: "Promo banners",
      subtitle: "Active banners for app",
      icon: "images",
      to: "AdminPromoBanners",
    },
    {
      key: "articles",
      title: "Articles",
      subtitle: "Pinned & latest",
      icon: "newspaper",
      to: "AdminArticles",
    },
    {
      key: "users",
      title: "Users",
      subtitle: "Admin/trainer/member/courier",
      icon: "people",
      to: "AdminUsers",
    },
    {
      key: "trainers",
      title: "Trainers",
      subtitle: "Verify trainers",
      icon: "shield-checkmark",
      to: "AdminTrainers",
    },
    {
      key: "payments",
      title: "Payment methods",
      subtitle: "List payment methods",
      icon: "card",
      to: "AdminPaymentMethods",
    },
    {
      key: "points",
      title: "Point settings",
      subtitle: "Rates & tiers",
      icon: "flame",
      to: "AdminPointSettings",
    },
  ];

  return (
    <Screen>
      <AppFlatList
        contentContainerStyle={{ padding: theme.spacing.md, gap: 12 }}
        data={rows}
        keyExtractor={(i) => i.key}
        renderItem={({ item }) => (
          <Pressable onPress={() => go(item.to)}>
            <Card style={{ gap: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#0a0f0c",
                  }}
                >
                  <Ionicons name={item.icon} size={18} color={theme.colors.green} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: "900" }}>
                    {item.title}
                  </Text>
                  <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                    {item.subtitle}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
              </View>
            </Card>
          </Pressable>
        )}
      />
    </Screen>
  );
}
