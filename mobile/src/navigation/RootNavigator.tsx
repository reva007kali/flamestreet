import { DarkTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useEffect, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { useAuthStore } from "../store/authStore";
import {
  RootStackParamList,
  AuthStackParamList,
  AppTabParamList,
} from "./types";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import HomeScreen from "../screens/HomeScreen";
import ProductsScreen from "../screens/ProductsScreen";
import ProductDetailScreen from "../screens/ProductDetailScreen";
import CartScreen from "../screens/CartScreen";
import CheckoutScreen from "../screens/CheckoutScreen";
import OrdersScreen from "../screens/OrdersScreen";
import OrderDetailScreen from "../screens/OrderDetailScreen";
import ArticleDetailScreen from "../screens/ArticleDetailScreen";
import FlamehubFeedScreen from "../screens/flamehub/FlamehubFeedScreen";
import FlamehubCreatePostScreen from "../screens/flamehub/FlamehubCreatePostScreen";
import FlamehubPostScreen from "../screens/flamehub/FlamehubPostScreen";
import FlamehubEditPostScreen from "../screens/flamehub/FlamehubEditPostScreen";
import FlamehubProfileScreen from "../screens/flamehub/FlamehubProfileScreen";
import FlamehubSearchScreen from "../screens/flamehub/FlamehubSearchScreen";
import FlamehubFollowersScreen from "../screens/flamehub/FlamehubFollowersScreen";
import FlamehubTabs from "./FlamehubTabs";
import ProfileScreen from "../screens/ProfileScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import PointsHistoryScreen from "../screens/PointsHistoryScreen";
import TrainerMembersScreen from "../screens/TrainerMembersScreen";
import TrainerWithdrawScreen from "../screens/TrainerWithdrawScreen";
import OnboardingScreen from "../screens/OnboardingScreen";
import CashierDashboardScreen from "../screens/CashierDashboardScreen";
import CashierQueueScreen from "../screens/CashierQueueScreen";
import CashierOrderDetailScreen from "../screens/CashierOrderDetailScreen";
import AdminDashboardScreen from "../screens/admin/AdminDashboardScreen";
import AdminMenuScreen from "../screens/admin/AdminMenuScreen";
import AdminOrdersScreen from "../screens/admin/AdminOrdersScreen";
import AdminOrderDetailScreen from "../screens/admin/AdminOrderDetailScreen";
import AdminRedeemsScreen from "../screens/admin/AdminRedeemsScreen";
import AdminUsersScreen from "../screens/admin/AdminUsersScreen";
import AdminTrainersScreen from "../screens/admin/AdminTrainersScreen";
import AdminProductsScreen from "../screens/admin/AdminProductsScreen";
import AdminProductCategoriesScreen from "../screens/admin/AdminProductCategoriesScreen";
import AdminGymsScreen from "../screens/admin/AdminGymsScreen";
import AdminPromoBannersScreen from "../screens/admin/AdminPromoBannersScreen";
import AdminArticlesScreen from "../screens/admin/AdminArticlesScreen";
import AdminPaymentMethodsScreen from "../screens/admin/AdminPaymentMethodsScreen";
import AdminPointSettingsScreen from "../screens/admin/AdminPointSettingsScreen";
import { api } from "../lib/api";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../ui/theme";
import { toPublicUrl } from "../lib/assets";
import { useNavigation } from "@react-navigation/native";
import { useCartStore } from "../store/cartStore";
import * as SecureStore from "expo-secure-store";
import { navigationRef } from "./navRef";

export { FloatingHeader } from "../components/FloatingHeader";

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<AppTabParamList>();

const EMPTY_ROLES: readonly string[] = [];

function HeaderActions() {
  const user = useAuthStore((s) => s.user);
  const nav = useNavigation<any>();
  const avatarUrl = toPublicUrl(user?.avatar);

  const go = (routeName: "Notifications" | "Profile") => {
    const parent = nav.getParent?.();
    if (parent?.navigate) parent.navigate(routeName);
    else nav.navigate(routeName);
  };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingRight: 12,
      }}
    >
      <Pressable onPress={() => go("Notifications")}>
        <Ionicons name="notifications" size={22} color={theme.colors.text} />
      </Pressable>
      <Pressable onPress={() => go("Profile")}>
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          />
        ) : (
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              borderWidth: 1,
              borderColor: theme.colors.border,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="person" size={18} color={theme.colors.text} />
          </View>
        )}
      </Pressable>
    </View>
  );
}

// ─── Animasi untuk stack screen (slide + fade) ───────────────────────────────
const stackScreenAnimation = {
  animation: "slide_from_right" as const, // slide dari kanan saat push
  animationDuration: 200,
  gestureEnabled: true, // swipe back gesture aktif
  gestureDirection: "horizontal" as const,
  customAnimationOnGesture: true,
  fullScreenGestureEnabled: true, // swipe dari mana aja di layar
};

// ─── Animasi untuk Auth screen (fade) ────────────────────────────────────────
const authScreenAnimation = {
  animation: "slide_from_right" as const,
  animationDuration: 200,
};

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        ...authScreenAnimation,
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.bg },
      }}
    >
      <AuthStack.Screen
        name="Login"
        component={LoginScreen}
        options={{ title: "Login" }}
      />
      <AuthStack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ title: "Register" }}
      />
    </AuthStack.Navigator>
  );
}

function AppTabs() {
  const roles = useAuthStore((s) => s.user?.roles ?? EMPTY_ROLES);
  const isAdmin = roles.includes("admin");
  const isCashier = roles.includes("cashier");
  const isCourier = roles.includes("courier");
  const isBackoffice = isAdmin || isCashier || isCourier;
  const initialRouteName = isAdmin
    ? "Dashboard"
    : isCashier
      ? "Dashboard"
      : isBackoffice
        ? "Orders"
        : "Home";
  const showHome = !isBackoffice;
  const showFlamehub = !isBackoffice;
  const showCart = !isBackoffice;
  const showProducts = !isCashier && !isCourier;
  const showStaffDashboard = isCashier;
  const showQueue = isCashier;
  const showOrders = !isCashier;
  const cartCount = useCartStore((s) => s.totalItems());

  return (
    <Tab.Navigator
      id="AppTabs"
      initialRouteName={initialRouteName}
      detachInactiveScreens={false}
      screenOptions={({ route }) => ({
        headerShown: false,
        sceneStyle: { backgroundColor: theme.colors.bg },
        tabBarStyle: {
          backgroundColor: theme.colors.bg,
          borderTopColor: theme.colors.border,
        },
        tabBarActiveTintColor: theme.colors.green,
        tabBarInactiveTintColor: theme.colors.muted,
        // Animasi fade saat ganti tab
        lazy: true,
        tabBarIcon: ({ color, size }) => {
          const map: Record<string, keyof typeof Ionicons.glyphMap> = {
            Dashboard: "speedometer",
            Admin: "grid",
            Home: "home",
            Flamehub: "flame",
            Products: "fast-food",
            Cart: "cart",
            Queue: "list",
            Orders: "receipt",
          };
          const name = map[route.name] ?? "ellipse";
          const iconSize = size ?? 22;
          const showBadge = route.name === "Cart" && cartCount > 0;
          const badgeText = cartCount > 9 ? "9+" : String(cartCount);
          return (
            <View style={{ width: iconSize + 10, height: iconSize + 10 }}>
              <Ionicons
                name={name}
                color={color}
                size={iconSize}
                style={{ position: "absolute", left: 5, top: 5 }}
              />
              {showBadge ? (
                <View
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 0,
                    minWidth: 16,
                    height: 16,
                    borderRadius: 8,
                    backgroundColor: theme.colors.green,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: 4,
                  }}
                >
                  <Text
                    style={{
                      color: "#041009",
                      fontSize: 10,
                      fontWeight: "900",
                      lineHeight: 12,
                    }}
                  >
                    {badgeText}
                  </Text>
                </View>
              ) : null}
            </View>
          );
        },
      })}
    >
      {isAdmin ? (
        <Tab.Screen name="Dashboard" component={AdminDashboardScreen} />
      ) : null}
      {showStaffDashboard ? (
        <Tab.Screen name="Dashboard" component={CashierDashboardScreen} />
      ) : null}
      {isAdmin ? (
        <Tab.Screen
          name="Admin"
          component={AdminMenuScreen}
          options={{ title: "Admin" }}
        />
      ) : null}
      {showQueue ? (
        <Tab.Screen
          name="Queue"
          component={CashierQueueScreen}
          options={{ title: "Antrian" }}
        />
      ) : null}
      {showHome ? <Tab.Screen name="Home" component={HomeScreen} /> : null}
      {showFlamehub ? (
        <Tab.Screen
          name="Flamehub"
          component={FlamehubTabs}
          options={{ title: "Flamehub", tabBarStyle: { display: "none" } }}
        />
      ) : null}
      {showProducts ? (
        <Tab.Screen
          name="Products"
          component={isAdmin ? AdminProductsScreen : ProductsScreen}
          options={{ title: isAdmin ? "Products" : "Meals" }}
        />
      ) : null}
      {showCart ? <Tab.Screen name="Cart" component={CartScreen} /> : null}
      {showOrders ? (
        <Tab.Screen
          name="Orders"
          component={isAdmin ? AdminOrdersScreen : OrdersScreen}
        />
      ) : null}
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const token = useAuthStore((s) => s.token);
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);
  const hydrate = useAuthStore((s) => s.hydrate);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    let cancelled = false;
    async function loadMe() {
      if (!token) {
        setUser(null);
        return;
      }
      try {
        const r = await api.get("/me");
        if (!cancelled) setUser(r.data?.user ?? null);
      } catch {
        if (!cancelled) setUser(null);
      }
    }
    if (hydrated) loadMe();
    return () => {
      cancelled = true;
    };
  }, [hydrated, token, setUser]);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!token) {
        if (!cancelled) setNeedsOnboarding(false);
        return;
      }
      const roles = user?.roles ?? EMPTY_ROLES;
      const isMember = roles.includes("member");
      const userId = user?.id ?? 0;
      if (!isMember || !userId) {
        if (!cancelled) setNeedsOnboarding(false);
        return;
      }
      try {
        const key = `flamestreet_onboarding_seen_${userId}`;
        const v = await SecureStore.getItemAsync(key);
        if (!cancelled) setNeedsOnboarding(!v);
      } catch {
        if (!cancelled) setNeedsOnboarding(false);
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [token, user?.id, user?.roles]);

  if (!hydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg, padding: 24 }}>
        <Text style={{ color: theme.colors.text }}>Loading…</Text>
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={{
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          background: theme.colors.bg,
          card: theme.colors.bg,
          border: theme.colors.border,
          text: theme.colors.text,
          primary: theme.colors.green,
        },
      }}
    >
      <RootStack.Navigator
        id="RootStack"
        screenOptions={{
          ...stackScreenAnimation,
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.bg },
        }}
      >
        {!token ? (
          <RootStack.Screen
            name="Auth"
            component={AuthNavigator}
            options={{
              headerShown: false,
              animation: "fade", // fade saat login/logout
              animationDuration: 200,
            }}
          />
        ) : (
          <>
            {needsOnboarding ? (
              <RootStack.Screen
                name="Onboarding"
                component={OnboardingScreen}
                options={{
                  headerShown: false,
                  gestureEnabled: false,
                  animation: "fade",
                  animationDuration: 200,
                }}
              />
            ) : null}
            <RootStack.Screen
              name="App"
              component={AppTabs}
              options={{
                headerShown: false,
                animation: "fade", // fade smooth saat masuk app
                animationDuration: 200,
              }}
            />
          </>
        )}
        <RootStack.Screen
          name="ProductDetail"
          component={ProductDetailScreen}
          options={{
            title: "Product",
            ...stackScreenAnimation, // slide dari kanan
          }}
        />
        <RootStack.Screen
          name="FeedDetail"
          component={ArticleDetailScreen}
          options={{
            title: "Feed",
            ...stackScreenAnimation,
          }}
        />
        <RootStack.Screen
          name="FlamehubCreate"
          component={FlamehubCreatePostScreen}
          options={{
            title: "New Post",
            ...stackScreenAnimation,
          }}
        />
        <RootStack.Screen
          name="FlamehubPost"
          component={FlamehubPostScreen}
          options={{
            title: "Post",
            ...stackScreenAnimation,
          }}
        />
        <RootStack.Screen
          name="FlamehubEditPost"
          component={FlamehubEditPostScreen}
          options={{
            title: "Edit Post",
            ...stackScreenAnimation,
          }}
        />
        <RootStack.Screen
          name="FlamehubProfile"
          component={FlamehubProfileScreen}
          options={{
            title: "Profile",
            ...stackScreenAnimation,
          }}
        />
        <RootStack.Screen
          name="FlamehubSearch"
          component={FlamehubSearchScreen}
          options={{
            title: "Search",
            ...stackScreenAnimation,
          }}
        />
        <RootStack.Screen
          name="FlamehubFollowers"
          component={FlamehubFollowersScreen}
          options={{
            title: "Followers",
            ...stackScreenAnimation,
          }}
        />
        <RootStack.Screen
          name="Checkout"
          component={CheckoutScreen}
          options={{
            title: "Checkout",
            animation: "slide_from_bottom", // checkout naik dari bawah
            animationDuration: 220,
            gestureEnabled: true,
            gestureDirection: "vertical",
          }}
        />
        <RootStack.Screen
          name="OrderDetail"
          component={OrderDetailScreen}
          options={{
            title: "Order",
            ...stackScreenAnimation, // slide dari kanan
          }}
        />
        <RootStack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            title: "Profile",
            ...stackScreenAnimation,
            headerRight: undefined,
          }}
        />
        <RootStack.Screen
          name="Notifications"
          component={NotificationsScreen}
          options={{
            title: "Notifications",
            ...stackScreenAnimation,
            headerRight: undefined,
          }}
        />
        <RootStack.Screen
          name="PointsHistory"
          component={PointsHistoryScreen}
          options={{
            title: "Points",
            ...stackScreenAnimation,
          }}
        />
        <RootStack.Screen
          name="TrainerMembers"
          component={TrainerMembersScreen}
          options={{
            title: "My Members",
            ...stackScreenAnimation,
          }}
        />
        <RootStack.Screen
          name="TrainerWithdraw"
          component={TrainerWithdrawScreen}
          options={{
            title: "Withdraw",
            ...stackScreenAnimation,
          }}
        />
        <RootStack.Screen
          name="CashierOrderDetail"
          component={CashierOrderDetailScreen}
          options={{
            title: "Order",
            ...stackScreenAnimation,
          }}
        />
        <RootStack.Screen
          name="AdminOrders"
          component={AdminOrdersScreen}
          options={{
            title: "Orders",
            ...stackScreenAnimation,
          }}
        />
        <RootStack.Screen
          name="AdminOrderDetail"
          component={AdminOrderDetailScreen}
          options={{
            title: "Order",
            ...stackScreenAnimation,
          }}
        />
        <RootStack.Screen
          name="AdminRedeems"
          component={AdminRedeemsScreen}
          options={{
            title: "Redeems",
            ...stackScreenAnimation,
          }}
        />
        <RootStack.Screen
          name="AdminUsers"
          component={AdminUsersScreen}
          options={{
            title: "Users",
            ...stackScreenAnimation,
          }}
        />
        <RootStack.Screen
          name="AdminTrainers"
          component={AdminTrainersScreen}
          options={{
            title: "Trainers",
            ...stackScreenAnimation,
          }}
        />
        <RootStack.Screen
          name="AdminProducts"
          component={AdminProductsScreen}
          options={{
            title: "Products",
            ...stackScreenAnimation,
          }}
        />
        <RootStack.Screen
          name="AdminProductCategories"
          component={AdminProductCategoriesScreen}
          options={{
            title: "Categories",
            ...stackScreenAnimation,
          }}
        />
        <RootStack.Screen
          name="AdminGyms"
          component={AdminGymsScreen}
          options={{
            title: "Gyms",
            ...stackScreenAnimation,
          }}
        />
        <RootStack.Screen
          name="AdminPromoBanners"
          component={AdminPromoBannersScreen}
          options={{
            title: "Promo Banners",
            ...stackScreenAnimation,
          }}
        />
        <RootStack.Screen
          name="AdminArticles"
          component={AdminArticlesScreen}
          options={{
            title: "Articles",
            ...stackScreenAnimation,
          }}
        />
        <RootStack.Screen
          name="AdminPaymentMethods"
          component={AdminPaymentMethodsScreen}
          options={{
            title: "Payment Methods",
            ...stackScreenAnimation,
          }}
        />
        <RootStack.Screen
          name="AdminPointSettings"
          component={AdminPointSettingsScreen}
          options={{
            title: "Point Settings",
            ...stackScreenAnimation,
          }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
