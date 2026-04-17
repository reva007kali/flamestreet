import { PropsWithChildren } from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { FloatingHeader } from "../components/FloatingHeader";
import { useAuthStore } from "../store/authStore";
import { theme } from "./theme";

export default function Screen({
  children,
  style,
  headerShown = true,
  allowUnderHeader = false,
}: PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  headerShown?: boolean;
  allowUnderHeader?: boolean;
}>) {
  const token = useAuthStore((s) => s.token);
  const insets = useSafeAreaInsets();
  let tabBarHeight = 0;
  try {
    tabBarHeight = useBottomTabBarHeight();
  } catch {}
  const hasHeader = Boolean(token) && headerShown;
  const headerHeight = insets.top + 34 + 20;
  const topPadding = hasHeader
    ? allowUnderHeader
      ? 0
      : headerHeight
    : insets.top;
  const bottomPadding = tabBarHeight > 0 ? 0 : insets.bottom;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      {hasHeader ? <FloatingHeader /> : null}
      <View
        style={[
          { flex: 1, paddingTop: topPadding, paddingBottom: bottomPadding },
          style,
        ]}
      >
        {children}
      </View>
    </View>
  );
}
