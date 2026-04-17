import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useCallback } from "react";
import { Text, View } from "react-native";
import { theme } from "../ui/theme";
import FlamehubFeedScreen from "../screens/flamehub/FlamehubFeedScreen";
import FlamehubSearchScreen from "../screens/flamehub/FlamehubSearchScreen";
import FlamehubCreatePostScreen from "../screens/flamehub/FlamehubCreatePostScreen";
import FlamehubProfileScreen from "../screens/flamehub/FlamehubProfileScreen";
import { useAuthStore } from "../store/authStore";

type FlamehubTabParamList = {
  Back: undefined;
  Hub: undefined;
  Search: undefined;
  Add: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<FlamehubTabParamList>();

function MeProfile() {
  const username = useAuthStore((s) => s.user?.username ?? null);
  if (!username) return <View style={{ flex: 1, backgroundColor: theme.colors.bg }} />;
  return <FlamehubProfileScreen usernameOverride={username} />;
}

function BackTab() {
  const navigation = useNavigation<any>();

  useFocusEffect(
    useCallback(() => {
      const appTabs: any = navigation.getParent?.("AppTabs");
      const routeNames: string[] = appTabs?.getState?.()?.routeNames ?? [];
      if (appTabs?.navigate && routeNames.includes("Home")) {
        appTabs.navigate("Home");
      }
    }, [navigation]),
  );

  return null;
}

export default function FlamehubTabs() {
  const navigation = useNavigation<any>();
  return (
    <Tab.Navigator
      id="FlamehubTabs"
      initialRouteName="Hub"
      backBehavior="initialRoute"
      screenOptions={({ route }) => ({
        headerShown: false,
        sceneStyle: { backgroundColor: theme.colors.bg },
        tabBarStyle: {
          backgroundColor: theme.colors.bg,
          borderTopColor: theme.colors.border,
        },
        tabBarActiveTintColor: theme.colors.green,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarIcon: ({ color, size }) => {
          const s = size ?? 22;
          if (route.name === "Hub") {
            return (
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: color,
                }}
              >
                <Text style={{ color, fontSize: 12, fontWeight: "900" }}>F</Text>
              </View>
            );
          }
          const map: Record<string, keyof typeof Ionicons.glyphMap> = {
            Back: "arrow-back-circle",
            Search: "search",
            Add: "add-circle",
            Profile: "person",
          };
          const name = map[route.name] ?? "ellipse";
          return <Ionicons name={name} color={color} size={s} />;
        },
      })}
    >
      <Tab.Screen
        name="Back"
        component={BackTab}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            const appTabs: any = navigation.getParent?.("AppTabs");
            const routeNames: string[] = appTabs?.getState?.()?.routeNames ?? [];
            if (appTabs?.navigate && routeNames.includes("Home")) {
              appTabs.navigate("Home");
            }
          },
        }}
      />
      <Tab.Screen
        name="Hub"
        component={FlamehubFeedScreen}
        options={{ title: "Hub" }}
      />
      <Tab.Screen name="Search" component={FlamehubSearchScreen} />
      <Tab.Screen
        name="Add"
        component={FlamehubCreatePostScreen}
        options={{ title: "Post" }}
      />
      <Tab.Screen name="Profile" component={MeProfile} />
    </Tab.Navigator>
  );
}
