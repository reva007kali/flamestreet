import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toPublicUrl } from "../lib/assets";
import { useAuthStore } from "../store/authStore";
import { theme } from "../ui/theme";

export function FloatingHeader() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const user = useAuthStore((s) => s.user);
  const avatarUrl = toPublicUrl(user?.avatar);

  const height = insets.top + 34 + 20;
  const canGoBack = nav.canGoBack?.() ?? false;

  const go = (routeName: "Notifications" | "Profile") => {
    const parent = nav.getParent?.();
    if (parent?.navigate) parent.navigate(routeName);
    else nav.navigate(routeName);
  };

  return (
    <View style={[styles.wrap, { height }]}>
      <LinearGradient
        colors={["rgba(0,0,0,1)", "rgba(0,0,0,0)"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.gradient}
      >
        <BlurView intensity={0} tint="dark" style={StyleSheet.absoluteFill} />
        <View
          style={[
            styles.row,
            { paddingTop: insets.top + 10, paddingBottom: 10 },
          ]}
        >
          <View style={{ flex: 1 }}>
            {canGoBack ? (
              <Pressable onPress={() => nav.goBack?.()}>
                <Ionicons
                  name="chevron-back"
                  size={24}
                  color={theme.colors.text}
                />
              </Pressable>
            ) : null}
          </View>
          <Pressable onPress={() => go("Notifications")}>
            <Ionicons
              name="notifications"
              size={22}
              color={theme.colors.text}
            />
          </Pressable>
          <Pressable onPress={() => go("Profile")}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Ionicons name="person" size={18} color={theme.colors.text} />
              </View>
            )}
          </Pressable>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
  },
  gradient: {
    flex: 1,
  },
  row: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  avatarFallback: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
});
