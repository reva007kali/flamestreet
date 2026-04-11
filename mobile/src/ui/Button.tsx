import { PropsWithChildren } from "react";
import { Pressable, StyleProp, Text, ViewStyle } from "react-native";
import { theme } from "./theme";

export default function Button({
  children,
  onPress,
  disabled,
  variant = "primary",
  style,
}: PropsWithChildren<{
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
  style?: StyleProp<ViewStyle>;
}>) {
  const isPrimary = variant === "primary";
  const isDanger = variant === "danger";
  const bg = isPrimary
    ? theme.colors.green
    : isDanger
      ? theme.colors.danger
      : "transparent";
  const borderColor = isPrimary
    ? theme.colors.greenDark
    : isDanger
      ? theme.colors.danger
      : theme.colors.border;
  const textColor = isPrimary || isDanger ? "#04110a" : theme.colors.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          borderColor,
          borderWidth: 1,
          borderRadius: theme.radius.md,
          paddingVertical: 12,
          paddingHorizontal: 14,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          alignItems: "center",
        },
        style,
      ]}
    >
      <Text style={{ color: textColor, fontWeight: "700" }}>{children}</Text>
    </Pressable>
  );
}
