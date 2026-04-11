import { PropsWithChildren } from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  const hasHeader = Boolean(token) && headerShown;
  const headerHeight = insets.top + 34 + 20;
  const topPadding = hasHeader
    ? allowUnderHeader
      ? 0
      : headerHeight
    : insets.top;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      {hasHeader ? <FloatingHeader /> : null}
      <View
        style={[{ flex: 1, paddingTop: topPadding }, style]}
      >
        {children}
      </View>
    </View>
  );
}
